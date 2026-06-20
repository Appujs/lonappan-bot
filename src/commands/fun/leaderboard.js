const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show server rankings for Leveling or Economy')
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Leaderboard type')
        .setRequired(true)
        .addChoices(
          { name: '⭐ Leveling & XP', value: 'leveling' },
          { name: '💰 Economy Balance', value: 'economy' }
        )),
  
  category: 'fun',

  async execute(interaction, client) {
    const type = interaction.options.getString('type');

    await interaction.deferReply();

    try {
      const allUsers = await User.find({ guildId: interaction.guild.id });
      
      if (allUsers.length === 0) {
        return interaction.editReply({
          embeds: [Embeds.warn('Leaderboard Empty', 'No user statistics found for this server.')]
        });
      }

      let description = '';
      
      if (type === 'leveling') {
        // Sort by level desc, then xp desc
        allUsers.sort((a, b) => {
          if (b.level === a.level) return b.xp - a.xp;
          return b.level - a.level;
        });

        const top10 = allUsers.slice(0, 10);
        description = await Promise.all(top10.map(async (u, idx) => {
          const userObj = await client.users.fetch(u.userId).catch(() => null);
          const name = userObj ? userObj.username : `User (${u.userId})`;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
          return `${medal} **${name}** - Level **${u.level}** (XP: \`${u.xp}\`)`;
        })).then(lines => lines.join('\n'));

        const embed = Embeds.create({
          title: '⭐ Leveling Leaderboard',
          description: description || 'No entries yet.',
          color: '#F1C40F' // Gold
        });
        
        await interaction.editReply({ embeds: [embed] });

      } else {
        // Sort by wallet + bank desc
        allUsers.sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank));

        const top10 = allUsers.slice(0, 10);
        description = await Promise.all(top10.map(async (u, idx) => {
          const userObj = await client.users.fetch(u.userId).catch(() => null);
          const name = userObj ? userObj.username : `User (${u.userId})`;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
          return `${medal} **${name}** - **$${u.wallet + u.bank}** coins (Wallet: \`$${u.wallet}\` | Bank: \`$${u.bank}\`)`;
        })).then(lines => lines.join('\n'));

        const embed = Embeds.create({
          title: '💰 Economy Balance Leaderboard',
          description: description || 'No entries yet.',
          color: '#5865F2'
        });

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      Logger.error(`Error loading leaderboard:`, error.stack || error);
      await interaction.editReply({
        embeds: [Embeds.error('Error', 'Failed to retrieve leaderboard statistics.')]
      });
    }
  },

  async executePrefix(message, args, client) {
    const typeInput = args[0]?.toLowerCase();
    const type = typeInput === 'economy' ? 'economy' : 'leveling';

    try {
      const allUsers = await User.find({ guildId: message.guild.id });
      if (allUsers.length === 0) return message.reply('No users found.');

      if (type === 'leveling') {
        allUsers.sort((a, b) => (b.level === a.level ? b.xp - a.xp : b.level - a.level));
        const lines = await Promise.all(allUsers.slice(0, 10).map(async (u, idx) => {
          const userObj = await client.users.fetch(u.userId).catch(() => null);
          return `\`#${idx + 1}\` **${userObj ? userObj.username : u.userId}** - Lvl ${u.level}`;
        }));
        message.reply({
          embeds: [Embeds.create({ title: '⭐ Leveling Leaderboard', description: lines.join('\n'), color: '#F1C40F' })]
        });
      } else {
        allUsers.sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank));
        const lines = await Promise.all(allUsers.slice(0, 10).map(async (u, idx) => {
          const userObj = await client.users.fetch(u.userId).catch(() => null);
          return `\`#${idx + 1}\` **${userObj ? userObj.username : u.userId}** - $${u.wallet + u.bank}`;
        }));
        message.reply({
          embeds: [Embeds.create({ title: '💰 Economy Leaderboard', description: lines.join('\n'), color: '#5865F2' })]
        });
      }
    } catch (error) { Logger.error(error); }
  }
};
