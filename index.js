const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config');
const Logger = require('./src/utils/logger');
const loadCommands = require('./src/handlers/commandHandler');
const loadEvents = require('./src/handlers/eventHandler');
const dashboard = require('./src/dashboard/server');

// ─── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000
    });
    Logger.db('MongoDB connected successfully.');
  } catch (err) {
    Logger.error('MongoDB connection failed:', err.stack);
    Logger.warn('Bot will continue without database. Some features may be unavailable.');
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  Logger.system('╔════════════════════════════════════════╗');
  Logger.system('║         LEONEX BOT  —  Starting        ║');
  Logger.system('╚════════════════════════════════════════╝');

  // 1. Connect to database
  await connectDB();

  // 2. Load handlers
  loadCommands(client);
  loadEvents(client);

  // 3. Login to Discord
  if (!config.token || config.token === 'insert_bot_token_here') {
    Logger.error('DISCORD_TOKEN is not set in your .env file! Please add it before starting the bot.');
    process.exit(1);
  }

  await client.login(config.token);

  // 4. Start Express Dashboard
  dashboard.init(client);
}

// ─── Unhandled Rejection Safety Net ──────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  Logger.error('Unhandled Promise Rejection:', err.stack || err.message);
});

process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception:', err.stack || err.message);
});

main();
