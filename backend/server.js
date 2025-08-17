require('dotenv').config();
const express = require("express");
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require("path");
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { invokeLLM } = require('./llm');
const { sendDiscordNotification, postWebhook, createDiscordTicketChannel, sendNtfy } = require('./notifications');
const auth = require('./auth');
const middleware = require('./middleware');
const { getInstance, getPromisedInstance } = require("./database");
const db = getInstance();
const promisedDb = getPromisedInstance();
const initializeSocket = require('./socket');
const bcrypt = require('bcryptjs');
const { encryptText, decryptText } = require('./crypto');
const cron = require('node-cron');
const { checkWebsite } = require('./healthChecker');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
const multer = require('multer');
const fs = require('fs');
const CAPTCHA_PROVIDER = process.env.CAPTCHA_PROVIDER || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const ENABLE_OPENAI_MODERATION = String(process.env.ENABLE_OPENAI_MODERATION || '0') === '1';
const { initPostHog, getPostHogClient } = require('./posthog');

// Setup file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const app = express();

// Trust proxy for Nginx - fixes express-rate-limit X-Forwarded-For errors
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET','POST']
  }
});

// Make io available globally for use in routes
global.io = io;

const port = process.env.PORT || 3001;

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://fixmy.site').split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
// Handle CORS preflight for all routes
app.options('*', cors({ origin: allowedOrigins, credentials: true }));
// Configure a robust and specific Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://m.stripe.network",
        "https://q.stripe.com",
        "https://r.stripe.com",
        "https://us-assets.i.posthog.com",
        "https://us.i.posthog.com",
        "https://app.posthog.com",
        // Allow unsafe-inline for Stripe's dynamic content
        "'unsafe-inline'",
        // Specific hashes for Stripe's inline scripts for enhanced security
        "'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA='",
        "'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls='",
        "'sha256-+6WnXIl4mbFTCARd8NvCOUEGZQYFJ3tqC9D9VY9ya8c='",
        "'sha256-A6kQssc8M3+QvwKZvrTU+8LUwQot/b+HVfrmxwqLJKk='",
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://m.stripe.network",
        "https://js.stripe.com",
        // Allow unsafe-inline for Stripe's dynamic styles
        "'unsafe-inline'",
        // Specific hash for an inline style element
        "'sha256-0hAheEzaMe6uXIKV4EehS9pu1am1lj/KnnzrOYqckXk='",
        "https://m.stripe.network/out-4.5.44.js"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://js.stripe.com",
        "https://m.stripe.network"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://q.stripe.com", // for CSP violation reporting
        "https://r.stripe.com", // for telemetry
        "https://m.stripe.network",
        "https://us-assets.i.posthog.com",
        "https://us.i.posthog.com",
        "https://app.posthog.com",
        // Allow WebSocket connections for development
        `ws://localhost:${process.env.PORT || 3001}`,
        `wss://localhost:${process.env.PORT || 3001}`,
        `ws://localhost:5173`,
        `wss://localhost:5173`,
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com",
        "https://m.stripe.network",
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));
// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = (req.headers['x-request-id'] || require('crypto').randomUUID());
  res.setHeader('X-Request-Id', req.id);
  next();
});
// Use JSON body parser except for Stripe webhook which needs the raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
// Basic request logger
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`[${req.id}] ${req.method} ${req.originalUrl} from ${req.ip}`);
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`[${req.id}] ${res.statusCode} ${req.method} ${req.originalUrl} (${ms}ms)`);
  });
  next();
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);
app.use(express.static(path.join(__dirname, "../dist")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database setup
db.serialize(() => {
  // Create tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    website_url TEXT,
    phone_country TEXT,
    phone_number TEXT,
    email_verified BOOLEAN DEFAULT 0,
    verification_code TEXT,
    verification_expires DATETIME,
    subscription_tier TEXT DEFAULT 'none',
    stripe_customer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS ChatSession (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER,
    messages TEXT,
    issue_resolved BOOLEAN,
    escalated_to_human BOOLEAN,
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS ServiceRequest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    website_url TEXT,
    platform_type TEXT,
    service_type TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    urgency_level TEXT,
    budget_range TEXT,
    estimated_quote REAL,
    status TEXT DEFAULT 'new',
    discord_notified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    additional_features TEXT,
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS Ticket (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_request_id INTEGER,
    discord_channel_id TEXT,
    status TEXT DEFAULT 'open',
    deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User (id),
    FOREIGN KEY (service_request_id) REFERENCES ServiceRequest (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS Credential (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INTEGER,
    user_id INTEGER,
    label TEXT,
    username TEXT,
    password_enc BLOB,
    iv BLOB NOT NULL,
    last_accessed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_request_id) REFERENCES ServiceRequest (id),
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS SiteHealthCheck (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status_code INTEGER,
    response_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS TicketMessage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    author_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Ticket (id),
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS RefreshToken (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS AnalyticsEvent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    path TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip TEXT,
    extra TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS AIUsage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip TEXT,
    date TEXT NOT NULL,
    count INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS Reminder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    due_date TEXT NOT NULL,
    due_time TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS Quote (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_request_id INTEGER,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    expires_at DATETIME,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User (id),
    FOREIGN KEY (service_request_id) REFERENCES ServiceRequest (id),
    FOREIGN KEY (created_by) REFERENCES User (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS QuoteLineItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES Quote (id)
  )`);
});

// Post-init migration to ensure new User columns exist when upgrading from legacy schema
function ensureUserColumns() {
  db.all(`PRAGMA table_info('User')`, (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const cols = rows.map(r => r.name);
    const toAdd = [];
    if (!cols.includes('phone_country')) toAdd.push("ALTER TABLE User ADD COLUMN phone_country TEXT");
    if (!cols.includes('phone_number')) toAdd.push("ALTER TABLE User ADD COLUMN phone_number TEXT");
    if (!cols.includes('email_verified')) toAdd.push("ALTER TABLE User ADD COLUMN email_verified BOOLEAN DEFAULT 0");
    if (!cols.includes('verification_code')) toAdd.push("ALTER TABLE User ADD COLUMN verification_code TEXT");
    if (!cols.includes('verification_expires')) toAdd.push("ALTER TABLE User ADD COLUMN verification_expires DATETIME");
    if (!cols.includes('stripe_customer_id')) toAdd.push("ALTER TABLE User ADD COLUMN stripe_customer_id TEXT");
    (toAdd || []).forEach(sql => db.run(sql, () => {}));
  });
}
ensureUserColumns();

// Post-init migration to ensure new columns exist when upgrading from legacy schema
function ensureCredentialColumns() {
  db.all(`PRAGMA table_info('Credential')`, (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const cols = rows.map(r => r.name);
    const toAdd = [];
    if (!cols.includes('label')) toAdd.push("ALTER TABLE Credential ADD COLUMN label TEXT");
    if (!cols.includes('username')) toAdd.push("ALTER TABLE Credential ADD COLUMN username TEXT");
    if (!cols.includes('password_enc')) toAdd.push("ALTER TABLE Credential ADD COLUMN password_enc BLOB");
    if (!cols.includes('iv')) toAdd.push("ALTER TABLE Credential ADD COLUMN iv BLOB");
    if (!cols.includes('last_accessed_at')) toAdd.push("ALTER TABLE Credential ADD COLUMN last_accessed_at DATETIME");
    if (!cols.includes('user_id')) toAdd.push("ALTER TABLE Credential ADD COLUMN user_id INTEGER REFERENCES User(id)");
    (toAdd || []).forEach(sql => {
      db.run(sql, () => {});
    });
  });
}
ensureCredentialColumns();

// If older schema enforced NOT NULL on username/password_enc, migrate to relaxed schema to allow label+text-only credentials
function migrateCredentialSchemaIfNeeded() {
  db.all(`PRAGMA table_info('Credential')`, (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const colByName = Object.fromEntries(rows.map(r => [r.name, r]));
    const usernameNotNull = colByName.username && Number(colByName.username.notnull) === 1;
    const passwordEncNotNull = colByName.password_enc && Number(colByName.password_enc.notnull) === 1;
    const hasLabel = !!colByName.label;
    // Only migrate if legacy NOT NULL exists on username or password_enc
    if (!usernameNotNull && !passwordEncNotNull) return;

    db.serialize(() => {
      db.exec('BEGIN', (beginErr) => {
        if (beginErr) return;

        const createSql = `
          CREATE TABLE IF NOT EXISTS Credential_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_request_id INTEGER,
            user_id INTEGER,
            label TEXT,
            username TEXT,
            password_enc BLOB,
            iv BLOB NOT NULL,
            last_accessed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_request_id) REFERENCES ServiceRequest (id),
            FOREIGN KEY (user_id) REFERENCES User (id)
          )`;
        db.run(createSql, (createErr) => {
          if (createErr) { db.exec('ROLLBACK'); return; }
          const selectLabel = hasLabel ? 'label' : 'NULL AS label';
          const copySql = `INSERT INTO Credential_new (id, service_request_id, user_id, label, username, password_enc, iv, last_accessed_at, created_at)
                           SELECT id, service_request_id, user_id, ${selectLabel}, username, password_enc, iv, last_accessed_at, created_at FROM Credential`;
          db.run(copySql, (copyErr) => {
            if (copyErr) { db.exec('ROLLBACK'); return; }
            db.run('DROP TABLE Credential', (dropErr) => {
              if (dropErr) { db.exec('ROLLBACK'); return; }
              db.run('ALTER TABLE Credential_new RENAME TO Credential', (renameErr) => {
                if (renameErr) { db.exec('ROLLBACK'); return; }
                db.exec('COMMIT');
                logger.info('Migrated Credential table to relaxed schema (nullable username/password_enc).');
              });
            });
          });
        });
      });
    });
  });
}
migrateCredentialSchemaIfNeeded();

function ensureTicketColumns() {
  db.all(`PRAGMA table_info('Ticket')`, (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const cols = rows.map(r => r.name);
    if (!cols.includes('service_request_id')) {
      db.run("ALTER TABLE Ticket ADD COLUMN service_request_id INTEGER REFERENCES ServiceRequest(id)");
    }
    if (!cols.includes('client_last_read_message_id')) {
      db.run("ALTER TABLE Ticket ADD COLUMN client_last_read_message_id INTEGER");
    }
    if (!cols.includes('notified_unread_message_id')) {
      db.run("ALTER TABLE Ticket ADD COLUMN notified_unread_message_id INTEGER");
    }
    if (!cols.includes('deleted')) {
      db.run("ALTER TABLE Ticket ADD COLUMN deleted BOOLEAN DEFAULT 0");
    }
    if (!cols.includes('deleted_at')) {
      db.run("ALTER TABLE Ticket ADD COLUMN deleted_at DATETIME");
    }
  });
}

function ensureServiceRequestColumns() {
  db.all(`PRAGMA table_info('ServiceRequest')`, (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const cols = rows.map(r => r.name);
    if (!cols.includes('additional_features')) {
      db.run("ALTER TABLE ServiceRequest ADD COLUMN additional_features TEXT");
    }
    if (!cols.includes('created_at')) {
      db.run("ALTER TABLE ServiceRequest ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    }
    if (!cols.includes('status')) {
      db.run("ALTER TABLE ServiceRequest ADD COLUMN status TEXT DEFAULT 'new'");
    }
    if (!cols.includes('discord_notified')) {
      db.run("ALTER TABLE ServiceRequest ADD COLUMN discord_notified BOOLEAN DEFAULT 0");
    }
  });
}

// Clean up corrupted additional_features data
function cleanupServiceRequestData() {
  db.all(`SELECT id, additional_features FROM ServiceRequest WHERE additional_features IS NOT NULL`, (err, rows) => {
    if (err) {
      logger.error('Error checking ServiceRequest data:', err.message);
      return;
    }
    
    if (!Array.isArray(rows)) return;
    
    let cleanupCount = 0;
    rows.forEach(row => {
      try {
        if (row.additional_features === null || row.additional_features === undefined) {
          return; // Already null, skip
        }
        
        const raw = String(row.additional_features).trim();
        if (raw.length === 0 || raw === 'null' || raw === 'undefined') {
          // Fix empty/null values
          db.run(`UPDATE ServiceRequest SET additional_features = '[]' WHERE id = ?`, [row.id], (updateErr) => {
            if (updateErr) {
              logger.error(`Failed to cleanup additional_features for SR ${row.id}:`, updateErr.message);
            } else {
              cleanupCount++;
            }
          });
        } else {
          // Try to parse and validate JSON
          JSON.parse(raw);
        }
      } catch (e) {
        // Invalid JSON, fix it
        logger.warn(`Fixing invalid additional_features for SR ${row.id}: ${String(row.additional_features).slice(0, 50)}`);
        db.run(`UPDATE ServiceRequest SET additional_features = '[]' WHERE id = ?`, [row.id], (updateErr) => {
          if (updateErr) {
            logger.error(`Failed to cleanup additional_features for SR ${row.id}:`, updateErr.message);
          } else {
            cleanupCount++;
          }
        });
      }
    });
    
    if (cleanupCount > 0) {
      logger.info(`Cleaned up ${cleanupCount} ServiceRequest additional_features records`);
    }
  });
}

// Ensure all service requests have associated tickets (only for non-new status)
function ensureServiceRequestTickets() {
  db.all(`
    SELECT sr.id, sr.user_id 
    FROM ServiceRequest sr 
    LEFT JOIN Ticket t ON sr.id = t.service_request_id 
    WHERE t.id IS NULL AND sr.status != 'new'
  `, (err, rows) => {
    if (err || !rows || rows.length === 0) return;
    
    logger.info(`Creating missing tickets for ${rows.length} service requests`);
    rows.forEach(row => {
      db.run('INSERT INTO Ticket (user_id, service_request_id, status) VALUES (?, ?, ?)', 
        [row.user_id, row.id, 'open'], (err) => {
          if (err) {
            logger.error(`Failed to create ticket for service request ${row.id}:`, err.message);
          } else {
            logger.info(`Created ticket for service request ${row.id}`);
          }
        });
    });
  });
}

ensureTicketColumns();
ensureServiceRequestColumns();
cleanupServiceRequestData();
ensureServiceRequestTickets();

// ---------- Analytics & AI quota helpers ----------
const AI_DAILY_LIMIT_AUTH = parseInt(process.env.AI_DAILY_LIMIT_AUTH || '200', 10);
const AI_DAILY_LIMIT_ANON = parseInt(process.env.AI_DAILY_LIMIT_ANON || '50', 10);
const INVOICE_DUE_DAYS = parseInt(process.env.INVOICE_DUE_DAYS || '14', 10);

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.ip;
}

function getOptionalUserId(req) {
  try {
    if (req.userId) return Number(req.userId);
    const token = req.headers['x-access-token'];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded.id ? Number(decoded.id) : null;
  } catch {
    return null;
  }
}

function checkAiDailyLimit(req, res, next) {
  const userId = getOptionalUserId(req);
  const ip = getClientIp(req);
  const today = new Date().toISOString().slice(0, 10);
  const isAuthed = Number.isInteger(userId);
  const limit = isAuthed ? AI_DAILY_LIMIT_AUTH : AI_DAILY_LIMIT_ANON;

  const selectSql = isAuthed
    ? 'SELECT id, count FROM AIUsage WHERE date = ? AND user_id = ?'
    : 'SELECT id, count FROM AIUsage WHERE date = ? AND ip = ? AND user_id IS NULL';
  const selectParams = isAuthed ? [today, userId] : [today, ip];

  db.get(selectSql, selectParams, (err, row) => {
    if (err) return res.status(500).json({ error: 'AI quota check failed' });
    const current = row ? Number(row.count || 0) : 0;
    if (current >= limit) {
      return res.status(429).json({ error: 'Daily AI usage limit reached. Please try again tomorrow.' });
    }
    if (row && row.id) {
      db.run('UPDATE AIUsage SET count = count + 1 WHERE id = ?', [row.id], (uErr) => {
        if (uErr) return res.status(500).json({ error: 'AI quota update failed' });
        next();
      });
    } else {
      const insertSql = 'INSERT INTO AIUsage (user_id, ip, date, count) VALUES (?, ?, ?, 1)';
      const insertParams = [isAuthed ? userId : null, isAuthed ? null : ip, today];
      db.run(insertSql, insertParams, (iErr) => {
        if (iErr) return res.status(500).json({ error: 'AI quota init failed' });
        next();
      });
    }
  });
}

// Scheduled tasks
cron.schedule('0 * * * *', () => {
  db.all("SELECT id, website_url FROM User WHERE subscription_tier != 'none' AND website_url IS NOT NULL", (err, users) => {
    if (err) {
      logger.error('Error fetching users for health checks:', err.message);
      return;
    }
    users.forEach(user => {
      checkWebsite(user.id, user.website_url);
    });
  });
});

// Simple validators
const { body, param, query } = require('express-validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const validate = (validations) => [
  ...validations,
  (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "UP" });
});

// Current user info
app.get('/api/me', middleware.verifyToken, (req, res) => {
  db.get('SELECT id, email, name, subscription_tier FROM User WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    const raw = String(process.env.ADMIN_USER_IDS || '').trim();
    const adminIds = raw.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => Number.isInteger(n));
    const is_admin = adminIds.includes(Number(req.userId));
    
    res.json({ ...user, is_admin });
  });
});

// Lightweight analytics ingestion
app.post('/api/analytics', validate([
  body('event_name').isString().trim().isLength({ min: 1, max: 64 }),
  body('session_id').optional().isString().isLength({ min: 5, max: 128 }),
  body('path').optional().isString().isLength({ min: 1, max: 2048 }),
  body('referrer').optional().isString().isLength({ min: 1, max: 2048 }),
  body('extra').optional(),
]), (req, res) => {
  try {
    const { event_name, session_id, path: urlPath, referrer, extra } = req.body || {};
    if (!event_name) return res.status(400).json({ error: 'event_name required' });
    const userId = getOptionalUserId(req);
    const userAgent = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const extraJson = extra ? JSON.stringify(extra).slice(0, 4000) : null;
    db.run(
      `INSERT INTO AnalyticsEvent (event_name, user_id, session_id, path, referrer, user_agent, ip, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(event_name), userId, session_id || null, urlPath || null, referrer || null, userAgent, ip, extraJson],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to record event' });
        return res.status(204).send();
      }
    );
  } catch (e) {
    return res.status(500).json({ error: 'Analytics error' });
  }
});

// Analytics summary (admin)
app.get('/api/admin/analytics/summary', middleware.verifyToken, middleware.isAdmin, validate([
  query('days').optional().isInt({ min: 1, max: 90 })
]), (req, res) => {
  const days = Math.max(1, Math.min(90, parseInt(req.query.days || '7', 10)));
  const sinceExpr = `DATETIME('now', '-' || ${days} || ' days')`;
  const summary = {};

  db.get(`SELECT COUNT(*) as total FROM AnalyticsEvent WHERE created_at >= ${sinceExpr}`, [], (err, row) => {
    summary.total_events = row ? row.total : 0;
    db.get(`SELECT COUNT(*) as pageviews FROM AnalyticsEvent WHERE event_name = 'page_view' AND created_at >= ${sinceExpr}`, [], (err2, row2) => {
      summary.pageviews = row2 ? row2.pageviews : 0;
      db.all(`SELECT path, COUNT(*) as count FROM AnalyticsEvent WHERE event_name = 'page_view' AND created_at >= ${sinceExpr} GROUP BY path ORDER BY count DESC LIMIT 20`, [], (err3, rows) => {
        summary.top_paths = rows || [];
        res.json(summary);
      });
    });
  });
});

// Stripe checkout session creation
app.post('/api/checkout', middleware.verifyToken, validate([
  body('price_id').isString().isLength({ min: 3, max: 128 })
]), async (req, res) => {
  try {
    const { price_id } = req.body;
    if (!stripe || !price_id) return res.status(400).json({ error: 'Stripe not configured or missing price_id' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${req.headers.origin || 'https://fixmy.site'}/dashboard?checkout=success`,
      cancel_url: `${req.headers.origin || 'https://fixmy.site'}/pricing?checkout=cancel`,
      client_reference_id: String(req.userId),
    });
    res.json({ url: session.url });
  } catch (e) {
    logger.error('Stripe checkout error:', e.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/create-portal-session', middleware.verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT stripe_customer_id FROM User WHERE id = ?', [req.userId]);
    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ error: 'Stripe customer not found for this user.' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${req.protocol}://${req.get('host')}/dashboard/subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (e) {
    logger.error('Stripe portal session error:', e.message);
    res.status(500).json({ error: 'Failed to create portal session.' });
  }
});

app.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (!endpointSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = Number(session.client_reference_id);
      // Map price -> tier label
      const line = (session.display_items || session.line_items || [])[0];
      const priceId = session?.line_items?.data?.[0]?.price?.id || session?.metadata?.price_id || null;
      const tier = priceId || 'paid';
      if (userId) {
        db.run('UPDATE User SET subscription_tier = ?, stripe_customer_id = ? WHERE id = ?', [tier, session.customer, userId]);
      }
    }
  } catch (e) {
    logger.error('Stripe webhook handling error:', e.message);
  }
  res.json({ received: true });
});

app.post('/api/register', validate([
  body('name').isString().isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match'),
  body('website_url').optional({ checkFalsy: true }).isURL().isLength({ max: 2048 }),
  body('phone_number').optional({ checkFalsy: true }).isString().trim(),
  body('phone_country').if(body('phone_number').notEmpty()).isString().isLength({ min: 2, max: 2 }).toUpperCase().withMessage('Country code is required with a phone number'),
  body('phone_number').if(body('phone_number').notEmpty()).custom((val, { req }) => {
    const country = (req.body.phone_country || '').toUpperCase();
    const parsed = parsePhoneNumberFromString(String(val), country);
    if (!parsed || !parsed.isValid()) {
      throw new Error('Invalid phone number for the selected country');
    }
    return true;
  })
]), auth.register);
app.post('/api/login', validate([
  body('email').isEmail(),
  body('password').isString().isLength({ min: 8 })
]), auth.login);

// Refresh token and logout endpoints
app.post('/api/token/refresh', auth.refreshToken);
app.post('/api/logout', middleware.verifyToken, auth.logout);

// Email verification endpoints
app.post('/api/request-verification', validate([
  body('email').isEmail()
]), auth.requestVerification);

app.post('/api/verify-email', validate([
  body('email').isEmail(),
  body('code').isString().isLength({ min: 4, max: 12 })
]), auth.verifyEmail);

// User profile management endpoints
app.put('/api/user/profile', middleware.verifyToken, validate([
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('email').isEmail(),
  body('website_url').optional().isURL(),
  body('phone_country').optional().isString().isLength({ min: 2, max: 3 }),
  body('phone_number').optional().isString().isLength({ min: 1, max: 20 })
]), auth.updateProfile);

app.put('/api/user/password', middleware.verifyToken, validate([
  body('currentPassword').isString().isLength({ min: 1 }),
  body('newPassword').isString().isLength({ min: 8 })
]), auth.updatePassword);

// Get details for a single ticket
app.get('/api/tickets/:ticketId', middleware.verifyToken, validate([
  param('ticketId').isInt({ min: 1 })
]), (req, res) => {
  const { ticketId } = req.params;

  const query = `
    SELECT 
      t.id, 
      t.status, 
      t.created_at, 
      t.discord_channel_id,
      sr.id as service_request_id,
      sr.service_type,
      sr.urgency_level
    FROM Ticket t
    JOIN ServiceRequest sr ON t.service_request_id = sr.id
    WHERE t.id = ? AND t.user_id = ? AND t.deleted = 0
  `;

  db.get(query, [ticketId, req.userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching ticket details.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Ticket not found or you do not have permission to view it.' });
    }
    res.json(row);
  });
});

    // Soft delete a ticket (owner-only; admin checks can be added via middleware.isAdmin if needed)
  app.delete('/api/tickets/:ticketId', middleware.verifyToken, validate([
    param('ticketId').isInt({ min: 1 })
  ]), async (req, res) => {
    const { ticketId } = req.params;

    // Check if user is admin (you can implement your own admin check)
    // For now, we'll allow any authenticated user to soft delete their own tickets
    db.get('SELECT discord_channel_id, deleted FROM Ticket WHERE id = ? AND user_id = ?', [ticketId, req.userId], async (err, ticket) => {
      if (err) {
        logger.error('Error fetching ticket for soft deletion:', err.message);
        return res.status(500).json({ error: 'Database error.' });
      }
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found or you do not have permission to delete it.' });
      }
      if (ticket.deleted) {
        return res.status(400).json({ error: 'Ticket is already deleted.' });
      }

      try {
        // Soft delete the ticket
        db.run('UPDATE Ticket SET deleted = 1, deleted_at = ? WHERE id = ?', [new Date().toISOString(), ticketId], (err) => {
          if (err) {
            logger.error('Error soft deleting ticket:', err.message);
            return res.status(500).json({ error: 'Failed to delete ticket.' });
          }
          
          logger.info(`Ticket ${ticketId} soft deleted successfully`);
          
          // Emit socket events to notify frontend
          if (global.io) {
            global.io.to(`ticket:${ticketId}`).emit('ticket_deleted');
            global.io.emit('ticket_deleted', { ticketId: ticketId });
            // Also emit dashboard-specific event used by the requests page
            global.io.emit('ticket_deleted_from_dashboard', { ticketId: ticketId });
            global.io.emit('service_request_deleted');
          }
          
          res.json({ message: 'Ticket deleted successfully.' });
        });
      } catch (error) {
        logger.error('Error soft deleting ticket:', error.message);
        res.status(500).json({ error: 'Failed to delete ticket.' });
      }
    });
  });

  // Admin: hard delete a specific ticket (permanent deletion)
  app.delete('/api/admin/tickets/:ticketId/hard-delete', middleware.verifyToken, middleware.isAdmin, validate([
    param('ticketId').isInt({ min: 1 })
  ]), async (req, res) => {
    const { ticketId } = req.params;

    try {
      // Get the service_request_id before deleting the ticket
      const ticketData = await new Promise((resolve, reject) => {
        db.get('SELECT service_request_id, discord_channel_id FROM Ticket WHERE id = ?', [ticketId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!ticketData) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      // Delete Discord channel if it exists
      if (ticketData.discord_channel_id) {
        try {
          const { getDiscordClient } = require('./notifications');
          const discordClient = getDiscordClient();
          const channel = await discordClient.channels.fetch(ticketData.discord_channel_id);
          if (channel) {
            await channel.delete();
            logger.info(`Deleted Discord channel ${ticketData.discord_channel_id} for ticket ${ticketId}`);
          }
        } catch (e) {
          logger.warn(`Failed to delete Discord channel ${ticketData.discord_channel_id} for ticket ${ticketId}: ${e.message}`);
        }
      }

      // Hard delete from database
      await new Promise((resolve, reject) => db.exec('BEGIN', (err) => err ? reject(err) : resolve()));
      try {
        // Delete ticket messages
        await new Promise((resolve, reject) => db.run('DELETE FROM TicketMessage WHERE ticket_id = ?', [ticketId], (err) => err ? reject(err) : resolve()));
        
        // Delete the ticket
        await new Promise((resolve, reject) => db.run('DELETE FROM Ticket WHERE id = ?', [ticketId], (err) => err ? reject(err) : resolve()));
        
        // Remove related credentials and the service request itself
        if (ticketData.service_request_id) {
          await new Promise((resolve, reject) => db.run('DELETE FROM Credential WHERE service_request_id = ?', [ticketData.service_request_id], (err) => err ? reject(err) : resolve()));
          await new Promise((resolve, reject) => db.run('DELETE FROM ServiceRequest WHERE id = ?', [ticketData.service_request_id], (err) => err ? reject(err) : resolve()));
        }
        
        await new Promise((resolve, reject) => db.exec('COMMIT', (err) => err ? reject(err) : resolve()));
      } catch (e) {
        await new Promise((resolve) => db.exec('ROLLBACK', () => resolve()));
        throw e;
      }

      // Notify frontends
      if (global.io) {
        global.io.to(`ticket:${ticketId}`).emit('ticket_deleted');
        global.io.emit('ticket_deleted', { ticketId: ticketId });
        global.io.emit('ticket_deleted_from_dashboard', { ticketId: ticketId });
        global.io.emit('service_request_deleted');
      }

      logger.info(`Ticket ${ticketId} hard deleted successfully`);
      res.json({ message: 'Ticket permanently deleted successfully.' });
    } catch (e) {
      logger.error('Failed to hard delete ticket:', e.message);
      res.status(500).json({ error: 'Failed to permanently delete ticket.' });
    }
  });

  // Admin: wipe all tickets and their messages
  app.delete('/api/admin/tickets/wipe', middleware.verifyToken, middleware.isAdmin, async (req, res) => {
  try {
    // Collect current tickets for channel cleanup and SR status reset
    const tickets = await new Promise((resolve, reject) => {
      db.all('SELECT id, discord_channel_id, service_request_id FROM Ticket', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    // Attempt to delete Discord channels best-effort
    try {
      const { getDiscordClient } = require('./notifications');
      const discordClient = getDiscordClient();
      for (const t of tickets) {
        if (!t.discord_channel_id) continue;
        try {
          const ch = await discordClient.channels.fetch(t.discord_channel_id);
          if (ch) await ch.delete();
        } catch (e) {
          logger.warn(`Failed to delete Discord channel ${t.discord_channel_id} for ticket ${t.id}: ${e.message}`);
        }
      }
    } catch (e) {
      logger.warn('Discord cleanup skipped or failed:', e.message);
    }

    const serviceRequestIds = [...new Set(tickets.map(t => t.service_request_id).filter(Boolean))];

    // Transactional DB wipe
    await new Promise((resolve, reject) => db.exec('BEGIN', (err) => err ? reject(err) : resolve()));
    try {
      await new Promise((resolve, reject) => db.run('DELETE FROM TicketMessage', (err) => err ? reject(err) : resolve()));
      await new Promise((resolve, reject) => db.run('DELETE FROM Ticket', (err) => err ? reject(err) : resolve()));

      if (serviceRequestIds.length > 0) {
        const placeholders = serviceRequestIds.map(() => '?').join(',');
        await new Promise((resolve, reject) => db.run(`UPDATE ServiceRequest SET status = 'new' WHERE id IN (${placeholders})`, serviceRequestIds, (err) => err ? reject(err) : resolve()));
      }

      await new Promise((resolve, reject) => db.exec('COMMIT', (err) => err ? reject(err) : resolve()));
    } catch (e) {
      await new Promise((resolve) => db.exec('ROLLBACK', () => resolve()));
      throw e;
    }

    // Notify frontends
    if (global.io) {
      global.io.emit('tickets_wiped');
    }

    logger.info('All tickets and messages wiped successfully');
    res.json({ message: 'All tickets and messages wiped successfully.' });
  } catch (e) {
    logger.error('Failed to wipe tickets:', e.message);
    res.status(500).json({ error: 'Failed to wipe tickets.' });
  }
});

// Admin: wipe all service requests (and related tickets, messages, credentials)
app.delete('/api/admin/service-requests/wipe', middleware.verifyToken, middleware.isAdmin, async (req, res) => {
  try {
    // Load all SR ids
    const serviceRequests = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM ServiceRequest', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    const srIds = serviceRequests.map(r => r.id);

    // Nothing to do
    if (srIds.length === 0) {
      if (global.io) global.io.emit('service_requests_wiped');
      return res.json({ message: 'No service requests found. Nothing to delete.' });
    }

    // Gather related tickets for Discord cleanup
    const tickets = await new Promise((resolve, reject) => {
      const placeholders = srIds.map(() => '?').join(',');
      db.all(`SELECT id, discord_channel_id FROM Ticket WHERE service_request_id IN (${placeholders})`, srIds, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    // Best-effort Discord channel deletions
    try {
      const { getDiscordClient } = require('./notifications');
      const discordClient = getDiscordClient();
      for (const t of tickets) {
        if (!t.discord_channel_id) continue;
        try {
          const ch = await discordClient.channels.fetch(t.discord_channel_id);
          if (ch) await ch.delete();
        } catch (e) {
          logger.warn(`Failed to delete Discord channel ${t.discord_channel_id} for ticket ${t.id}: ${e.message}`);
        }
      }
    } catch (e) {
      logger.warn('Discord cleanup skipped or failed:', e.message);
    }

    // Transactional DB deletion: TicketMessage -> Ticket -> Credential -> ServiceRequest
    await new Promise((resolve, reject) => db.exec('BEGIN', (err) => err ? reject(err) : resolve()));
    try {
      if (tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        const ticketPlaceholders = ticketIds.map(() => '?').join(',');
        await new Promise((resolve, reject) => db.run(`DELETE FROM TicketMessage WHERE ticket_id IN (${ticketPlaceholders})`, ticketIds, (err) => err ? reject(err) : resolve()));
        await new Promise((resolve, reject) => db.run(`DELETE FROM Ticket WHERE id IN (${ticketPlaceholders})`, ticketIds, (err) => err ? reject(err) : resolve()));
      }

      const srPlaceholders = srIds.map(() => '?').join(',');
      await new Promise((resolve, reject) => db.run(`DELETE FROM Credential WHERE service_request_id IN (${srPlaceholders})`, srIds, (err) => err ? reject(err) : resolve()));
      await new Promise((resolve, reject) => db.run(`DELETE FROM ServiceRequest WHERE id IN (${srPlaceholders})`, srIds, (err) => err ? reject(err) : resolve()));

      await new Promise((resolve, reject) => db.exec('COMMIT', (err) => err ? reject(err) : resolve()));
    } catch (e) {
      await new Promise((resolve) => db.exec('ROLLBACK', () => resolve()));
      throw e;
    }

    if (global.io) {
      global.io.emit('service_requests_wiped');
    }

    logger.info('All service requests (and related tickets/messages/credentials) wiped successfully');
    res.json({ message: 'All service requests (and related tickets/messages/credentials) wiped successfully.' });
  } catch (e) {
    logger.error('Failed to wipe service requests:', e.message);
    res.status(500).json({ error: 'Failed to wipe service requests.' });
  }
});

// Site Health Summary (for dashboard)
app.get('/api/site-health-summary', middleware.verifyToken, middleware.requireActiveSubscription, (req, res) => {
  const userId = req.userId;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const summaryQuery = `
    SELECT 
      (SELECT status_code FROM SiteHealthCheck WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) as latest_status,
      (SELECT response_time FROM SiteHealthCheck WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) as latest_response_time;
  `;

  const historyQuery = `
    SELECT status_code, response_time, created_at 
    FROM SiteHealthCheck 
    WHERE user_id = ? AND created_at >= ? 
    ORDER BY created_at ASC;
  `;

  db.get(summaryQuery, [userId, userId], (err, summary) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch site health summary.' });

    db.all(historyQuery, [userId, sevenDaysAgo], (err, history) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch site health history.' });
      res.json({ summary, history });
    });
  });
});

app.post('/api/tickets/:ticketId/upload', middleware.verifyToken, validate([
  param('ticketId').isInt({ min: 1 })
]), upload.single('file'), (req, res) => {
  const { ticketId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // You would typically save file metadata to the database here
  // For now, we just notify Discord

  db.get('SELECT discord_channel_id FROM Ticket WHERE id = ? AND user_id = ?', [ticketId, req.userId], (err, ticket) => {
    if (err || !ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    const { getDiscordClient } = require('./notifications');
    const discordClient = getDiscordClient();

    discordClient.channels.fetch(ticket.discord_channel_id)
      .then(channel => {
        channel.send(`User #${req.userId} uploaded a new file for Ticket #${ticketId}: ${file.originalname}\nDownload: ${fileUrl}`);
      })
      .catch(e => logger.error(`Failed to send file notification to Discord channel ${ticket.discord_channel_id}`, e));

    res.json({ message: 'File uploaded successfully.', filePath: `/uploads/${file.filename}` });
  });
});


// Get all service requests for the logged-in user
app.get('/api/service-requests', middleware.verifyToken, async (req, res) => {
  try {
    if (!req.userId || !Number.isInteger(Number(req.userId))) {
      logger.error('Invalid userId in service-requests request:', req.userId);
      return res.status(401).json({ error: 'Invalid user authentication.' });
    }

    const userId = Number(req.userId);

    const serviceRequestsQuery = `
      SELECT 
        id, user_id, client_name, client_email, website_url, platform_type, 
        service_type, problem_description, urgency_level, budget_range, 
        estimated_quote, status, discord_notified, created_at,
        COALESCE(additional_features, '[]') as additional_features
      FROM ServiceRequest 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    const serviceRequests = await promisedDb.all(serviceRequestsQuery, [userId]);

    if (!serviceRequests || serviceRequests.length === 0) {
      return res.json([]);
    }

    const srIds = serviceRequests.map(r => r.id).filter(id => Number.isInteger(Number(id)));
    let ticketsBySrId = {};

    if (srIds.length > 0) {
      const placeholders = srIds.map(() => '?').join(',');
           const ticketQuery = `
       SELECT id, status, discord_channel_id, service_request_id 
       FROM Ticket 
       WHERE service_request_id IN (${placeholders}) AND deleted = 0
     `;
      const ticketRows = await promisedDb.all(ticketQuery, srIds);
      
      for (const ticket of ticketRows) {
        ticketsBySrId[ticket.service_request_id] = ticket;
      }
    }

    const safeParseFeatures = (featuresJson) => {
      try {
        if (!featuresJson) return [];
        const parsed = JSON.parse(featuresJson);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    const processedRequests = serviceRequests.map(row => {
      const ticket = ticketsBySrId[row.id] || null;
      return {
        ...row,
        additional_features: safeParseFeatures(row.additional_features),
        ticket_id: ticket ? ticket.id : null,
        ticket_status: ticket ? ticket.status : null,
        discord_channel_id: ticket ? ticket.discord_channel_id : null,
      };
    });

    res.json(processedRequests);

  } catch (error) {
    logger.error('Failed to fetch service requests:', error.message, { stack: error.stack, userId: req.userId });
    res.status(500).json({ error: 'An unexpected error occurred while fetching service requests.' });
  }
});

app.post('/api/service-requests', middleware.verifyToken, validate([
  body('service_type').isString().isLength({ min: 2, max: 100 }),
  body('problem_description').isString().isLength({ min: 3, max: 5000 }),
  body('urgency_level').optional().isString().isLength({ max: 50 }),
  body('website_url').optional().isString().isLength({ max: 2048 }),
  body('platform_type').optional().isString().isLength({ max: 100 }),
  body('estimated_quote').optional().isNumeric(),
  body('additional_features').optional().isArray(),
]), async (req, res) => {
  const { website_url, platform_type, service_type, problem_description, estimated_quote, urgency_level, additional_features } = req.body;
  const { userId } = req; // Assuming verifyToken middleware adds userId

  // Get user details for client_name and client_email
  db.get('SELECT name, email, phone_number, website_url as user_website_url FROM User WHERE id = ?', [userId], (err, user) => {
    if (err) {
      logger.error('Error fetching user details:', err.message);
      return res.status(500).json({ error: 'Failed to fetch user details.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      const serviceRequestStmt = db.prepare('INSERT INTO ServiceRequest (client_name, client_email, website_url, platform_type, service_type, problem_description, estimated_quote, urgency_level, additional_features, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      serviceRequestStmt.run(user.name, user.email, website_url, platform_type, service_type, problem_description, estimated_quote, urgency_level, JSON.stringify(additional_features || []), userId, async function(err) {
      if (err) {
        db.run('ROLLBACK;');
        return res.status(500).json({ error: 'Failed to create service request.' });
      }
      const serviceRequestId = this.lastID;

      const ticketStmt = db.prepare('INSERT INTO Ticket (user_id, service_request_id, status) VALUES (?, ?, ?)');
      ticketStmt.run(userId, serviceRequestId, 'open', async function(err) {
        if (err) {
          db.run('ROLLBACK;');
          return res.status(500).json({ error: 'Failed to create ticket.' });
        }
        const ticketId = this.lastID;
        db.run('COMMIT;');

        try {
          const serviceRequestDetails = { 
            ...req.body, 
            id: serviceRequestId, 
            ticket_id: ticketId,
            client_name: user.name,
            client_email: user.email,
            client_phone: user.phone_number || null,
            // Website displayed in Discord should fallback to the user's saved website if not provided in the request
            website_url: website_url || user.user_website_url || null,
            user_website_url: user.user_website_url || null,
            additional_features: additional_features || []
          };
          // ntfy: new portal service request
          if (typeof sendNtfy === 'function') {
            const title = `New Service Request (#${serviceRequestId})`;
            const lines = [
              `Client: ${user.name} <${user.email}>`,
              `Service: ${service_type}`,
              `Urgency: ${urgency_level || 'n/a'}`,
              `Estimated: ${typeof estimated_quote === 'number' ? `£${estimated_quote}` : 'n/a'}`,
            ];
            sendNtfy(lines.join('\n'), { title, tags: ['ticket','portal','service-request'], priority: 3 });
          }
          const channelId = await createDiscordTicketChannel(serviceRequestDetails);
          if (channelId) {
            db.run('UPDATE Ticket SET discord_channel_id = ? WHERE id = ?', [channelId, ticketId]);
            db.run('UPDATE ServiceRequest SET discord_notified = 1 WHERE id = ?', [serviceRequestId]);
          }
        } catch (discordError) {
          logger.error('Discord notification failed, but request was saved:', discordError);
        }

        res.status(201).json({
          message: 'Service request submitted successfully!',
          serviceRequestId,
          ticketId,
        });
      });
      ticketStmt.finalize();
    });
    serviceRequestStmt.finalize();
  });
  });

  const posthog = getPostHogClient();
  if (posthog) {
    posthog.capture({
      distinctId: req.userId,
      event: 'service request created',
      properties: {
        service_type: service_type,
        urgency_level: urgency_level,
        estimated_quote: estimated_quote,
      }
    });
  }
});

