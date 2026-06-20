const Guild = require('../../models/Guild');
const Logger = require('../../utils/logger');
const Embeds = require('../../utils/embedBuilder');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const dbGuild = await Guild.findOne({ guildId: member.guild.id });
      if (!dbGuild) return;

      // 1. Alt Account Detection
      if (dbGuild.altDetection) {
        const accountAgeMs = Date.now() - member.user.createdTimestamp;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        
        if (accountAgeMs < sevenDaysMs) {
          // Log alert to mod logs channel
          if (dbGuild.modLogsChannelId) {
            const modChannel = member.guild.channels.cache.get(dbGuild.modLogsChannelId);
            if (modChannel) {
              const ageDays = (accountAgeMs / (24 * 60 * 60 * 1000)).toFixed(1);
              const altEmbed = Embeds.create({
                title: '⚠️ Security Alert: Alt Account Detected',
                description: `A member has joined whose account was created very recently.`,
                color: '#FAA61A',
                fields: [
                  { name: 'User Tag', value: `${member.user.tag}`, inline: true },
                  { name: 'User ID', value: `\`${member.id}\``, inline: true },
                  { name: 'Account Age', value: `**${ageDays}** days old`, inline: true }
                ]
              });
              await modChannel.send({ embeds: [altEmbed] }).catch(() => null);
            }
          }
        }
      }

      // 2. Welcomer Greeting Message
      if (dbGuild.welcomeEnabled && dbGuild.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(dbGuild.welcomeChannelId);
        if (channel) {
          // Parse dynamic variables
          let messageContent = dbGuild.welcomeMessage
            .replace(/{user}/g, `${member}`)
            .replace(/{username}/g, member.user.username)
            .replace(/{guild}/g, member.guild.name)
            .replace(/{member_count}/g, member.guild.memberCount);

          if (dbGuild.welcomeEmbed) {
            const welcomeEmbed = Embeds.create({
              title: '👋 Welcome to the Server!',
              description: messageContent,
              thumbnail: member.user.displayAvatarURL({ dynamic: true })
            });
            await channel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => null);
          } else {
            await channel.send({ content: messageContent }).catch(() => null);
          }
        }
      }
    } catch (error) {
      Logger.error(`Error in guildMemberAdd event for user ${member.id}:`, error.stack || error);
    }
  }
};
