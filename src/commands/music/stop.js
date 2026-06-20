const LeonexEmbed = require('../../utils/embedBuilder');
const MusicPlayer = require('../../utils/musicPlayer');

module.exports = {
  name: 'stop',
  description: 'Stops the player and clears the queue.',
  aliases: ['disconnect', 'leave', 'dc'],
  slashData: {
    name: 'stop',
    description: 'Stops the player and clears the queue'
  },
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not in Voice', 'You need to be in a voice channel to use music commands.')]
      });
    }

    const stopped = MusicPlayer.stop(message.guild.id);
    if (stopped) {
      MusicPlayer.destroy(message.guild.id);
      message.channel.send({
        embeds: [LeonexEmbed.success('Stopped', 'Music stopped, queue cleared, and disconnected.')]
      });
    } else {
      message.channel.send({
        embeds: [LeonexEmbed.error('No Active Music', 'There is no music currently playing.')]
      });
    }
  },

  async executeSlash(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Not in Voice', 'You need to be in a voice channel to use music commands.')],
        ephemeral: true
      });
    }

    const stopped = MusicPlayer.stop(interaction.guild.id);
    if (stopped) {
      MusicPlayer.destroy(interaction.guild.id);
      await interaction.reply({
        embeds: [LeonexEmbed.success('Stopped', 'Music stopped, queue cleared, and disconnected.')]
      });
    } else {
      await interaction.reply({
        embeds: [LeonexEmbed.error('No Active Music', 'There is no music currently playing.')],
        ephemeral: true
      });
    }
  }
};