app.get('/api/site-health', middleware.verifyToken, middleware.requireActiveSubscription, (req, res) => {
  db.all(`SELECT * FROM SiteHealthCheck WHERE user_id = ? ORDER BY created_at DESC`, [req.userId], (err, rows) => {
    if (err) {
      logger.error('Error fetching site health checks:', err.message);
      return res.status(500).json({ error: 'Failed to fetch site health checks.' });
    }
    res.json(rows);
  });
});

app.post('/api/credentials', middleware.verifyToken, validate([
  body('service_request_id').isInt({ min: 1 }),
  body().custom((value, { req }) => {
    const hasUserPass = typeof req.body.username === 'string' && typeof req.body.password === 'string' && req.body.username.trim() && req.body.password.trim();
    const hasLabelText = typeof req.body.label === 'string' && typeof req.body.text === 'string' && req.body.label.trim() && req.body.text.trim();
    if (!hasUserPass && !hasLabelText) {
      throw new Error('Provide either username+password or label+text');
    }
    return true;
  })
]), (req, res) => {
  const { service_request_id, username, password, label, text } = req.body;
  try {
    const secret = (typeof text === 'string' && text.trim()) ? text : password;
    const { ciphertext, iv } = encryptText(String(secret || ''));
    const stmt = db.prepare('INSERT INTO Credential (service_request_id, user_id, label, username, password_enc, iv) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(service_request_id, req.userId, (label || null), (username || null), ciphertext, iv, (err) => {
      if (err) {
        logger.error('Error saving credentials:', err.message);
        return res.status(500).json({ error: 'Failed to save credentials.' });
      }
      res.status(201).json({ message: 'Credentials saved successfully.' });
    });
    stmt.finalize();
  } catch (e) {
    logger.error('Encryption error:', e.message);
    return res.status(500).json({ error: 'Failed to save credentials.' });
  }
});

