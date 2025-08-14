require('dotenv').config();
const db = require('../database').getInstance();
const logger = require('../logger');

(async () => {
  // Attempt Discord cleanup best-effort
  try {
    const { getDiscordClient } = require('../notifications');
    const discordClient = getDiscordClient();

    // Wait briefly for client to be ready (best-effort)
    await new Promise((resolve) => {
      if (typeof discordClient.isReady === 'function' && discordClient.isReady()) return resolve();
      discordClient.once('ready', resolve);
      setTimeout(resolve, 4000);
    });

    const tickets = await new Promise((resolve, reject) => {
      db.all('SELECT id, discord_channel_id FROM Ticket WHERE discord_channel_id IS NOT NULL', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    for (const t of tickets) {
      try {
        const ch = await discordClient.channels.fetch(t.discord_channel_id);
        if (ch) await ch.delete();
        logger.info(`[wipeTickets] Deleted Discord channel ${t.discord_channel_id} for ticket ${t.id}`);
      } catch (e) {
        logger.warn(`[wipeTickets] Could not delete Discord channel ${t.discord_channel_id} for ticket ${t.id}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn('[wipeTickets] Discord cleanup skipped:', e.message);
  }

  // Fetch SR ids related to existing tickets (before deletion)
  const serviceRequestIds = await new Promise((resolve) => {
    db.all('SELECT DISTINCT service_request_id FROM Ticket WHERE service_request_id IS NOT NULL', (err, rows) => {
      if (err) {
        logger.warn('[wipeTickets] Failed to list service_request_ids:', err.message);
        return resolve([]);
      }
      resolve((rows || []).map((r) => r.service_request_id).filter(Boolean));
    });
  });

  // Wipe within a transaction
  try {
    await new Promise((resolve, reject) => db.exec('BEGIN', (err) => (err ? reject(err) : resolve())));

    await new Promise((resolve, reject) => db.run('DELETE FROM TicketMessage', (err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => db.run('DELETE FROM Ticket', (err) => (err ? reject(err) : resolve())));

    if (serviceRequestIds.length > 0) {
      const placeholders = serviceRequestIds.map(() => '?').join(',');
      await new Promise((resolve, reject) => db.run(`UPDATE ServiceRequest SET status = 'new' WHERE id IN (${placeholders})`, serviceRequestIds, (err) => (err ? reject(err) : resolve())));
    }

    await new Promise((resolve, reject) => db.exec('COMMIT', (err) => (err ? reject(err) : resolve())));
    logger.info('[wipeTickets] All tickets and messages wiped. Related service requests set to status=new.');
  } catch (e) {
    await new Promise((resolve) => db.exec('ROLLBACK', () => resolve()));
    logger.error('[wipeTickets] Failed to wipe tickets:', e.message);
    process.exitCode = 1;
    return;
  }

  // Emit socket event if server is running (best-effort)
  try {
    if (global.io) {
      global.io.emit('tickets_wiped');
    }
  } catch {}

  process.exit(0);
})();


