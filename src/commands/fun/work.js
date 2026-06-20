const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work a shift to earn some coins'),
  
  category: 'fun',
  cooldown: 30, // 30 seconds cooldown

  async execute(interaction, client) {
    try {
      let dbUser = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!dbUser) dbUser = new User({ userId: interaction.user.id, guildId: interaction.guild.id });

      const payout = Math.floor(Math.random() * 101) + 50; // $50 - $150
      
      const jobs = [
        `You worked as a Discord moderator and earned **$${payout}** after deleting 400 spam links.`,
        `You worked as a twitch streamer and earned **$${payout}** after a generous subscriber donation.`,
        `You worked as a software developer and earned **$${payout}** after fixing a critical memory leak.`,
        `You worked as a pizza delivery driver and earned **$${payout}** (including tips).`,
        `You worked as an assistant to Akhilesh and earned **$${payout}** for helping manage Leonex Official server.`
      ];

      const workMessage = jobs[Math.floor(Math.random() * jobs.length)];
      
      dbUser.wallet += payout;
      await dbUser.save();

      const successEmbed = Embeds.success('Shift Complete', `${workMessage}\n\n💼 Wallet: **$${dbUser.wallet}**`);
      await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      Logger.error(`Error in work command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to execute work command.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser) dbUser = new User({ userId: message.author.id, guildId: message.guild.id });

      const payout = Math.floor(Math.random() * 101) + 50;
      dbUser.wallet += payout;
      await dbUser.save();

      message.reply({
        embeds: [Embeds.success('Shift Complete', `You completed your shift and earned **$${payout}** coins!`)]
      });
    } catch (error) { Logger.error(error); }
  }
};
