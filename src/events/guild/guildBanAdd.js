const { AuditLogEvent } = require('discord.js');
const SecurityService = require('../../services/securityService');
const Logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    if (!ban.guild) return;

    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      }).catch(() => null);

      if (!fetchedLogs) return;
      const banLog = fetchedLogs.entries.first();

      if (!banLog) return;
      const { executor, target } = banLog;

      if (target.id === ban.user.id && executor) {
        await SecurityService.trackAction(ban.guild, executor.id, 'ban');
      }
    } catch (error) {
      Logger.error(`Error in guildBanAdd anti-nuke event:`, error.stack || error);
    }
  }
};