app.get('/api/credentials', middleware.verifyToken, (req, res) => {
  db.all('SELECT id, service_request_id, label, username, created_at FROM Credential WHERE user_id = ?', [req.userId], (err, rows) => {
    if (err) {
      logger.error(`Error fetching credentials for user ${req.userId}:`, err.message);
      return res.status(500).json({ error: 'Failed to fetch credentials.' });
    }
    res.json(rows);
  });
});

// List active (non-deleted) service requests for dropdowns
app.get('/api/service-requests/active', middleware.verifyToken, (req, res) => {
  db.all(
    `SELECT id, service_type, platform_type, urgency_level, created_at FROM ServiceRequest WHERE user_id = ? ORDER BY created_at DESC`,
    [req.userId],
    (err, rows) => {
      if (err) {
        logger.error('Error listing active service requests:', err.message);
        return res.status(500).json({ error: 'Failed to list service requests.' });
      }
      res.json(rows || []);
    }
  );
});

app.delete('/api/credentials/:credentialId', middleware.verifyToken, validate([
  param('credentialId').isInt({ min: 1 })
]), (req, res) => {
  const { credentialId } = req.params;
  db.run('DELETE FROM Credential WHERE id = ? AND user_id = ?', [credentialId, req.userId], function (err) {
    if (err) {
      logger.error(`Error deleting credential ${credentialId} for user ${req.userId}:`, err.message);
      return res.status(500).json({ error: 'Failed to delete credential.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Credential not found or access denied.' });
    }
    res.status(204).send();
  });
});

