const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Logger = require('./src/utils/logger');

const slashCommands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

// Recursively load all slash command data from command folders
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command.slashData) {
      slashCommands.push(command.slashData);
      Logger.command(`Queued slash command: ${command.slashData.name}`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  Logger.system(`Deploying ${slashCommands.length} slash commands...`);

  try {
    // To deploy to a specific guild ONLY (instant refresh during dev), uncomment:
    // const GUILD_ID = 'YOUR_GUILD_ID';
    // await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID), { body: slashCommands });

    // Global deployment (takes up to 1 hour to propagate)
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: slashCommands }
    );

    Logger.system(`✅ Successfully deployed ${slashCommands.length} slash commands globally!`);
  } catch (err) {
    Logger.error('Failed to deploy slash commands:', err.stack);
  }
}

deploy();
