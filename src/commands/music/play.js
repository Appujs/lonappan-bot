const LeonexEmbed = require('../../utils/embedBuilder');
const MusicPlayer = require('../../utils/musicPlayer');

module.exports = {
  name: 'play',
  description: 'Plays music from YouTube in your voice channel.',
  aliases: ['p'],
  slashData: {
    name: 'play',
    description: 'Plays music in your voice channel',
    options: [
      {
        name: 'query',
        type: 3, // STRING
        description: 'Song name or URL to play',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not in Voice', 'You need to be in a voice channel to play music!')]
      });
    }

    const query = args.join(' ');
    if (!query) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please provide a song name or YouTube link.')]
      });
    }

    message.channel.sendTyping();

    const searchResults = await MusicPlayer.search(query);
    if (searchResults.length === 0) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('No Results', `No search results found for: **${query}**`)]
      });
    }

    const queue = await MusicPlayer.connect(voiceChannel, message.channel);
    
    // Add all found songs (supports playlists)
    for (const song of searchResults) {
      song.requestedBy = message.author.id;
      queue.songs.push(song);
    }

    if (searchResults.length > 1) {
      message.channel.send({
        embeds: [LeonexEmbed.success('Playlist Queued', `Added **${searchResults.length}** songs to the queue.`)]
      });
    } else {
      if (queue.songs.length > 1) {
        message.channel.send({
          embeds: [LeonexEmbed.success('Song Queued', `Queued **${searchResults[0].title}** at position **#${queue.songs.length - 1}**.`)]
        });
      }
    }

    if (queue.songs.length === searchResults.length) {
      await MusicPlayer.play(message.guild.id);
    }
  },

  async executeSlash(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Not in Voice', 'You need to be in a voice channel to play music!')],
        ephemeral: true
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    const searchResults = await MusicPlayer.search(query);
    if (searchResults.length === 0) {
      return interaction.editReply({
        embeds: [LeonexEmbed.error('No Results', `No search results found for: **${query}**`)]
      });
    }

    const queue = await MusicPlayer.connect(voiceChannel, interaction.channel);
    
    for (const song of searchResults) {
      song.requestedBy = interaction.user.id;
      queue.songs.push(song);
    }

    if (searchResults.length > 1) {
      await interaction.editReply({
        embeds: [LeonexEmbed.success('Playlist Queued', `Added **${searchResults.length}** songs to the queue.`)]
      });
    } else {
      if (queue.songs.length > 1) {
        await interaction.editReply({
          embeds: [LeonexEmbed.success('Song Queued', `Queued **${searchResults[0].title}** at position **#${queue.songs.length - 1}**.`)]
        });
      } else {
        await interaction.editReply({
          embeds: [LeonexEmbed.success('Playing', `Searching and preparing track...`)]
        });
      }
    }

    if (queue.songs.length === searchResults.length) {
      await MusicPlayer.play(interaction.guild.id);
    }
  }
};
