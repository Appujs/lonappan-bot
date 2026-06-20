const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const Logger = require('../utils/logger');

module.exports = (client) => {
  client.commands = new Collection();
  client.aliases = new Collection();
  client.slashCommands = new Collection();

  const commandsPath = path.join(__dirname, '../commands');
  
  if (!fs.existsSync(commandsPath)) {
    Logger.warn('Commands folder does not exist, creating it.');
    fs.mkdirSync(commandsPath);
    return;
  }

  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);

        if (!command.name) {
          Logger.warn(`The command at ${file} is missing a required "name" property.`);
          continue;
        }

        // Add category attribute based on directory name
        command.category = folder;

        // Register prefix command
        client.commands.set(command.name, command);

        // Register aliases if any
        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            client.aliases.set(alias, command.name);
          }
        }

        // Register slash command data
        if (command.slashData) {
          client.slashCommands.set(command.name, command);
        }

        Logger.command(`Loaded command: ${folder}/${command.name}`);
      } catch (err) {
        Logger.error(`Failed to load command at ${file}`, err.stack);
      }
    }
  }

  Logger.system(`Loaded ${client.commands.size} prefix commands and ${client.slashCommands.size} slash commands.`);
};
