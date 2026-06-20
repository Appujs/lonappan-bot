const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK (Away From Keyboard)')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for being AFK')
        .setRequired(false)),
  
  category: 'fun',

  async execute(interaction, client) {
    const reason = interaction.options.getString('reason') || 'AFK';

    try {
      let dbUser = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!dbUser) {
        dbUser = new User({ userId: interaction.user.id, guildId: interaction.guild.id });
      }

      dbUser.isAfk = true;
      dbUser.afkMessage = reason;
      dbUser.afkTimestamp = new Date();
      await dbUser.save();

      // Attempt to modify member nickname to include [AFK] (optional, non-blocking)
      if (interaction.guild.members.me.permissions.has('ManageNicknames') && interaction.member.manageable) {
        const currentNick = interaction.member.displayName;
        if (!currentNick.startsWith('[AFK]')) {
          await interaction.member.setNickname(`[AFK] ${currentNick.substring(0, 25)}`).catch(() => null);
        }
      }

      const afkEmbed = Embeds.success(
        'AFK Mode Activated',
        `${interaction.user}, you are now AFK.\n**Reason:** ${reason}\n\n*Your AFK status will be automatically cleared when you type in the server.*`
      );

      await interaction.reply({ embeds: [afkEmbed] });

    } catch (error) {
      Logger.error(`Error setting AFK:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to update AFK status.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const reason = args.join(' ') || 'AFK';
    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser) dbUser = new User({ userId: message.author.id, guildId: message.guild.id });

      dbUser.isAfk = true;
      dbUser.afkMessage = reason;
      dbUser.afkTimestamp = new Date();
      await dbUser.save();

      if (message.guild.members.me.permissions.has('ManageNicknames') && message.member.manageable) {
        await message.member.setNickname(`[AFK] ${message.member.displayName.substring(0, 25)}`).catch(() => null);
      }

      message.reply({
        embeds: [Embeds.success('AFK Set', `${message.author} is now AFK: **${reason}**`)]
      });
    } catch (error) { Logger.error(error); }
  }
};
