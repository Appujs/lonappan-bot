const { version } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const os = require('os');

module.exports = {
  name: 'stats',
  description: 'Displays the bot status and resource usage statistics.',
  aliases: ['botstats', 'info'],
  slashData: {
    name: 'stats',
    description: 'Displays the bot status statistics'
  },
  async execute(message, args, client) {
    const uptime = parseDuration(client.uptime);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = LeonexEmbed.create({
      title: '📊 Leonex Stats & Metrics',
      fields: [
        { name: 'Uptime ⏳', value: `\`${uptime}\``, inline: true },
        { name: 'Memory Heap Used 💾', value: `\`${memory} MB\``, inline: true },
        { name: 'Server Count 🌐', value: `\`${guilds} servers\``, inline: true },
        { name: 'User Count 👥', value: `\`${users} users\``, inline: true },
        { name: 'Discord.js Version 📦', value: `\`v${version}\``, inline: true },
        { name: 'Node.js Version 🟢', value: `\`${process.version}\``, inline: true },
        { name: 'OS Architecture 🖥️', value: `\`${os.platform()} (${os.arch()})\``, inline: true }
      ]
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const uptime = parseDuration(client.uptime);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = LeonexEmbed.create({
      title: '📊 Leonex Stats & Metrics',
      fields: [
        { name: 'Uptime ⏳', value: `\`${uptime}\``, inline: true },
        { name: 'Memory Heap Used 💾', value: `\`${memory} MB\``, inline: true },
        { name: 'Server Count 🌐', value: `\`${guilds} servers\``, inline: true },
        { name: 'User Count 👥', value: `\`${users} users\``, inline: true },
        { name: 'Discord.js Version 📦', value: `\`v${version}\``, inline: true },
        { name: 'Node.js Version 🟢', value: `\`${process.version}\``, inline: true },
        { name: 'OS Architecture 🖥️', value: `\`${os.platform()} (${os.arch()})\``, inline: true }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};

function parseDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
