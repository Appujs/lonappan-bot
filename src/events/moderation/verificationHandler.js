const Guild = require('../../models/Guild');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  async handleButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      
      if (!dbGuild || !dbGuild.verificationEnabled || !dbGuild.verificationRoleId) {
        return interaction.editReply({
          embeds: [Embeds.error('Error', 'Verification system is currently disabled or unconfigured on this server.')]
        });
      }

      const role = interaction.guild.roles.cache.get(dbGuild.verificationRoleId);
      if (!role) {
        return interaction.editReply({
          embeds: [Embeds.error('Error', 'The configured verification role was not found in this server. Please alert an administrator.')]
        });
      }

      // Check if user already has the role
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.editReply({
          embeds: [Embeds.warn('Already Verified', 'You are already verified in this server!')]
        });
      }

      // Add verification role
      await interaction.member.roles.add(role);

      await interaction.editReply({
        embeds: [Embeds.success('Verified!', 'You have successfully verified and gained access to the server!')]
      });

      // Log verification to mod logs
      if (dbGuild.modLogsChannelId) {
        const modChannel = interaction.guild.channels.cache.get(dbGuild.modLogsChannelId);
        if (modChannel) {
          const logEmbed = Embeds.create({
            title: '✅ Member Verified',
            color: '#57F287',
            fields: [
              { name: 'User Tag', value: `${interaction.user.tag}`, inline: true },
              { name: 'User ID', value: `\`${interaction.user.id}\``, inline: true }
            ]
          });
          await modChannel.send({ embeds: [logEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error(`Error in verification button handler:`, error.stack || error);
      await interaction.editReply({
        embeds: [Embeds.error('Error', 'Failed to grant verification role. Check bot role permissions hierarchy.')]
      });
    }
  }
};
