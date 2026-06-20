const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '../events');
  
  if (!fs.existsSync(eventsPath)) {
    Logger.warn('Events folder does not exist, creating it.');
    fs.mkdirSync(eventsPath);
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  let eventCount = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);
      const eventName = file.split('.')[0];

      if (event.once) {
        client.once(eventName, (...args) => event.execute(...args, client));
      } else {
        client.on(eventName, (...args) => event.execute(...args, client));
      }

      eventCount++;
      Logger.event(`Loaded event: ${eventName}`);
    } catch (err) {
      Logger.error(`Failed to load event at ${file}`, err.stack);
    }
  }

  Logger.system(`Loaded ${eventCount} client events.`);
};
