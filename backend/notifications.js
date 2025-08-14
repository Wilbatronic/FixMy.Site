require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require('discord.js');
const logger = require('./logger');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.login(process.env.DISCORD_BOT_TOKEN);

client.once('ready', () => {
  logger.info('Discord bot is ready!');
});

const getDiscordClient = () => client;

// ntfy.sh integration
async function sendNtfy(message, opts = {}) {
  try {
    const baseUrl = (process.env.NTFY_URL || 'https://ntfy.sh').replace(/\/$/, '');
    const topic = process.env.NTFY_TOPIC;
    if (!topic) return; // Disabled unless topic configured
    if (typeof fetch !== 'function') {
      logger.warn('Global fetch not available; skipping ntfy notification');
      return;
    }
    const url = `${baseUrl}/${encodeURIComponent(topic)}`;
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (opts.title) headers['Title'] = String(opts.title).slice(0, 200);
    if (opts.tags) headers['Tags'] = Array.isArray(opts.tags) ? opts.tags.join(',') : String(opts.tags);
    if (opts.priority) headers['Priority'] = String(opts.priority);
    if (opts.click) headers['Click'] = String(opts.click);
    // Auth: token or basic
    if (process.env.NTFY_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.NTFY_TOKEN}`;
    } else if (process.env.NTFY_USER && process.env.NTFY_PASS) {
      const token = Buffer.from(`${process.env.NTFY_USER}:${process.env.NTFY_PASS}`).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
    }
    await fetch(url, { method: 'POST', headers, body: String(message || '') });
  } catch (e) {
    logger.warn('Failed to send ntfy notification:', e.message);
  }
}

async function sendDiscordNotification(serviceRequest) {
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (channel) {
      const fields = [
        serviceRequest.client_name && { name: 'Client Name', value: String(serviceRequest.client_name), inline: true },
        serviceRequest.client_email && { name: 'Client Email', value: String(serviceRequest.client_email), inline: true },
        serviceRequest.client_phone && { name: 'Phone', value: String(serviceRequest.client_phone), inline: true },
        (serviceRequest.website_url || serviceRequest.user_website_url) && { name: 'Website URL', value: String(serviceRequest.website_url || serviceRequest.user_website_url), inline: true },
        serviceRequest.service_type && { name: 'Service Type', value: String(serviceRequest.service_type), inline: true },
        serviceRequest.platform_type && { name: 'Platform', value: String(serviceRequest.platform_type), inline: true },
        serviceRequest.urgency_level && { name: 'Urgency', value: String(serviceRequest.urgency_level), inline: true },
        (serviceRequest.estimated_quote !== undefined && serviceRequest.estimated_quote !== null) && { name: 'Estimated Quote', value: String(serviceRequest.estimated_quote), inline: true },
        serviceRequest.problem_description && { name: 'Problem Description', value: String(serviceRequest.problem_description) },
      ].filter(Boolean);

      // Additional features handling: accept array or JSON string
      let additionalFeatures = serviceRequest.additional_features;
      if (typeof additionalFeatures === 'string') {
        try { additionalFeatures = JSON.parse(additionalFeatures); } catch {}
      }
      if (Array.isArray(additionalFeatures) && additionalFeatures.length > 0) {
        const featuresList = additionalFeatures
          .filter((f) => f && (f.name || f.id))
          .map((f) => `• ${f.name || f.id}${f.price ? ` (+${f.price})` : ''}`)
          .join('\n');
        if (featuresList) fields.push({ name: 'Additional Features', value: featuresList, inline: false });
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`New Service Request — Ticket #${serviceRequest.id || 'N/A'}`)
        .addFields(fields.length ? fields : [{ name: 'Details', value: 'N/A' }])
        .setTimestamp();
      // Optional ping in main channel too
      const notifyRole = process.env.DISCORD_NOTIFY_ROLE_ID;
      const notifyUser = process.env.DISCORD_NOTIFY_USER_ID;
      if (notifyRole) await channel.send({ content: `<@&${notifyRole}>` });
      else if (notifyUser) await channel.send({ content: `<@${notifyUser}>` });
      await channel.send({ embeds: [embed] });
      logger.info('Discord notification sent successfully.');
    } else {
      logger.error('Could not find Discord channel.');
    }
  } catch (error) {
    logger.error('Error sending Discord notification:', error);
  }
}

async function postWebhook(payload) {
  try {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) return;
    if (typeof fetch !== 'function') {
      logger.warn('Global fetch not available; skipping webhook post');
      return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    logger.info('Posted payload to Discord webhook');
  } catch (err) {
    logger.error('Error posting to Discord webhook:', err);
  }
}

module.exports = {
  sendDiscordNotification,
  postWebhook,
  getDiscordClient,
  sendNtfy,
  createDiscordTicketChannel: async (payload) => {
    try {
      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) return null;
      const guild = await client.guilds.fetch(guildId);
      const ticketId = String(payload.service_request_id || payload.id || Date.now());
      const channel = await guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
      });
      // Optional ping to a user/role
      const notifyRole = process.env.DISCORD_NOTIFY_ROLE_ID;
      const notifyUser = process.env.DISCORD_NOTIFY_USER_ID;
      if (notifyRole) await channel.send({ content: `<@&${notifyRole}>` });
      else if (notifyUser) await channel.send({ content: `<@${notifyUser}>` });

      const fields = [
        payload.client_name && { name: 'Client Name', value: String(payload.client_name || 'N/A'), inline: true },
        payload.client_email && { name: 'Client Email', value: String(payload.client_email || 'N/A'), inline: true },
        payload.client_phone && { name: 'Phone', value: String(payload.client_phone || 'N/A'), inline: true },
        (payload.website_url || payload.user_website_url) && { name: 'Website URL', value: String(payload.website_url || payload.user_website_url), inline: true },
        payload.service_type && { name: 'Service Type', value: String(payload.service_type || 'N/A'), inline: true },
        payload.platform_type && { name: 'Platform', value: String(payload.platform_type || 'N/A'), inline: true },
        payload.urgency_level && { name: 'Urgency', value: String(payload.urgency_level || 'N/A'), inline: true },
        (payload.estimated_quote !== undefined && payload.estimated_quote !== null) && { name: 'Estimated Quote', value: String(payload.estimated_quote || 'N/A'), inline: true },
        payload.problem_description && { name: 'Problem Description', value: String(payload.problem_description || 'N/A') },
      ].filter(Boolean);

      // Add additional features if present
      if (payload.additional_features && Array.isArray(payload.additional_features) && payload.additional_features.length > 0) {
        const featuresList = payload.additional_features
          .filter(feature => feature && feature.name && feature.price)
          .map(feature => `• ${feature.name} (+${feature.price})`)
          .join('\n');
        if (featuresList) {
          fields.push({ name: 'Additional Features', value: featuresList, inline: false });
        }
      }


      const embed = new EmbedBuilder()
        .setColor('#2563EB')
        .setTitle(`New Service Request — Ticket #${ticketId}`)
        .addFields(fields.length ? fields : [{ name: 'Details', value: 'N/A' }])
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      return channel.id;
    } catch (e) {
      logger.error('createDiscordTicketChannel error', e);
      return null;
    }
  }
};
