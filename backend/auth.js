const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database').getInstance();
const logger = require('./logger');
const { sendEmail } = require('./email');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const crypto = require('crypto');

const register = (req, res, next) => {
  const { name, email, password, website_url, phone_country, phone_number } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send("Missing required fields.");
  }
  const hashedPassword = bcrypt.hashSync(password, 8);

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();
  const website = website_url && !/^https?:\/\//i.test(website_url) ? `https://${website_url}` : (website_url || null);
  let e164 = null;
  try {
    const parsed = phone_number
      ? (String(phone_number).trim().startsWith('+')
          ? parsePhoneNumberFromString(String(phone_number).trim())
          : parsePhoneNumberFromString(String(phone_number).trim(), String(phone_country || 'GB').toUpperCase()))
      : null;
    e164 = parsed && parsed.isValid() ? parsed.number : null;
  } catch {}

  // Check if email already exists
  db.get('SELECT id FROM User WHERE email = ?', [trimmedEmail], (err, existing) => {
    if (err) {
      logger.error('Error checking user existence:', err.message);
      return res.status(500).send('Internal error');
    }
    if (existing) {
      return res.status(409).send('Email already in use');
    }

    // Generate 6-digit code, expire in 15 minutes
    const code = String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const stmt = db.prepare(`INSERT INTO User (name, email, password, website_url, phone_country, phone_number, email_verified, verification_code, verification_expires) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`);
    stmt.run(trimmedName, trimmedEmail, hashedPassword, website, (phone_country || null), e164, code, expiresAt, (err2) => {
      if (err2) {
        logger.error('Error registering user:', err2.message);
        return res.status(500).send("There was a problem registering the user.");
      }
      const html = `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`;
      sendEmail(trimmedEmail, 'Verify your email', html).catch((e) => logger.error('Email send error', e));
      res.status(201).send({ message: "User registered successfully. Please verify your email.", pendingVerification: true });
    });
    stmt.finalize();
  });
};

function setRefreshCookie(res, token) {
  const isProd = String(process.env.NODE_ENV) === 'production';
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30d
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: 900 }); // 15 minutes
}

function createRefreshToken(userId, cb) {
  const token = crypto.randomBytes(48).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.run('INSERT INTO RefreshToken (user_id, token, expires, revoked) VALUES (?, ?, ?, 0)', [userId, token, expires], (err) => {
    cb(err, token, expires);
  });
}

