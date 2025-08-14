const db = require('./database').getInstance();
const { getDiscordClient } = require('./notifications');
const logger = require('./logger');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('./email');
const emailTemplate = require('./emailTemplate');

module.exports = (io) => {
  const discordClient = getDiscordClient();

  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided.'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token.'));
      }
      socket.userId = decoded.id;
      next();
    });
  });

  // Main connection handler
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId} with socket ID ${socket.id}`);

    socket.on('join_ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`User ${socket.userId} joined ticket room: ${ticketId}`);
    });

    // Client acknowledges reading messages up to a specific message id
    socket.on('client_read_upto', ({ ticketId, lastMessageId }) => {
      const numericTicketId = Number(ticketId);
      const numericMessageId = Number(lastMessageId);
      if (!Number.isInteger(numericTicketId) || !Number.isInteger(numericMessageId)) return;

      // Ensure the ticket belongs to this user
      db.get('SELECT id, client_last_read_message_id, notified_unread_message_id FROM Ticket WHERE id = ? AND user_id = ?', [numericTicketId, socket.userId], (err, ticket) => {
        if (err || !ticket) return;
        const currentLast = Number(ticket.client_last_read_message_id || 0);
        const newLast = Math.max(currentLast, numericMessageId);
        db.run('UPDATE Ticket SET client_last_read_message_id = ? WHERE id = ?', [newLast, numericTicketId]);
        const notified = Number(ticket.notified_unread_message_id || 0);
        if (notified && notified <= newLast) {
          db.run('UPDATE Ticket SET notified_unread_message_id = NULL WHERE id = ?', [numericTicketId]);
        }
      });
    });

    socket.on('request_history', (ticketId, callback) => {
      db.all('SELECT * FROM TicketMessage WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId], (err, messages) => {
        if (err) {
          logger.error(`Error fetching history for ticket ${ticketId}:`, err);
          return callback({ error: 'Failed to load message history.' });
        }
        callback(messages);
      });
    });

    socket.on('ticket_message', ({ ticketId, message }) => {
      // Check if ticket is closed before allowing messages
      db.get('SELECT status, discord_channel_id FROM Ticket WHERE id = ?', [ticketId], (err, ticket) => {
        if (err) {
          logger.error('Error checking ticket status:', err.message);
          return;
        }
        
        if (!ticket) {
          socket.emit('error', { message: 'Ticket not found.' });
          return;
        }
        
        if (ticket.status === 'closed') {
          socket.emit('error', { message: 'Cannot send messages to a closed ticket.' });
          return;
        }
        
        const authorName = `User #${socket.userId}`;
        db.run('INSERT INTO TicketMessage (ticket_id, user_id, author_name, message) VALUES (?, ?, ?, ?)', [ticketId, socket.userId, authorName, message], function (err) {
          if (err) return logger.error('DB error saving client message:', err);

          const fullMessage = { id: this.lastID, ticket_id: ticketId, user_id: socket.userId, author_name: authorName, message, created_at: new Date().toISOString() };
          io.to(`ticket:${ticketId}`).emit('new_message', fullMessage);

          if (ticket.discord_channel_id) {
            discordClient.channels.fetch(ticket.discord_channel_id)
              .then(channel => channel.send(`**${authorName}:** ${message}`))
              .catch(e => logger.error(`Failed to send client message to Discord channel ${ticket.discord_channel_id}`, e));
          }
        });
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });
  });

  // Discord -> Portal Bridge
  discordClient.on('messageCreate', (message) => {
    if (message.author.bot) return;

    db.get('SELECT id as ticketId, user_id FROM Ticket WHERE discord_channel_id = ?', [message.channel.id], (err, ticket) => {
      if (err || !ticket) return;

      const authorName = 'FixMy.Site Support';
      db.run('INSERT INTO TicketMessage (ticket_id, user_id, author_name, message) VALUES (?, NULL, ?, ?)', [ticket.ticketId, authorName, message.content], function (err) {
        if (err) return logger.error('DB error saving Discord message:', err);
        const fullMessage = { id: this.lastID, ticket_id: ticket.ticketId, user_id: null, author_name: authorName, message: message.content, created_at: new Date().toISOString() };
        io.to(`ticket:${ticket.ticketId}`).emit('new_message', fullMessage);

        // Check if user is offline and send email notification (only once per unread batch)
        const room = io.sockets.adapter.rooms.get(`ticket:${ticket.ticketId}`);
        if (!room || room.size === 0) {
          db.get('SELECT client_last_read_message_id, notified_unread_message_id FROM Ticket WHERE id = ?', [ticket.ticketId], (err2, tstate) => {
            if (err2 || !tstate) return;
            const lastRead = Number(tstate.client_last_read_message_id || 0);
            const notified = Number(tstate.notified_unread_message_id || 0);
            // If we've not notified for an unread yet (or the notified one was already read), send one for the oldest unread (this new message qualifies)
            if (!notified || notified <= lastRead) {
              db.get('SELECT email, name FROM User WHERE id = ?', [ticket.user_id], (err3, user) => {
                if (!err3 && user) {
                  const emailTitle = `New Message in Ticket #${ticket.ticketId}`;
                  const emailBody = `You have a new message in Ticket #${ticket.ticketId} from ${authorName}.<br><br>Message: "${message.content}"<br/><br/>We will only send one alert until you view the conversation.`;
                  sendEmail(user.email, emailTitle, emailTemplate(emailTitle, user.name, emailBody));
                  db.run('UPDATE Ticket SET notified_unread_message_id = ? WHERE id = ?', [fullMessage.id, ticket.ticketId]);
                }
              });
            }
          });
        }
      });
    });
  });

  discordClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, channelId } = interaction;

    if (commandName === 'credential') {
      // Work within a ticket channel
      db.get('SELECT id as ticketId, service_request_id, user_id FROM Ticket WHERE discord_channel_id = ?', [channelId], async (err, ticket) => {
        if (err || !ticket) {
          return interaction.reply({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
        }

        const subcommand = options.getSubcommand();
        if (subcommand === 'add') {
          const label = options.getString('for');
          const text = options.getString('text');
          try {
            const { encryptText } = require('./crypto');
            const { ciphertext, iv } = encryptText(String(text || ''));
            await new Promise((resolve, reject) =>
              db.run(
                'INSERT INTO Credential (service_request_id, user_id, label, username, password_enc, iv) VALUES (?, ?, ?, ?, ?, ?)',
                [ticket.service_request_id, ticket.user_id, label, null, ciphertext, iv],
                (e) => (e ? reject(e) : resolve())
              )
            );
            return interaction.reply({ content: 'Credential stored securely and linked to this ticket.', ephemeral: true });
          } catch (e) {
            logger.error('Failed to add credential via Discord:', e);
            return interaction.reply({ content: 'Failed to store credential. Contact support.', ephemeral: true });
          }
        } else if (subcommand === 'list') {
          db.all('SELECT id, label, username, created_at FROM Credential WHERE service_request_id = ?', [ticket.service_request_id], (e, rows) => {
            if (e) {
              return interaction.reply({ content: 'Failed to list credentials.', ephemeral: true });
            }
            if (!rows || rows.length === 0) {
              return interaction.reply({ content: 'No credentials stored for this ticket.', ephemeral: true });
            }
            const lines = rows.map(r => `#${r.id} • ${r.label || r.username || 'Credential'} • saved ${new Date(r.created_at).toLocaleString()}`);
            return interaction.reply({ content: lines.join('\n'), ephemeral: true });
          });
        } else if (subcommand === 'reveal') {
          const credId = options.getInteger('id');
          db.get('SELECT password_enc, iv, label, username FROM Credential WHERE id = ? AND service_request_id = ?', [credId, ticket.service_request_id], (e, cred) => {
            if (e || !cred) {
              return interaction.reply({ content: 'Credential not found for this ticket.', ephemeral: true });
            }
            try {
              const { decryptText } = require('./crypto');
              const secret = decryptText(cred.password_enc, cred.iv);
              const title = cred.label || cred.username || 'Credential';
              return interaction.reply({ content: `${title}: ${secret}`, ephemeral: true });
            } catch (decErr) {
              logger.error('Failed to decrypt credential:', decErr);
              return interaction.reply({ content: 'Failed to decrypt credential.', ephemeral: true });
            }
          });
        }
      });
      return;
    }

    if (commandName !== 'ticket') return;

    db.get('SELECT id as ticketId, user_id FROM Ticket WHERE discord_channel_id = ?', [channelId], (err, ticket) => {
      if (err || !ticket) {
        return interaction.reply({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
      }

      const subcommand = options.getSubcommand();

      if (subcommand === 'close') {
        db.run('UPDATE Ticket SET status = "closed" WHERE id = ?', [ticket.ticketId], async function (err) {
          if (err) return interaction.reply({ content: 'Error closing ticket.', ephemeral: true });
          
          io.to(`ticket:${ticket.ticketId}`).emit('status_update', { status: 'closed' });
          
          // Archive the Discord channel by moving it to an archive category
          try {
            const channel = await discordClient.channels.fetch(channelId);
            if (channel) {
              const archiveCategoryId = process.env.DISCORD_ARCHIVE_CATEGORY_ID;
              if (archiveCategoryId) {
                await channel.setParent(archiveCategoryId, { lockPermissions: false });
                await interaction.reply('Ticket closed and moved to archive.');
              } else {
                await interaction.reply('Ticket closed. Consider setting up an archive category.');
              }
            }
          } catch (archiveError) {
            logger.error('Error archiving Discord channel:', archiveError);
            await interaction.reply('Ticket closed. Archive operation failed.');
          }
        });
      } else if (subcommand === 'status') {
        const newStatus = options.getString('status');
        db.run('UPDATE Ticket SET status = ? WHERE id = ?', [newStatus, ticket.ticketId], function (err) {
          if (err) return interaction.reply({ content: 'Error updating status.', ephemeral: true });

          io.to(`ticket:${ticket.ticketId}`).emit('status_update', { status: newStatus });

          // Email notifications for key status changes
          if (['in-progress', 'completed', 'resolved'].includes(String(newStatus))) {
            db.get('SELECT email, name FROM User WHERE id = ?', [ticket.user_id], (err2, user) => {
              if (user) {
                let emailTitle;
                let emailBody;
                if (newStatus === 'in-progress') {
                  emailTitle = `Ticket #${ticket.ticketId} In Progress`;
                  emailBody = `Good news — your ticket #${ticket.ticketId} is now in progress. Our team has started working on your request. We’ll keep you updated here.`;
                } else if (newStatus === 'completed' || newStatus === 'resolved') {
                  emailTitle = `Ticket #${ticket.ticketId} Completed`;
                  emailBody = `Your service request in Ticket #${ticket.ticketId} has been marked as completed. If anything needs a follow-up, reply to this ticket anytime.`;
                }
                if (emailTitle && emailBody) {
                  sendEmail(user.email, emailTitle, emailTemplate(emailTitle, user.name, emailBody));
                }
              }
            });
          }
          
          interaction.reply({ content: `Ticket status updated to **${newStatus}**.`, ephemeral: false });
        });
      } else if (subcommand === 'delete') {
        const confirm = options.getString('confirm');
        
        if (confirm !== 'DELETE') {
          return interaction.reply({ content: 'Please type "DELETE" to confirm deletion.', ephemeral: true });
        }

        (async () => {
          try {
            // Defer the reply to ensure it's sent
            await interaction.deferReply({ ephemeral: true });

            // Delete Discord channel
            const channel = await discordClient.channels.fetch(channelId);
            if (channel) {
              await channel.delete();
              logger.info(`Deleted Discord channel ${channelId} for ticket ${ticket.ticketId}`);
            }

            const runDbTransaction = async () => {
              return new Promise((resolve, reject) => {
                db.serialize(async () => {
                  try {
                    await new Promise((res, rej) => db.exec('BEGIN', (err) => err ? rej(err) : res()));

                    const ticketData = await new Promise((res, rej) => db.get('SELECT service_request_id FROM Ticket WHERE id = ?', [ticket.ticketId], (err, row) => err ? rej(err) : res(row)));
                    if (!ticketData) throw new Error(`Ticket ${ticket.ticketId} not found in database.`);
                    logger.info(`Fetched ticket data for deletion: ticketId=${ticket.ticketId}, serviceRequestId=${ticketData.service_request_id}`);

                    await new Promise((res, rej) => db.run('DELETE FROM TicketMessage WHERE ticket_id = ?', [ticket.ticketId], (err) => err ? rej(err) : res()));
                    logger.info(`Deleted ticket messages for ticket ${ticket.ticketId}`);

                  await new Promise((res, rej) => db.run('DELETE FROM Ticket WHERE id = ?', [ticket.ticketId], (err) => err ? rej(err) : res()));
                  logger.info(`Deleted ticket ${ticket.ticketId} from database`);

                  if (ticketData.service_request_id) {
                    // Remove any credentials linked to this service request
                    await new Promise((res, rej) => db.run('DELETE FROM Credential WHERE service_request_id = ?', [ticketData.service_request_id], (err) => err ? rej(err) : res()));
                    // Fully remove the service request to ensure it disappears from the portal/dashboard
                    await new Promise((res, rej) => db.run('DELETE FROM ServiceRequest WHERE id = ?', [ticketData.service_request_id], (err) => err ? rej(err) : res()));
                    logger.info(`Deleted service request ${ticketData.service_request_id} and related credentials`);
                  }
                    
                  await new Promise((res, rej) => db.exec('COMMIT', (err) => err ? rej(err) : res()));
                  resolve({ serviceRequestId: ticketData.service_request_id });
                  } catch (dbError) {
                    await new Promise(res => db.exec('ROLLBACK', () => res())); // Attempt rollback, but don't fail if it does
                    reject(dbError);
                  }
                });
              });
            };

            const { serviceRequestId } = await runDbTransaction();

            // Notify frontend about the deletion
            io.to(`ticket:${ticket.ticketId}`).emit('ticket_deleted');
            io.emit('ticket_deleted_from_dashboard', { ticketId: ticket.ticketId });
            io.emit('service_request_deleted', { serviceRequestId: serviceRequestId || null, ticketId: ticket.ticketId });

            logger.info(`Ticket ${ticket.ticketId} fully deleted.`);
            try {
              await interaction.editReply({ content: 'Ticket deleted successfully.' });
            } catch (editErr) {
              // If we cannot edit the original (e.g., Unknown Message), try followUp; otherwise, swallow to avoid crash
              try {
                await interaction.followUp({ content: 'Ticket deleted successfully.', ephemeral: true });
              } catch (_) { /* no-op */ }
            }

          } catch (error) {
            logger.error('Error deleting ticket:', error.message);
            if (!interaction.replied && !interaction.deferred) {
                try { await interaction.reply({ content: 'An unexpected error occurred.', ephemeral: true }); } catch (_) { /* no-op */ }
            } else {
                try {
                  await interaction.editReply({ content: 'An unexpected error occurred during deletion.' });
                } catch (editErr) {
                  // Fallback if original message is missing or cannot be edited
                  try { await interaction.followUp({ content: 'An unexpected error occurred during deletion.', ephemeral: true }); } catch (_) { /* no-op */ }
                }
            }
          }
        })();
      }
    });
  });
};
