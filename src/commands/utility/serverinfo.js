const LeonexEmbed = require('../../utils/embedBuilder');

module.exports = {
  name: 'serverinfo',
  description: 'Displays detailed server information.',
  aliases: ['guildinfo', 'server'],
  slashData: {
    name: 'serverinfo',
    description: 'Displays detailed server information'
  },
  async execute(message, args, client) {
    const guild = message.guild;
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;

    const embed = LeonexEmbed.create({
      title: `🌐 Server Info: ${guild.name}`,
      thumbnail: guild.iconURL({ dynamic: true }),
      fields: [
        { name: 'Owner 👑', value: `${owner.user.tag} (${owner.id})`, inline: true },
        { name: 'Server ID 🆔', value: `\`${guild.id}\``, inline: true },
        { name: 'Members Count 👥', value: `\`${guild.memberCount} members\``, inline: true },
        { name: 'Boosts 🚀', value: `\`Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boosts)\``, inline: true },
        { name: 'Channels 💬', value: `Total: \`${channels.size}\` (Text: \`${channels.filter(c => c.type === 0).size}\`, Voice: \`${channels.filter(c => c.type === 2).size}\`)`, inline: false }
      ]
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;

    const embed = LeonexEmbed.create({
      title: `🌐 Server Info: ${guild.name}`,
      thumbnail: guild.iconURL({ dynamic: true }),
      fields: [
        { name: 'Owner 👑', value: `${owner.user.tag} (${owner.id})`, inline: true },
        { name: 'Server ID 🆔', value: `\`${guild.id}\``, inline: true },
        { name: 'Members Count 👥', value: `\`${guild.memberCount} members\``, inline: true },
        { name: 'Boosts 🚀', value: `\`Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boosts)\``, inline: true },
        { name: 'Channels 💬', value: `Total: \`${channels.size}\` (Text: \`${channels.filter(c => c.type === 0).size}\`, Voice: \`${channels.filter(c => c.type === 2).size}\`)`, inline: false }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