const login = (req, res, next) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM User WHERE email = ?`, [email], (err, user) => {
    if (err) {
      logger.error('Error on the server.');
      return res.status(500).send('Error on the server.');
    }
    if (!user) {
      return res.status(404).send('No user found.');
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({ auth: false, token: null });
    }

    if (!user.email_verified) {
      return res.status(403).send({ auth: false, token: null, message: 'Email not verified.' });
    }

    const accessToken = generateAccessToken(user.id);
    createRefreshToken(user.id, (rErr, refreshToken) => {
      if (rErr) {
        logger.error('Error creating refresh token:', rErr.message);
        return res.status(500).send('Error issuing tokens.');
      }
      setRefreshCookie(res, refreshToken);
      res.status(200).send({ auth: true, token: accessToken, id: user.id });
    });
  });
};

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const [k, ...rest] = part.split('=');
    if (!k) return;
    out[k.trim()] = decodeURIComponent(rest.join('=').trim() || '');
  });
  return out;
}

const refreshToken = (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies['refresh_token'];
    if (!token) return res.status(401).json({ error: 'Missing refresh token' });
    db.get('SELECT id, user_id, token, expires, revoked FROM RefreshToken WHERE token = ?', [token], (err, row) => {
      if (err || !row) return res.status(401).json({ error: 'Invalid refresh token' });
      if (Number(row.revoked) === 1) return res.status(401).json({ error: 'Token revoked' });
      if (row.expires && new Date(row.expires).getTime() < Date.now()) return res.status(401).json({ error: 'Token expired' });
      const userId = row.user_id;
      // Rotate refresh token
      db.run('UPDATE RefreshToken SET revoked = 1 WHERE id = ?', [row.id], (revErr) => {
        if (revErr) return res.status(500).json({ error: 'Rotation failed' });
        createRefreshToken(userId, (crtErr, newToken) => {
          if (crtErr) return res.status(500).json({ error: 'Rotation failed' });
          setRefreshCookie(res, newToken);
          const accessToken = generateAccessToken(userId);
          return res.json({ token: accessToken, id: userId });
        });
      });
    });
  } catch (e) {
    return res.status(500).json({ error: 'Refresh failed' });
  }
};

const logout = (req, res) => {
  try {
    // Best-effort revoke current refresh token
    const cookies = parseCookies(req);
    const token = cookies['refresh_token'];
    if (token) {
      db.run('UPDATE RefreshToken SET revoked = 1 WHERE token = ?', [token], () => {});
    }
    res.clearCookie('refresh_token', { path: '/' });
  } catch {}
  res.json({ ok: true });
};

const updateProfile = (req, res) => {
  const { name, email, website_url, phone_country, phone_number } = req.body;
  const userId = req.userId;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();
  const website = website_url && !/^https?:\/\//i.test(website_url) ? `https://${website_url}` : (website_url || null);
  
  let e164 = null;
  try {
    const parsed = phone_number
      ? (String(phone_number).trim().startsWith('+')
          ? parsePhoneNumberFromString(String(phone_number).trim())
          : parsePhoneNumberFromString(String(phone_number).trim(), String(phone_country || 'GB').toUpperCase()))
      : null;
    e164 = parsed && parsed.isValid() ? parsed.number : null;
  } catch {}

  // Check if email is already taken by another user
  db.get('SELECT id FROM User WHERE email = ? AND id != ?', [trimmedEmail, userId], (err, existing) => {
    if (err) {
      logger.error('Error checking email uniqueness:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (existing) {
      return res.status(409).json({ message: 'Email already in use by another account' });
    }

    // Update user profile
    db.run(
      'UPDATE User SET name = ?, email = ?, website_url = ?, phone_country = ?, phone_number = ? WHERE id = ?',
      [trimmedName, trimmedEmail, website, (phone_country || null), e164, userId],
      (err2) => {
        if (err2) {
          logger.error('Error updating user profile:', err2.message);
          return res.status(500).json({ message: 'Failed to update profile' });
        }
        res.json({ message: 'Profile updated successfully' });
      }
    );
  });
};

const updatePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  // Get current user to verify current password
  db.get('SELECT password FROM User WHERE id = ?', [userId], (err, user) => {
    if (err) {
      logger.error('Error fetching user for password update:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 8);

    // Update password
    db.run('UPDATE User SET password = ? WHERE id = ?', [hashedPassword, userId], (err2) => {
      if (err2) {
        logger.error('Error updating password:', err2.message);
        return res.status(500).json({ message: 'Failed to update password' });
      }
      res.json({ message: 'Password updated successfully' });
    });
  });
};

module.exports = {
  register,
  login,
  updateProfile,
  updatePassword,
  requestVerification: (req, res) => {
    const { email } = req.body;
    db.get('SELECT id FROM User WHERE email = ?', [email], (err, user) => {
      if (err || !user) return res.status(404).send({ message: 'User not found' });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.run('UPDATE User SET verification_code = ?, verification_expires = ? WHERE id = ?', [code, expiresAt, user.id], (err2) => {
        if (err2) return res.status(500).send({ message: 'Failed to create code' });
        const html = `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`;
        sendEmail(email, 'Verify your email', html).then(() => res.send({ ok: true })).catch(() => res.send({ ok: true }));
      });
    });
  },
  verifyEmail: (req, res) => {
    const { email, code } = req.body;
    db.get('SELECT id, verification_code, verification_expires FROM User WHERE email = ?', [email], (err, user) => {
      if (err || !user) return res.status(404).send({ message: 'User not found' });
      if (String(user.verification_code) !== String(code)) return res.status(400).send({ message: 'Invalid code' });
      if (user.verification_expires && new Date(user.verification_expires).getTime() < Date.now()) {
        return res.status(400).send({ message: 'Code expired' });
      }
      db.run('UPDATE User SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?', [user.id], (err2) => {
        if (err2) return res.status(500).send({ message: 'Failed to verify' });
        res.send({ verified: true });
      });
    });
  }
};

module.exports.refreshToken = refreshToken;
module.exports.logout = logout;