app.post('/api/credentials/:credentialId/reveal', middleware.verifyToken, validate([
  param('credentialId').isInt({ min: 1 }),
  body('password').isString().isLength({ min: 8 })
]), (req, res) => {
  const { credentialId } = req.params;
  const { password } = req.body;

  db.get('SELECT password FROM User WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'Could not find user.' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    db.get('SELECT password_enc, iv FROM Credential WHERE id = ? AND user_id = ?', [credentialId, req.userId], (err, cred) => {
      if (err || !cred) return res.status(404).json({ error: 'Credential not found.' });
      
      try {
        const decryptedPassword = decryptText(cred.password_enc, cred.iv);
        db.run('UPDATE Credential SET last_accessed_at = ? WHERE id = ?', [new Date().toISOString(), credentialId]);
        res.json({ password: decryptedPassword });
      } catch (e) {
        logger.error('Decryption error:', e.message);
        res.status(500).json({ error: 'Failed to decrypt credential.' });
      }
    });
  });
});

// Public AI chat endpoint with tighter rate limit
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.post('/api/chat', chatLimiter, checkAiDailyLimit, validate([
  body('sessionId').isString().isLength({ min: 5, max: 100 }),
  body('prompt').isString().isLength({ min: 1, max: 5000 }),
  body('messages').optional().isArray({ max: 100 }),
]), async (req, res, next) => {
  try {
    const { sessionId, messages, prompt } = req.body;

    // Optional OpenAI moderation before sending to LLM
    if (ENABLE_OPENAI_MODERATION) {
      try {
        const { default: OpenAI } = await import('openai');
        const openaiLocal = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const mod = await openaiLocal.moderations.create({ model: 'omni-moderation-latest', input: String(prompt).slice(0, 1000) });
        const flagged = mod?.results?.[0]?.flagged;
        if (flagged) {
          return res.status(400).json({ error: 'Prompt violates content policy. Please rephrase.' });
        }
      } catch (_) {
        // If moderation fails, proceed to avoid false negatives blocking users
      }
    }

    // Store the conversation
    const messagesJson = JSON.stringify(messages);
    db.run(
      `INSERT OR REPLACE INTO ChatSession (session_id, user_id, messages) VALUES (?, ?, ?)`,
      [sessionId, null, messagesJson],
      (err) => {
        if (err) {
          logger.error('Error saving chat session:', err.message);
        }
      }
    );

    const response = await invokeLLM(String(prompt || '').slice(0, 2000));
    // optionally send to webhook for triage context
    postWebhook({ type: 'ai_chat', session_id: sessionId, prompt: String(prompt || ''), user_agent: req.headers['user-agent'] });
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

// Public contact with rate limit
const contactLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 50 });
app.post('/api/contact', contactLimiter, validate([
  body('client_name').isString().isLength({ min: 2, max: 200 }),
  body('client_email').isEmail(),
  body('website_url').optional({ nullable: true }).isString().isLength({ max: 2048 }),
  body('platform_type').optional().isString().isLength({ max: 100 }),
  body('service_type').isString().isLength({ min: 2, max: 100 }),
  body('problem_description').isString().isLength({ min: 3, max: 5000 }),
  body('urgency_level').optional().isString().isLength({ max: 50 }),
  body('estimated_quote').optional().isNumeric(),
  body('additional_features').optional().isArray(),
  body('cf_turnstile_token').optional().isString().isLength({ min: 10, max: 4000 }),
]), async (req, res, next) => {
  // Optional Turnstile verification
  if (String(process.env.ENABLE_CAPTCHA || '0') === '1' && String(CAPTCHA_PROVIDER).toLowerCase() === 'turnstile') {
    try {
      const token = req.body.cf_turnstile_token || '';
      if (!token) return res.status(400).json({ error: 'CAPTCHA required' });
      const params = new URLSearchParams();
      params.append('secret', TURNSTILE_SECRET_KEY);
      params.append('response', token);
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: params
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) return res.status(400).json({ error: 'CAPTCHA failed' });
    } catch (_) {
      return res.status(400).json({ error: 'CAPTCHA verification error' });
    }
  }
  const { client_name, client_email, website_url, platform_type, service_type, problem_description, urgency_level, estimated_quote, additional_features } = req.body;

  const stmt = db.prepare(
    `INSERT INTO ServiceRequest (user_id, client_name, client_email, website_url, platform_type, service_type, problem_description, urgency_level, estimated_quote, additional_features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(null, client_name, client_email, website_url, platform_type, service_type, problem_description, urgency_level, estimated_quote, JSON.stringify(additional_features || []), function(err) {
    if (err) {
      logger.error('Error inserting service request:', err.message);
      return res.status(500).json({ error: 'Failed to submit contact form.' });
    }
    
    const serviceRequest = {
      id: this.lastID,
      client_name,
      client_email,
      website_url,
      platform_type,
      service_type,
      problem_description,
      urgency_level,
      estimated_quote,
      additional_features: additional_features || [],
    };
    
    // ntfy: public contact form submitted
    try {
      if (typeof sendNtfy === 'function') {
        const title = `New Contact Form (#${serviceRequest.id})`;
        const lines = [
          `From: ${client_name} <${client_email}>`,
          `Service: ${service_type}`,
          `Urgency: ${urgency_level || 'n/a'}`,
          `Estimated: ${typeof estimated_quote === 'number' ? `£${estimated_quote}` : 'n/a'}`,
        ];
        sendNtfy(lines.join('\n'), { title, tags: ['contact','service-request'], priority: 4 });
      }
    } catch (_) {}

    // Lightly best-effort notifications; do not fail request if Discord fails
    try {
      createDiscordTicketChannel(serviceRequest)
        .then((channelId) => {
          if (channelId) {
            db.run('UPDATE Ticket SET discord_channel_id = ? WHERE user_id = ?', [channelId, null]);
            db.run(`UPDATE ServiceRequest SET discord_notified = 1 WHERE id = ?`, [serviceRequest.id]);
          }
        })
        .catch((notifyErr) => {
          logger.error('Discord ticket creation error (ignored):', notifyErr.message);
        });
    } catch (notifyErr) {
      logger.error('Discord notification setup error (ignored):', notifyErr.message);
    }
    
    res.status(201).json({ message: 'Contact form submitted successfully. We will get back to you shortly.' });
  });

  stmt.finalize();
});

