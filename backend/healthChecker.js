const axios = require('axios');
const db = require('./database').getInstance();
const logger = require('./logger');

const checkWebsite = async (userId, url) => {
  try {
    const startTime = Date.now();
    const response = await axios.get(url, { timeout: 10000 });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    db.run(
      'INSERT INTO SiteHealthCheck (user_id, status_code, response_time) VALUES (?, ?, ?)',
      [userId, response.status, responseTime],
      (err) => {
        if (err) {
          logger.error(`Error saving health check for user ${userId} and url ${url}:`, err.message);
        }
      }
    );
  } catch (error) {
    logger.error(`Error checking website for user ${userId} and url ${url}:`, error.message);
    let statusCode = 500;
    if (error.response) {
      statusCode = error.response.status;
    }
    db.run(
      'INSERT INTO SiteHealthCheck (user_id, status_code, response_time) VALUES (?, ?, ?)',
      [userId, statusCode, 0],
      (err) => {
        if (err) {
          logger.error(`Error saving failed health check for user ${userId} and url ${url}:`, err.message);
        }
      }
    );
  }
};

module.exports = {
  checkWebsite,
};
