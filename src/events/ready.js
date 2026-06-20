const { ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const config = require('../../config');

module.exports = {
  once: true,
  execute(client) {
    Logger.system(`Logged in as ${client.user.tag}!`);
    
    // Set custom rich presence activity
    client.user.setPresence({
      activities: [{ 
        name: `${config.defaultPrefix}help | Leonex Premium`, 
        type: ActivityType.Listening 
      }],
      status: 'online'
    });

    Logger.system('Leonex Bot client status set to active.');
  }
};
