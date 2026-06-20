const Guild = require('../../models/Guild');
const Logger = require('../../utils/logger');
const Embeds = require('../../utils/embedBuilder');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const dbGuild = await Guild.findOne({ guildId: member.guild.id });
      if (!dbGuild || !dbGuild.goodbyeEnabled || !dbGuild.goodbyeChannelId) return;

      const channel = member.guild.channels.cache.get(dbGuild.goodbyeChannelId);
      if (channel) {
        // Parse dynamic variables
        let messageContent = dbGuild.goodbyeMessage
          .replace(/{user}/g, `${member.user.tag}`)
          .replace(/{username}/g, member.user.username)
          .replace(/{guild}/g, member.guild.name)
          .replace(/{member_count}/g, member.guild.memberCount);

        if (dbGuild.goodbyeEmbed) {
          const goodbyeEmbed = Embeds.create({
            title: '💔 Member Left',
            description: messageContent,
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            color: '#ED4245'
          });
          await channel.send({ embeds: [goodbyeEmbed] }).catch(() => null);
        } else {
          await channel.send({ content: messageContent }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error(`Error in guildMemberRemove event for user ${member.id}:`, error.stack || error);
    }
  }
};
