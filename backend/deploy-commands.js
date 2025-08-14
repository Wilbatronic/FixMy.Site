require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('discord.js');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const commands = [
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage a support ticket')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket channel and archive it')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Change the status of the ticket')
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('The new status')
            .setRequired(true)
            .addChoices(
              { name: 'Open', value: 'open' },
              { name: 'In Progress', value: 'in-progress' },
               { name: 'Completed', value: 'completed' },
              { name: 'Resolved', value: 'resolved' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete the current ticket and its Discord channel (IRREVERSIBLE)')
        .addStringOption((option) =>
          option
            .setName('confirm')
            .setDescription('Type "DELETE" to confirm deletion')
            .setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('credential')
    .setDescription('Manage credentials for this ticket')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a credential for this ticket (stored securely)')
        .addStringOption((option) =>
          option
            .setName('for')
            .setDescription('What this credential is for (e.g., "WordPress Admin")')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('text')
            .setDescription('The secret text (e.g., username:password, API key, etc.)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List credentials linked to this ticket')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reveal')
        .setDescription('Reveal a stored credential (ephemeral reply)')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Credential ID to reveal')
            .setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('requests')
    .setDescription('Manage service requests')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all service requests')
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'New', value: 'new' },
              { name: 'In Progress', value: 'in-progress' },
              { name: 'Resolved', value: 'resolved' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View a specific service request')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('The ID of the service request')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('update')
        .setDescription('Update the status of a service request')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('The ID of the service request')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('The new status')
            .setRequired(true)
            .addChoices(
              { name: 'New', value: 'new' },
              { name: 'In Progress', value: 'in-progress' },
              { name: 'Resolved', value: 'resolved' }
            )
        )
    )
].map((command) => command.toJSON());

(async () => {
  try {
    const token = requireEnv('DISCORD_BOT_TOKEN');
    let applicationId = requireEnv('DISCORD_CLIENT_ID');
    const guildId = process.env.DISCORD_GUILD_ID; // Optional for global deploys

    const rest = new REST({ version: '10' }).setToken(token);

    async function putCommands(appId, maybeGuildId) {
      const route = maybeGuildId
        ? Routes.applicationGuildCommands(appId, maybeGuildId)
        : Routes.applicationCommands(appId);
      console.log(
        `Deploying ${commands.length} application (/) command(s) to ${maybeGuildId ? `guild ${maybeGuildId}` : 'global scope'}...`
      );
      await rest.put(route, { body: commands });
    }

    try {
      await putCommands(applicationId, guildId);
      console.log('Successfully deployed application (/) commands.');
      return;
    } catch (err) {
      // If Unknown Application, try resolving the application id from the token
      if (err && err.code === 10002) {
        console.warn('Received Unknown Application (10002). Verifying DISCORD_CLIENT_ID against the bot token...');
        const resp = await fetch('https://discord.com/api/v10/oauth2/applications/@me', {
          headers: { Authorization: `Bot ${token}` },
        });
        if (!resp.ok) {
          throw new Error(`Failed to fetch application via token: HTTP ${resp.status}`);
        }
        const app = await resp.json();
        const discoveredId = app.id;
        if (discoveredId && discoveredId !== applicationId) {
          console.warn(`DISCORD_CLIENT_ID (${applicationId}) does not match the application for this token (${discoveredId}). Retrying with ${discoveredId}.`);
          applicationId = discoveredId;
          try {
            await putCommands(applicationId, guildId);
            console.log('Successfully deployed application (/) commands after resolving application id from token.');
            console.warn('Action recommended: Update your backend/.env DISCORD_CLIENT_ID to match the discovered id above.');
            return;
          } catch (err2) {
            // If guild missing access, try global as a fallback
            if (err2 && (err2.code === 50001 || err2.code === 10004)) {
              console.warn('Missing Access to the guild or Unknown Guild. Deploying commands globally as a fallback.');
              await putCommands(applicationId, undefined);
              console.log('Successfully deployed application (/) commands globally. Note: Global propagation may take up to 1 hour.');
              return;
            }
            throw err2;
          }
        }
      }
      // If guild missing access, try global
      if (err && (err.code === 50001 || err.code === 10004)) {
        console.warn('Missing Access to the guild or Unknown Guild. Deploying commands globally as a fallback.');
        await putCommands(applicationId, undefined);
        console.log('Successfully deployed application (/) commands globally. Note: Global propagation may take up to 1 hour.');
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('Failed to deploy application (/) commands:', error);
    process.exitCode = 1;
  }
})();
