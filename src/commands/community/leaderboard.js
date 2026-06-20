const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'leaderboard',
  description: 'Displays the server XP leaderboard.',
  aliases: ['lb', 'levels'],
  slashData: {
    name: 'leaderboard',
    description: 'Displays the server XP leaderboard'
  },
  async execute(message, args, client) {
    const guildId = message.guild.id;

    // Get top 10 users by XP
    const topUsers = await User.find({ guildId }).sort({ xp: -1 }).limit(10);
    
    if (topUsers.length === 0) {
      return message.channel.send({
        embeds: [LeonexEmbed.info('Leaderboard Empty', 'No active members found on the leaderboard yet.')]
      });
    }

    let description = '';
    for (let i = 0; i < topUsers.length; i++) {
      const dbUser = topUsers[i];
      let user = client.users.cache.get(dbUser.userId);
      if (!user) {
        user = await client.users.fetch(dbUser.userId).catch(() => null);
      }

      const userTag = user ? `**${user.username}**` : `Unknown User (\`${dbUser.userId}\`)`;
      const position = i + 1;
      
      let medal = `${position}.`;
      if (position === 1) medal = '🥇';
      else if (position === 2) medal = '🥈';
      else if (position === 3) medal = '🥉';

      description += `${medal} ${userTag} - Level **${dbUser.level}** (${dbUser.xp} XP)\n`;
    }

    const embed = LeonexEmbed.create({
      title: `🏆 ${message.guild.name} XP Leaderboard`,
      description,
      footer: { text: `Requested by ${message.author.tag}` }
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const guildId = interaction.guild.id;

    const topUsers = await User.find({ guildId }).sort({ xp: -1 }).limit(10);
    
    if (topUsers.length === 0) {
      return interaction.reply({
        embeds: [LeonexEmbed.info('Leaderboard Empty', 'No active members found on the leaderboard yet.')]
      });
    }

    let description = '';
    for (let i = 0; i < topUsers.length; i++) {
      const dbUser = topUsers[i];
      let user = client.users.cache.get(dbUser.userId);
      if (!user) {
        user = await client.users.fetch(dbUser.userId).catch(() => null);
      }

      const userTag = user ? `**${user.username}**` : `Unknown User (\`${dbUser.userId}\`)`;
      const position = i + 1;
      
      let medal = `${position}.`;
      if (position === 1) medal = '🥇';
      else if (position === 2) medal = '🥈';
      else if (position === 3) medal = '🥉';

      description += `${medal} ${userTag} - Level **${dbUser.level}** (${dbUser.xp} XP)\n`;
    }

    const embed = LeonexEmbed.create({
      title: `🏆 ${interaction.guild.name} XP Leaderboard`,
      description,
      footer: { text: `Requested by ${interaction.user.tag}` }
    });

    await interaction.reply({ embeds: [embed] });
  }
};
