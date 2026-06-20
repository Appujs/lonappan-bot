const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'userinfo',
  description: 'Displays detailed information about a member.',
  aliases: ['whois', 'user'],
  slashData: {
    name: 'userinfo',
    description: 'Displays detailed information about a member',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to inspect',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(targetUser.id);
    const guildId = message.guild.id;

    // Fetch DB record
    const userSettings = await User.findOne({ userId: targetUser.id, guildId });
    const level = userSettings ? userSettings.level : 0;
    const warningsCount = userSettings ? userSettings.warnings.length : 0;

    const roles = member 
      ? member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ') || 'None' 
      : 'Not in Server';

    const embed = LeonexEmbed.create({
      title: `👤 User Information: ${targetUser.username}`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Username', value: `\`${targetUser.tag}\``, inline: true },
        { name: 'ID', value: `\`${targetUser.id}\``, inline: true },
        { name: 'Bot?', value: targetUser.bot ? 'Yes 🤖' : 'No 👤', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Not in Server', inline: true },
        { name: 'Level Rank', value: `\`Level ${level}\``, inline: true },
        { name: 'Total Warnings', value: `\`${warningsCount} warnings\``, inline: true },
        { name: 'Roles', value: roles }
      ]
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(targetUser.id);
    const guildId = interaction.guild.id;

    const userSettings = await User.findOne({ userId: targetUser.id, guildId });
    const level = userSettings ? userSettings.level : 0;
    const warningsCount = userSettings ? userSettings.warnings.length : 0;

    const roles = member 
      ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'None' 
      : 'Not in Server';

    const embed = LeonexEmbed.create({
      title: `👤 User Information: ${targetUser.username}`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Username', value: `\`${targetUser.tag}\``, inline: true },
        { name: 'ID', value: `\`${targetUser.id}\``, inline: true },
        { name: 'Bot?', value: targetUser.bot ? 'Yes 🤖' : 'No 👤', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Not in Server', inline: true },
        { name: 'Level Rank', value: `\`Level ${level}\``, inline: true },
        { name: 'Total Warnings', value: `\`${warningsCount} warnings\``, inline: true },
        { name: 'Roles', value: roles }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
