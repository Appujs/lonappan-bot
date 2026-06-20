const LeonexEmbed = require('../../utils/embedBuilder');
const MusicPlayer = require('../../utils/musicPlayer');

module.exports = {
  name: 'skip',
  description: 'Skips the currently playing song.',
  aliases: ['s', 'next'],
  slashData: {
    name: 'skip',
    description: 'Skips the current song'
  },
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not in Voice', 'You need to be in a voice channel to use music commands.')]
      });
    }

    const skipped = MusicPlayer.skip(message.guild.id);
    if (skipped) {
      message.channel.send({
        embeds: [LeonexEmbed.success('Skipped', 'Skipped the current song.')]
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

    const skipped = MusicPlayer.skip(interaction.guild.id);
    if (skipped) {
      await interaction.reply({
        embeds: [LeonexEmbed.success('Skipped', 'Skipped the current song.')]
      });
    } else {
      await interaction.reply({
        embeds: [LeonexEmbed.error('No Active Music', 'There is no music currently playing.')],
        ephemeral: true
      });
    }
  }
};
