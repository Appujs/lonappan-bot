const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} = require('@discordjs/voice');
const play = require('play-dl');
const Logger = require('./logger');
const LeonexEmbed = require('./embedBuilder');

const queues = new Map();

class MusicPlayer {
  static getQueue(guildId) {
    return queues.get(guildId);
  }

  static deleteQueue(guildId) {
    queues.delete(guildId);
  }

  static async search(query) {
    try {
      // Validate if input is already a direct link
      if (play.yt_validate(query) === 'video') {
        const info = await play.video_info(query);
        return [{
          title: info.video_details.title,
          url: info.video_details.url,
          duration: info.video_details.durationRaw,
          durationSec: info.video_details.durationInSec,
          thumbnail: info.video_details.thumbnails[0]?.url || ''
        }];
      } else if (play.yt_validate(query) === 'playlist') {
        const playlist = await play.playlist_info(query, { incomplete: true });
        const videos = await playlist.all_videos();
        return videos.map(video => ({
          title: video.title,
          url: video.url,
          duration: video.durationRaw,
          durationSec: video.durationInSec,
          thumbnail: video.thumbnails[0]?.url || ''
        }));
      }

      // Keyword search
      const searchResults = await play.search(query, { limit: 10, source: { youtube: 'video' } });
      return searchResults.map(video => ({
        title: video.title,
        url: video.url,
        duration: video.durationRaw,
        durationSec: video.durationInSec,
        thumbnail: video.thumbnails[0]?.url || ''
      }));
    } catch (err) {
      Logger.error(`Error during music search for query "${query}":`, err.stack);
      return [];
    }
  }

  static async connect(voiceChannel, textChannel) {
    const guildId = voiceChannel.guild.id;
    let queue = queues.get(guildId);

    if (!queue) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      const player = createAudioPlayer();
      queue = {
        textChannel,
        voiceChannel,
        connection,
        player,
        songs: [],
        volume: 75,
        playing: true,
        loop: false,
        timeoutId: null
      };

      queues.set(guildId, queue);
      connection.subscribe(player);

      // Event: Player becomes idle (song finished)
      player.on(AudioPlayerStatus.Idle, () => {
        this.playNext(guildId);
      });

      player.on('error', error => {
        Logger.error(`Audio player error in guild ${guildId}:`, error.stack);
        textChannel.send({
          embeds: [LeonexEmbed.error('Music Player Error', `An error occurred during playback: ${error.message}`)]
        });
        this.playNext(guildId);
      });

      // Event: Connection states (e.g. disconnected)
      connection.on(VoiceConnectionStatus.Disconnected, () => {
        Logger.info(`Voice connection disconnected in guild ${guildId}`);
        this.destroy(guildId);
      });
    }

    return queue;
  }

  static async play(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.songs.length === 0) {
      // Set an autodisconnect timer for 3 minutes of inactivity
      if (queue.timeoutId) clearTimeout(queue.timeoutId);
      queue.timeoutId = setTimeout(() => {
        this.destroy(guildId);
        queue.textChannel.send({
          embeds: [LeonexEmbed.info('Disconnected', 'Left voice channel due to inactivity.')]
        });
      }, 3 * 60 * 1000);
      return;
    }

    if (queue.timeoutId) {
      clearTimeout(queue.timeoutId);
      queue.timeoutId = null;
    }

    const song = queue.songs[0];
    
    try {
      const stream = await play.stream(song.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      
      resource.volume.setVolume(queue.volume / 100);
      queue.player.play(resource);
      
      // Update state
      queue.playing = true;

      // Send playing embed
      queue.textChannel.send({
        embeds: [
          LeonexEmbed.create({
            title: '🎶 Now Playing',
            description: `[${song.title}](${song.url})`,
            thumbnail: song.thumbnail,
            fields: [
              { name: 'Duration', value: song.duration || 'Unknown', inline: true },
              { name: 'Requested By', value: `<@${song.requestedBy}>`, inline: true }
            ]
          })
        ]
      });
    } catch (err) {
      Logger.error(`Failed to play song "${song.title}":`, err.stack);
      queue.textChannel.send({
        embeds: [LeonexEmbed.error('Playback Failed', `Could not play: **${song.title}**. Skipping...`)]
      });
      this.playNext(guildId);
    }
  }

  static playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.loop && queue.songs.length > 0) {
      // Loop: Move current song to the end
      const current = queue.songs.shift();
      queue.songs.push(current);
    } else {
      // Non-loop: Just remove the finished song
      queue.songs.shift();
    }

    this.play(guildId);
  }

  static skip(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return false;

    queue.player.stop();
    return true;
  }

  static stop(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return false;

    queue.songs = [];
    queue.player.stop();
    return true;
  }

  static setVolume(guildId, vol) {
    const queue = queues.get(guildId);
    if (!queue) return false;

    queue.volume = Math.max(0, Math.min(100, vol));
    if (queue.player.state.resource) {
      queue.player.state.resource.volume.setVolume(queue.volume / 100);
    }
    return true;
  }

  static toggleLoop(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return null;

    queue.loop = !queue.loop;
    return queue.loop;
  }

  static destroy(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.timeoutId) clearTimeout(queue.timeoutId);
    try {
      queue.connection.destroy();
    } catch (err) {
      // Ignore if already destroyed
    }
    queues.delete(guildId);
  }
}

module.exports = MusicPlayer;