// Admin: reminders management
app.get('/api/admin/reminders', middleware.verifyToken, middleware.isAdmin, (req, res) => {
  db.all('SELECT * FROM Reminder ORDER BY due_date ASC', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching reminders:', err.message);
      return res.status(500).json({ error: 'Failed to fetch reminders' });
    }
    res.json(rows || []);
  });
});

app.post('/api/admin/reminders', middleware.verifyToken, middleware.isAdmin, validate([
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').isString().isLength({ min: 1, max: 1000 }),
  body('client_email').isEmail(),
  body('client_name').isString().isLength({ min: 1, max: 100 }),
  body('reminder_type').isString().isLength({ min: 1, max: 50 }),
  body('due_date').isString().isLength({ min: 1, max: 20 }),
  body('due_time').isString().isLength({ min: 1, max: 10 }),
  body('priority').isString().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isString().isIn(['pending', 'completed', 'overdue'])
]), (req, res) => {
  const { title, description, client_email, client_name, reminder_type, due_date, due_time, priority, status = 'pending' } = req.body;
  
  db.run(
    'INSERT INTO Reminder (title, description, client_email, client_name, reminder_type, due_date, due_time, priority, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, client_email, client_name, reminder_type, due_date, due_time, priority, status, req.userId, new Date().toISOString()],
    function(err) {
      if (err) {
        logger.error('Error creating reminder:', err.message);
        return res.status(500).json({ error: 'Failed to create reminder' });
      }
      
      const reminder = {
        id: this.lastID,
        title,
        description,
        client_email,
        client_name,
        reminder_type,
        due_date,
        due_time,
        priority,
        status,
        created_by: req.userId,
        created_at: new Date().toISOString()
      };
      
      res.status(201).json(reminder);
    }
  );
});

