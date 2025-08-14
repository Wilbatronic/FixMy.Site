const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const logger = require('./logger');

const dbPath = path.resolve(__dirname, "database.sqlite");

function promisify(db) {
  const promisedDb = {};
  
  promisedDb.run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

  promisedDb.get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  promisedDb.all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  promisedDb.exec = (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  promisedDb.close = () => new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Attach the original db instance if direct access is needed
  promisedDb.db = db;

  return promisedDb;
}

let db;
let promisedDb;

const getInstance = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error("Error opening database", err.message);
      } else {
        logger.info("Connected to the SQLite database.");
        db.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) {
            logger.error("Error enabling foreign key constraints:", err.message);
          } else {
            logger.info("Foreign key constraints enabled.");
          }
        });
      }
    });
    promisedDb = promisify(db);
  }
  return db;
};

const getPromisedInstance = () => {
  if (!promisedDb) {
    getInstance(); // Ensures db is initialized
  }
  return promisedDb;
}

module.exports = {
  getInstance,
  getPromisedInstance,
};
