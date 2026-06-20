const Guild = require('../models/Guild');
const Logger = require('../utils/logger');
const LeonexEmbed = require('../utils/embedBuilder');

module.exports = {
  once: false,
  async execute(member, client) {
    const guildId = member.guild.id;

    try {
      let guildSettings = await Guild.findOne({ guildId });
      if (!guildSettings) return;

      // ==========================================
      // 1. WELCOME MESSAGE SYSTEM
      // ==========================================
      if (guildSettings.welcomeEnabled && guildSettings.welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(guildSettings.welcomeChannelId);
        
        if (welcomeChannel) {
          // Parse place holders
          let rawMsg = guildSettings.welcomeMessage || 'Welcome {user} to {guild}!';
          rawMsg = rawMsg
            .replace(/{user}/g, `${member}`)
            .replace(/{username}/g, member.user.username)
            .replace(/{guild}/g, member.guild.name)
            .replace(/{member_count}/g, member.guild.memberCount);

          if (guildSettings.welcomeEmbed) {
            const embed = LeonexEmbed.create({
              title: `👋 Welcome to ${member.guild.name}!`,
              description: rawMsg,
              thumbnail: member.user.displayAvatarURL({ dynamic: true }),
              footer: { text: `Member #${member.guild.memberCount}` }
            });
            welcomeChannel.send({ embeds: [embed] });
          } else {
            welcomeChannel.send(rawMsg);
          }
        }
      }

      // ==========================================
      // 2. ALT DETECTION SYSTEM
      // ==========================================
      if (guildSettings.altDetection) {
        const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const thresholdDays = 7; // suspicious if less than 7 days old

        if (accountAgeDays < thresholdDays) {
          const logChannelId = guildSettings.modLogsChannelId || guildSettings.auditLogsChannelId;
          if (logChannelId) {
            const logChannel = member.guild.channels.cache.get(logChannelId);
            if (logChannel) {
              const alertEmbed = LeonexEmbed.warn(
                'Alt Account Flagged',
                `**User:** ${member} (${member.user.tag})\n**ID:** ${member.id}\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (${accountAgeDays} days ago)\n\n⚠️ *This account is less than ${thresholdDays} days old.*`
              );
              logChannel.send({ embeds: [alertEmbed] });
            }
          }
        }
      }

    } catch (err) {
      Logger.error(`Error in guildMemberAdd event in guild ${guildId}:`, err.stack);
    }
  }
};