app.patch('/api/admin/reminders/:id', middleware.verifyToken, middleware.isAdmin, validate([
  param('id').isInt({ min: 1 }),
  body('status').isString().isIn(['pending', 'completed', 'overdue'])
]), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE Reminder SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      logger.error('Error updating reminder:', err.message);
      return res.status(500).json({ error: 'Failed to update reminder' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    res.json({ message: 'Reminder updated successfully' });
  });
});

app.delete('/api/admin/reminders/:id', middleware.verifyToken, middleware.isAdmin, validate([
  param('id').isInt({ min: 1 })
]), (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM Reminder WHERE id = ?', [id], function(err) {
    if (err) {
      logger.error('Error deleting reminder:', err.message);
      return res.status(500).json({ error: 'Failed to delete reminder' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    res.json({ message: 'Reminder deleted successfully' });
  });
});

// Admin: users management
app.get('/api/admin/users', middleware.verifyToken, middleware.isAdmin, (req, res) => {
  db.all('SELECT id, name, email, subscription_tier, created_at FROM User ORDER BY name ASC', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching users:', err.message);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows || []);
  });
});

// Admin: quotes management
app.get('/api/admin/quotes', middleware.verifyToken, middleware.isAdmin, (req, res) => {
  db.all('SELECT * FROM Quote ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching quotes:', err.message);
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
    res.json(rows || []);
  });
});

