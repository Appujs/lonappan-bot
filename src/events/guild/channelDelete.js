const { AuditLogEvent } = require('discord.js');
const SecurityService = require('../../services/securityService');
const Logger = require('../../utils/logger');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;

    try {
      // Fetch latest audit logs for channel deletion
      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      }).catch(() => null);

      if (!fetchedLogs) return;
      const deletionLog = fetchedLogs.entries.first();

      if (!deletionLog) return;
      const { executor, target } = deletionLog;

      // Confirm deleted channel matches target in audit log
      if (target.id === channel.id && executor) {
        await SecurityService.trackAction(channel.guild, executor.id, 'channelDelete');
      }
    } catch (error) {
      Logger.error(`Error in channelDelete anti-nuke event:`, error.stack || error);
    }
  }
};
