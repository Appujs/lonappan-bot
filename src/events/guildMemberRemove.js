const Guild = require('../models/Guild');
const Logger = require('../utils/logger');
const LeonexEmbed = require('../utils/embedBuilder');

module.exports = {
  once: false,
  async execute(member, client) {
    const guildId = member.guild.id;

    try {
      const guildSettings = await Guild.findOne({ guildId });
      if (!guildSettings) return;

      if (guildSettings.goodbyeEnabled && guildSettings.goodbyeChannelId) {
        const goodbyeChannel = member.guild.channels.cache.get(guildSettings.goodbyeChannelId);
        
        if (goodbyeChannel) {
          // Parse placeholders
          let rawMsg = guildSettings.goodbyeMessage || '{username} has left the server.';
          rawMsg = rawMsg
            .replace(/{user}/g, `${member}`)
            .replace(/{username}/g, member.user.username)
            .replace(/{guild}/g, member.guild.name)
            .replace(/{member_count}/g, member.guild.memberCount);

          if (guildSettings.goodbyeEmbed) {
            const embed = LeonexEmbed.create({
              title: `🚪 Member Left`,
              description: rawMsg,
              thumbnail: member.user.displayAvatarURL({ dynamic: true }),
              footer: { text: `Remaining: ${member.guild.memberCount}` }
            });
            goodbyeChannel.send({ embeds: [embed] });
          } else {
            goodbyeChannel.send(rawMsg);
          }
        }
      }
    } catch (err) {
      Logger.error(`Error in guildMemberRemove event in guild ${guildId}:`, err.stack);
    }
  }
};
