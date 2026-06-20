const LeonexEmbed = require('../../utils/embedBuilder');

module.exports = {
  name: 'ping',
  description: 'Displays the current bot latency and ping.',
  aliases: ['latency'],
  slashData: {
    name: 'ping',
    description: 'Displays the current bot latency'
  },
  async execute(message, args, client) {
    const sent = await message.channel.send({
      embeds: [LeonexEmbed.info('Pinging...', 'Calculating response latency...')]
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const wsPing = client.ws.ping;

    await sent.edit({
      embeds: [
        LeonexEmbed.create({
          title: '🏓 Pong!',
          fields: [
            { name: 'API Latency', value: `\`${latency}ms\``, inline: true },
            { name: 'WebSocket Ping', value: `\`${wsPing}ms\``, inline: true }
          ]
        })
      ]
    });
  },

  async executeSlash(interaction, client) {
    const sent = await interaction.reply({
      embeds: [LeonexEmbed.info('Pinging...', 'Calculating response latency...')],
      fetchReply: true
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    await interaction.editReply({
      embeds: [
        LeonexEmbed.create({
          title: '🏓 Pong!',
          fields: [
            { name: 'API Latency', value: `\`${latency}ms\``, inline: true },
            { name: 'WebSocket Ping', value: `\`${wsPing}ms\``, inline: true }
          ]
        })
      ]
    });
  }
};
