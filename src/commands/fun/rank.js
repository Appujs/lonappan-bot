const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Leveling = require('../../services/levelingService');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your leveling rank and progression progress')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The member to check')
        .setRequired(false)),
  
  category: 'fun',

  async execute(interaction, client) {
    const target = interaction.options.getUser('target') || interaction.user;

    try {
      const dbUser = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
      
      const xp = dbUser ? dbUser.xp : 0;
      const level = dbUser ? dbUser.level : 0;
      
      const xpNeeded = Leveling.getXPNeededForLevel(level);
      
      // Calculate progress percentage
      const progressPercent = Math.min((xp / xpNeeded) * 100, 100);
      const totalBlocks = 10;
      const filledBlocks = Math.round((progressPercent / 100) * totalBlocks);
      const emptyBlocks = totalBlocks - filledBlocks;
      
      const progressBar = '■'.repeat(filledBlocks) + '□'.repeat(emptyBlocks);

      // Find global position on server (rank position)
      const allUsers = await User.find({ guildId: interaction.guild.id });
      // Sort in memory by level desc, then xp desc
      allUsers.sort((a, b) => {
        if (b.level === a.level) return b.xp - a.xp;
        return b.level - a.level;
      });

      const positionIndex = allUsers.findIndex(u => u.userId === target.id);
      const rankPosition = positionIndex === -1 ? allUsers.length + 1 : positionIndex + 1;

      const rankEmbed = Embeds.create({
        title: `${target.username}'s Rank`,
        color: '#F1C40F', // Gold
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '⭐ Level', value: `\`Level ${level}\``, inline: true },
          { name: '🏆 Server Rank', value: `#${rankPosition}`, inline: true },
          { name: '✨ Experience (XP)', value: `\`${xp} / ${xpNeeded} XP\` (${progressPercent.toFixed(1)}%)`, inline: false },
          { name: '📊 Progression Bar', value: `\`[${progressBar}]\``, inline: false }
        ]
      });

      await interaction.reply({ embeds: [rankEmbed] });

    } catch (error) {
      Logger.error(`Error displaying rank for user ${target.id}:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to retrieve rank details.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    try {
      const dbUser = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });
      const xp = dbUser ? dbUser.xp : 0;
      const level = dbUser ? dbUser.level : 0;
      const xpNeeded = Leveling.getXPNeededForLevel(level);

      const allUsers = await User.find({ guildId: message.guild.id });
      allUsers.sort((a, b) => (b.level === a.level ? b.xp - a.xp : b.level - a.level));
      const pos = allUsers.findIndex(u => u.userId === targetUser.id) + 1;

      const filled = Math.round((xp / xpNeeded) * 10);
      const progress = '■'.repeat(filled) + '□'.repeat(10 - filled);

      message.reply({
        embeds: [Embeds.create({
          title: `${targetUser.username}'s Rank`,
          color: '#F1C40F',
          thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
          fields: [
            { name: '⭐ Level', value: `\`Level ${level}\``, inline: true },
            { name: '🏆 Rank', value: `#${pos || 'N/A'}`, inline: true },
            { name: '✨ XP', value: `\`${xp}/${xpNeeded}\``, inline: true },
            { name: 'Progress', value: `\`[${progress}]\``, inline: false }
          ]
        })]
      });
    } catch (error) { Logger.error(error); }
  }
};
