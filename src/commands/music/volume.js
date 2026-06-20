const LeonexEmbed = require('../../utils/embedBuilder');
const MusicPlayer = require('../../utils/musicPlayer');

module.exports = {
  name: 'volume',
  description: 'Adjusts the music playback volume (0-100).',
  aliases: ['vol'],
  slashData: {
    name: 'volume',
    description: 'Adjusts the music playback volume',
    options: [
      {
        name: 'level',
        type: 4, // INTEGER
        description: 'Volume level (0-100)',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const queue = MusicPlayer.getQueue(message.guild.id);
    if (!queue) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('No Active Music', 'There is no music currently playing.')]
      });
    }

    const volumeInput = parseInt(args[0]);
    if (isNaN(volumeInput) || volumeInput < 0 || volumeInput > 100) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Invalid Level', 'Please specify a volume level between 0 and 100.')]
      });
    }

    MusicPlayer.setVolume(message.guild.id, volumeInput);
    message.channel.send({
      embeds: [LeonexEmbed.success('Volume Adjusted', `Volume has been set to **${volumeInput}%**.`)]
    });
  },

  async executeSlash(interaction, client) {
    const queue = MusicPlayer.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('No Active Music', 'There is no music currently playing.')],
        ephemeral: true
      });
    }

    const volumeInput = interaction.options.getInteger('level');
    if (volumeInput < 0 || volumeInput > 100) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Invalid Level', 'Please specify a volume level between 0 and 100.')],
        ephemeral: true
      });
    }

    MusicPlayer.setVolume(interaction.guild.id, volumeInput);
    await interaction.reply({
      embeds: [LeonexEmbed.success('Volume Adjusted', `Volume has been set to **${volumeInput}%**.`)]
    });
  }
};
