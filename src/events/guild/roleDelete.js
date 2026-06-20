const { AuditLogEvent } = require('discord.js');
const SecurityService = require('../../services/securityService');
const Logger = require('../../utils/logger');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role.guild) return;

    try {
      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleDelete,
      }).catch(() => null);

      if (!fetchedLogs) return;
      const deletionLog = fetchedLogs.entries.first();

      if (!deletionLog) return;
      const { executor, target } = deletionLog;

      if (target.id === role.id && executor) {
        await SecurityService.trackAction(role.guild, executor.id, 'roleDelete');
      }
    } catch (error) {
      Logger.error(`Error in roleDelete anti-nuke event:`, error.stack || error);
    }
  }
};