app.post('/api/admin/quotes', middleware.verifyToken, middleware.isAdmin, validate([
  body('user_id').isInt({ min: 1 }),
  body('line_items').isArray({ min: 1 }),
  body('line_items.*.description').isString().isLength({ min: 1, max: 500 }),
  body('line_items.*.quantity').isInt({ min: 1 }),
  body('line_items.*.unit_price').isFloat({ min: 0 })
]), (req, res) => {
  const { user_id, line_items, service_request_id } = req.body;
  
  // Calculate total
  const total = line_items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0);
  
  db.run(
    'INSERT INTO Quote (user_id, service_request_id, total, status, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user_id, service_request_id || null, total, 'draft', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), req.userId, new Date().toISOString()],
    function(err) {
      if (err) {
        logger.error('Error creating quote:', err.message);
        return res.status(500).json({ error: 'Failed to create quote' });
      }
      
      const quoteId = this.lastID;
      
      // Insert line items
      const lineItemPromises = line_items.map(item => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO QuoteLineItem (quote_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)',
            [quoteId, item.description, item.quantity, item.unit_price],
            (err) => err ? reject(err) : resolve()
          );
        });
      });
      
      Promise.all(lineItemPromises)
        .then(() => {
          const quote = {
            id: quoteId,
            user_id,
            service_request_id,
            total,
            status: 'draft',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: req.userId,
            created_at: new Date().toISOString(),
            line_items
          };
          res.status(201).json(quote);
        })
        .catch(err => {
          logger.error('Error creating quote line items:', err.message);
          res.status(500).json({ error: 'Failed to create quote line items' });
        });
    }
  );
});

