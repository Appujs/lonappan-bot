const { ActivityType } = require('discord.js');
const Logger = require('../../utils/logger');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    Logger.system(`${client.user.tag} is online and operational!`);

    // Activity rotation
    const activities = [
      () => ({ name: 'Leonex Official | /help', type: ActivityType.Playing }),
      () => ({ name: `over ${client.guilds.cache.size} servers`, type: ActivityType.Watching }),
      () => ({ name: `with ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users`, type: ActivityType.Playing }),
      () => ({ name: 'Developed by Akhilesh', type: ActivityType.Listening })
    ];

    let i = 0;
    setInterval(() => {
      const activityFunc = activities[i];
      if (activityFunc) {
        client.user.setActivity(activityFunc());
      }
      i = (i + 1) % activities.length;
    }, 15000); // Rotates every 15 seconds

    // DB Initialization: Check and create configurations for joined guilds
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        let dbGuild = await Guild.findOne({ guildId });
        if (!dbGuild) {
          dbGuild = new Guild({ guildId });
          await dbGuild.save();
          Logger.db(`Initialized settings schema for guild: ${guild.name} (${guildId})`);
        }
      } catch (err) {
        Logger.error(`Error initializing guild settings for ${guildId}:`, err);
      }
    }
  }
};
