const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily currency rewards'),
  
  category: 'fun',
  
  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      let dbUser = await User.findOne({ userId, guildId });
      if (!dbUser) {
        dbUser = new User({ userId, guildId });
      }

      const now = new Date();
      const lastClaim = dbUser.lastDailyClaim ? new Date(dbUser.lastDailyClaim) : null;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (lastClaim && now.getTime() - lastClaim.getTime() < twentyFourHours) {
        const timeLeftMs = twentyFourHours - (now.getTime() - lastClaim.getTime());
        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return interaction.reply({
          embeds: [Embeds.warn(
            'Daily Already Claimed',
            `You've already claimed your daily reward today. Please try again in **${hours}h ${minutes}m**.`
          )]
        });
      }

      // Calculate streak (reset if last claim was more than 48 hours ago)
      let streak = dbUser.dailyStreak || 0;
      if (lastClaim && now.getTime() - lastClaim.getTime() > twentyFourHours * 2) {
        streak = 0; // Reset streak
      }

      streak += 1;
      dbUser.dailyStreak = streak;
      dbUser.lastDailyClaim = now;

      // Base reward 500, +50 per streak day (capped at 10 days bonus)
      const streakCap = Math.min(streak, 10);
      const reward = 500 + (streakCap - 1) * 50;
      dbUser.wallet += reward;

      await dbUser.save();

      const successEmbed = Embeds.success(
        'Daily Reward Claimed!',
        `You claimed your daily reward of **$${reward}** coins!\n\n🔥 **Current Streak:** \`${streak} days\`\n💼 **Wallet Balance:** \`$${dbUser.wallet}\``
      );

      await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      Logger.error(`Error claiming daily rewards:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to claim daily reward.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser) dbUser = new User({ userId: message.author.id, guildId: message.guild.id });

      const now = new Date();
      const lastClaim = dbUser.lastDailyClaim ? new Date(dbUser.lastDailyClaim) : null;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (lastClaim && now.getTime() - lastClaim.getTime() < twentyFourHours) {
        const timeLeftMs = twentyFourHours - (now.getTime() - lastClaim.getTime());
        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply({ embeds: [Embeds.warn('Daily Claimed', `Check back in **${hours}h ${minutes}m**.`)] });
      }

      let streak = dbUser.dailyStreak || 0;
      if (lastClaim && now.getTime() - lastClaim.getTime() > twentyFourHours * 2) streak = 0;

      streak += 1;
      dbUser.dailyStreak = streak;
      dbUser.lastDailyClaim = now;

      const reward = 500 + (Math.min(streak, 10) - 1) * 50;
      dbUser.wallet += reward;
      await dbUser.save();

      message.reply({
        embeds: [Embeds.success('Daily Reward Claimed!', `You claimed **$${reward}** coins! Streak: \`${streak}\` days.`)]
      });
    } catch (error) { Logger.error(error); }
  }
};
