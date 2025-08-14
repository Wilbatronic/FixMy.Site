require('dotenv').config();
const db = require('../database').getInstance();
const logger = require('../logger');

(async () => {
  // Load all service requests
  const serviceRequests = await new Promise((resolve) => {
    db.all('SELECT id FROM ServiceRequest', (err, rows) => {
      if (err) {
        logger.error('[wipeServiceRequests] Failed to list service requests:', err.message);
        return resolve([]);
      }
      resolve(rows || []);
    });
  });

  const srIds = serviceRequests.map(r => r.id);
  if (srIds.length === 0) {
    logger.info('[wipeServiceRequests] No service requests found. Nothing to delete.');
    process.exit(0);
    return;
  }

  // Gather tickets for Discord cleanup
  const tickets = await new Promise((resolve) => {
    const placeholders = srIds.map(() => '?').join(',');
    db.all(`SELECT id, discord_channel_id FROM Ticket WHERE service_request_id IN (${placeholders})`, srIds, (err, rows) => {
      if (err) {
        logger.warn('[wipeServiceRequests] Failed to list related tickets:', err.message);
        return resolve([]);
      }
      resolve(rows || []);
    });
  });

  // Best-effort Discord channel deletions
  try {
    const { getDiscordClient } = require('../notifications');
    const discordClient = getDiscordClient();
    // Wait for readiness briefly
    await new Promise((resolve) => {
      if (typeof discordClient.isReady === 'function' && discordClient.isReady()) return resolve();
      discordClient.once('ready', resolve);
      setTimeout(resolve, 4000);
    });
    for (const t of tickets) {
      if (!t.discord_channel_id) continue;
      try {
        const ch = await discordClient.channels.fetch(t.discord_channel_id);
        if (ch) await ch.delete();
        logger.info(`[wipeServiceRequests] Deleted Discord channel ${t.discord_channel_id} for ticket ${t.id}`);
      } catch (e) {
        logger.warn(`[wipeServiceRequests] Could not delete Discord channel ${t.discord_channel_id} for ticket ${t.id}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn('[wipeServiceRequests] Discord cleanup skipped:', e.message);
  }

  // Transactional deletion: TicketMessage -> Ticket -> Credential -> ServiceRequest
  try {
    await new Promise((resolve, reject) => db.exec('BEGIN', (err) => (err ? reject(err) : resolve())));

    if (tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);
      const ticketPlaceholders = ticketIds.map(() => '?').join(',');
      await new Promise((resolve, reject) => db.run(`DELETE FROM TicketMessage WHERE ticket_id IN (${ticketPlaceholders})`, ticketIds, (err) => (err ? reject(err) : resolve())));
      await new Promise((resolve, reject) => db.run(`DELETE FROM Ticket WHERE id IN (${ticketPlaceholders})`, ticketIds, (err) => (err ? reject(err) : resolve())));
    }

    const srPlaceholders = srIds.map(() => '?').join(',');
    await new Promise((resolve, reject) => db.run(`DELETE FROM Credential WHERE service_request_id IN (${srPlaceholders})`, srIds, (err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => db.run(`DELETE FROM ServiceRequest WHERE id IN (${srPlaceholders})`, srIds, (err) => (err ? reject(err) : resolve())));

    await new Promise((resolve, reject) => db.exec('COMMIT', (err) => (err ? reject(err) : resolve())));
    logger.info('[wipeServiceRequests] All service requests and related data wiped.');
  } catch (e) {
    await new Promise((resolve) => db.exec('ROLLBACK', () => resolve()));
    logger.error('[wipeServiceRequests] Failed to wipe service requests:', e.message);
    process.exitCode = 1;
    return;
  }

  try {
    if (global.io) {
      global.io.emit('service_requests_wiped');
    }
  } catch {}

  process.exit(0);
})();


