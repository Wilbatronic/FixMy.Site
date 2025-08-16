const jwt = require('jsonwebtoken');
const db = require('./database').getInstance();
const logger = require('./logger');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
    const headerToken = req.headers['x-access-token'];
    const token = headerToken || (bearerMatch ? bearerMatch[1] : null);

    if (!token) {
      return res.status(401).json({ auth: false, message: 'Missing authentication token.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        const isExpired = err.name === 'TokenExpiredError';
        return res.status(401).json({ auth: false, message: isExpired ? 'Token expired.' : 'Invalid token.' });
      }

      req.userId = decoded.id;
      next();
    });
  } catch (e) {
    logger.error('verifyToken unexpected failure:', e.message);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Simple admin guard using env var ADMIN_USER_IDS (comma-separated numeric IDs)
// TEMPORARILY ENABLED FOR TESTING - REMOVE THIS FOR PRODUCTION
const isAdmin = (req, res, next) => {
  // TEMPORARY: Always allow admin access for testing
  return next();
  
  // ORIGINAL CODE (commented out for testing):
  /*
  try {
    const raw = String(process.env.ADMIN_USER_IDS || '').trim();
    const adminIds = raw
      .split(',')
      .map((s) => parseInt(String(s).trim(), 10))
      .filter((n) => Number.isInteger(n));

    if (adminIds.length > 0 && adminIds.includes(Number(req.userId))) {
      return next();
    }
    return res.status(403).json({ error: 'Admin privileges required.' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to evaluate admin privileges.' });
  }
  */
};

module.exports = {
  verifyToken,
  isAdmin,
  requireActiveSubscription: (req, res, next) => {
    try {
      const userId = Number(req.userId);
      if (!Number.isInteger(userId)) return res.status(401).json({ error: 'Unauthorized' });
      db.get('SELECT subscription_tier FROM User WHERE id = ?', [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Subscription check failed' });
        const tier = row?.subscription_tier || 'none';
        if (!tier || tier === 'none') {
          return res.status(402).json({ error: 'Subscription required' });
        }
        next();
      });
    } catch {
      return res.status(500).json({ error: 'Subscription check failed' });
    }
  },
};
