const LeonexEmbed = require('../../utils/embedBuilder');
const MusicPlayer = require('../../utils/musicPlayer');

module.exports = {
  name: 'queue',
  description: 'Displays the current music queue.',
  aliases: ['q'],
  slashData: {
    name: 'queue',
    description: 'Displays the current music queue'
  },
  async execute(message, args, client) {
    const queue = MusicPlayer.getQueue(message.guild.id);
    if (!queue || queue.songs.length === 0) {
      return message.channel.send({
        embeds: [LeonexEmbed.info('Queue Empty', 'There are no songs in the queue.')]
      });
    }

    const currentSong = queue.songs[0];
    let queueList = `**Now Playing:** [${currentSong.title}](${currentSong.url}) | \`${currentSong.duration}\`\n\n`;

    if (queue.songs.length > 1) {
      queueList += `**Upcoming Songs:**\n`;
      // List next 10 songs
      const limit = Math.min(queue.songs.length, 11);
      for (let i = 1; i < limit; i++) {
        const song = queue.songs[i];
        queueList += `**${i}.** [${song.title}](${song.url}) | \`${song.duration}\` (Requested by: <@${song.requestedBy}>)\n`;
      }

      if (queue.songs.length > 11) {
        queueList += `\n*and ${queue.songs.length - 11} more tracks...*`;
      }
    }

    const embed = LeonexEmbed.create({
      title: '🎶 Server Music Queue',
      description: queueList,
      fields: [
        { name: 'Total Tracks', value: `${queue.songs.length}`, inline: true },
        { name: 'Loop Mode', value: queue.loop ? 'Enabled ✅' : 'Disabled ❌', inline: true },
        { name: 'Playback Volume', value: `${queue.volume}%`, inline: true }
      ]
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const queue = MusicPlayer.getQueue(interaction.guild.id);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [LeonexEmbed.info('Queue Empty', 'There are no songs in the queue.')],
        ephemeral: true
      });
    }

    const currentSong = queue.songs[0];
    let queueList = `**Now Playing:** [${currentSong.title}](${currentSong.url}) | \`${currentSong.duration}\`\n\n`;

    if (queue.songs.length > 1) {
      queueList += `**Upcoming Songs:**\n`;
      const limit = Math.min(queue.songs.length, 11);
      for (let i = 1; i < limit; i++) {
        const song = queue.songs[i];
        queueList += `**${i}.** [${song.title}](${song.url}) | \`${song.duration}\` (Requested by: <@${song.requestedBy}>)\n`;
      }

      if (queue.songs.length > 11) {
        queueList += `\n*and ${queue.songs.length - 11} more tracks...*`;
      }
    }

    const embed = LeonexEmbed.create({
      title: '🎶 Server Music Queue',
      description: queueList,
      fields: [
        { name: 'Total Tracks', value: `${queue.songs.length}`, inline: true },
        { name: 'Loop Mode', value: queue.loop ? 'Enabled ✅' : 'Disabled ❌', inline: true },
        { name: 'Playback Volume', value: `${queue.volume}%`, inline: true }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