app.post('/api/admin/quotes/:id/finalize', middleware.verifyToken, middleware.isAdmin, validate([
  param('id').isInt({ min: 1 })
]), (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE Quote SET status = ? WHERE id = ?', ['open', id], function(err) {
    if (err) {
      logger.error('Error finalizing quote:', err.message);
      return res.status(500).json({ error: 'Failed to finalize quote' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json({ message: 'Quote finalized successfully' });
  });
});

app.post('/api/admin/quotes/:id/accept', middleware.verifyToken, middleware.isAdmin, validate([
  param('id').isInt({ min: 1 })
]), (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE Quote SET status = ? WHERE id = ?', ['accepted', id], function(err) {
    if (err) {
      logger.error('Error accepting quote:', err.message);
      return res.status(500).json({ error: 'Failed to accept quote' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json({ message: 'Quote accepted successfully' });
  });
});

app.post('/api/admin/quotes/:id/cancel', middleware.verifyToken, middleware.isAdmin, validate([
  param('id').isInt({ min: 1 })
]), (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE Quote SET status = ? WHERE id = ?', ['canceled', id], function(err) {
    if (err) {
      logger.error('Error canceling quote:', err.message);
      return res.status(500).json({ error: 'Failed to cancel quote' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json({ message: 'Quote canceled successfully' });
  });
});

// Admin: create a one-off custom invoice for a user
app.post('/api/admin/invoices/create', middleware.verifyToken, middleware.isAdmin, validate([
  body('amount').isFloat({ gt: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('send_invoice_email').optional().isBoolean(),
  body('user_id').optional().isInt({ min: 1 }),
  body('email').optional().isEmail(),
  body().custom((val) => {
    if (!val) return false;
    if (!val.user_id && !val.email) {
      throw new Error('Provide either user_id or email');
    }
    return true;
  })
]), async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
    const { user_id, email, amount, currency = 'gbp', description = 'Custom service invoice', send_invoice_email = true } = req.body || {};
    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const amountMinor = Math.round(amountNumber * 100);
    // Find user
    let user = null;
    if (user_id) {
      user = await new Promise((resolve) => db.get('SELECT id, email, name, stripe_customer_id FROM User WHERE id = ?', [user_id], (err, row) => resolve(row || null)));
    } else if (email) {
      user = await new Promise((resolve) => db.get('SELECT id, email, name, stripe_customer_id FROM User WHERE email = ?', [String(email).toLowerCase()], (err, row) => resolve(row || null)));
    }
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure Stripe customer exists
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name || undefined });
      customerId = customer.id;
      db.run('UPDATE User SET stripe_customer_id = ? WHERE id = ?', [customerId, user.id]);
    }

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      currency,
      unit_amount: amountMinor,
      description,
    });

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: send_invoice_email ? 'send_invoice' : 'charge_automatically',
      days_until_due: send_invoice_email ? INVOICE_DUE_DAYS : undefined,
    });

    // Finalize and optionally send
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    if (send_invoice_email) {
      await stripe.invoices.sendInvoice(finalized.id);
    }

    // Retrieve hosted URL
    const refreshed = await stripe.invoices.retrieve(finalized.id);
    res.json({ invoice_id: refreshed.id, hosted_invoice_url: refreshed.hosted_invoice_url, status: refreshed.status });
  } catch (e) {
    logger.error('Create custom invoice error:', e.message);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Socket.io
initializeSocket(io);

// Serve frontend (static)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Don't send stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = {
    error: 'Internal server error',
    ...(isDevelopment && { details: err.message, stack: err.stack })
  };
  
  res.status(500).json(errorResponse);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, you might want to exit gracefully
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Initialize PostHog for server-side analytics
initPostHog();

server.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

module.exports = app;
