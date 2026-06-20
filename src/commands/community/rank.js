const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'rank',
  description: 'Displays your current XP rank and level.',
  aliases: ['level', 'xp'],
  slashData: {
    name: 'rank',
    description: 'Displays current XP rank and level',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to query (defaults to you)',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const guildId = message.guild.id;

    // Get user details from DB
    let userSettings = await User.findOne({ userId: targetUser.id, guildId });
    if (!userSettings) {
      userSettings = await User.create({ userId: targetUser.id, guildId });
    }

    // Determine ranking position
    const allUsers = await User.find({ guildId }).sort({ xp: -1 });
    const rank = allUsers.findIndex(u => u.userId === targetUser.id) + 1;

    const level = userSettings.level;
    const currentXP = userSettings.xp;
    
    // XP formulas: level = Math.floor(Math.sqrt(xp / 100))
    const currentBase = 100 * level * level;
    const nextBase = 100 * (level + 1) * (level + 1);
    
    const xpInLevel = currentXP - currentBase;
    const xpRequired = nextBase - currentBase;
    const progressPercent = Math.max(0, Math.min(100, Math.floor((xpInLevel / xpRequired) * 100)));

    // Generate graphical bar
    const totalBlocks = 10;
    const activeBlocks = Math.round(progressPercent / (100 / totalBlocks));
    const inactiveBlocks = totalBlocks - activeBlocks;
    const progressBar = '🟩'.repeat(activeBlocks) + '⬜'.repeat(inactiveBlocks);

    const embed = LeonexEmbed.create({
      title: `${targetUser.username}'s Rank Card`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Rank', value: `#${rank}`, inline: true },
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${currentXP} / ${nextBase} XP`, inline: true },
        { name: 'Level Progress', value: `${progressBar} (${progressPercent}%)` }
      ]
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    let userSettings = await User.findOne({ userId: targetUser.id, guildId });
    if (!userSettings) {
      userSettings = await User.create({ userId: targetUser.id, guildId });
    }

    const allUsers = await User.find({ guildId }).sort({ xp: -1 });
    const rank = allUsers.findIndex(u => u.userId === targetUser.id) + 1;

    const level = userSettings.level;
    const currentXP = userSettings.xp;
    
    const currentBase = 100 * level * level;
    const nextBase = 100 * (level + 1) * (level + 1);
    
    const xpInLevel = currentXP - currentBase;
    const xpRequired = nextBase - currentBase;
    const progressPercent = Math.max(0, Math.min(100, Math.floor((xpInLevel / xpRequired) * 100)));

    const totalBlocks = 10;
    const activeBlocks = Math.round(progressPercent / (100 / totalBlocks));
    const inactiveBlocks = totalBlocks - activeBlocks;
    const progressBar = '🟩'.repeat(activeBlocks) + '⬜'.repeat(inactiveBlocks);

    const embed = LeonexEmbed.create({
      title: `${targetUser.username}'s Rank Card`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Rank', value: `#${rank}`, inline: true },
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${currentXP} / ${nextBase} XP`, inline: true },
        { name: 'Level Progress', value: `${progressBar} (${progressPercent}%)` }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
