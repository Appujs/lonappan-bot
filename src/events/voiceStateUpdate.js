const Guild = require('../models/Guild');
const User = require('../models/User');
const Logger = require('../utils/logger');
const MusicPlayer = require('../utils/musicPlayer');
const config = require('../../config');

module.exports = {
  once: false,
  async execute(oldState, newState, client) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guildId = member.guild.id;

    try {
      const guildSettings = await Guild.findOne({ guildId });
      if (!guildSettings) return;

      // ==========================================
      // 1. JOIN TO CREATE VC SYSTEM
      // ==========================================
      const joinToCreateId = guildSettings.tempVoiceChannelId;
      const categoryId = guildSettings.tempVoiceCategoryId;

      // User joins the "Join to Create" channel
      if (newState.channelId === joinToCreateId) {
        const parentCategory = categoryId ? newState.guild.channels.cache.get(categoryId) : null;
        
        const tempChannel = await newState.guild.channels.create({
          name: `🔊 ${member.user.username}'s Lounge`,
          type: 2, // GuildVoice
          parent: parentCategory || null,
          permissionOverwrites: [
            {
              id: member.id,
              allow: ['ManageChannels', 'MuteMembers', 'DeafenMembers', 'MoveMembers']
            }
          ]
        });

        // Track dynamically
        if (!client.tempVoiceRooms) client.tempVoiceRooms = [];
        client.tempVoiceRooms.push(tempChannel.id);

        // Move member to the new room
        await newState.setChannel(tempChannel).catch(() => {});
      }

      // User leaves any voice channel
      if (oldState.channelId) {
        const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
        
        if (oldChannel && oldChannel.type === 2) {
          // If it was a dynamic room and is now empty
          const isTempRoom = client.tempVoiceRooms && client.tempVoiceRooms.includes(oldChannel.id);
          const isCategoryRoom = categoryId && oldChannel.parentId === categoryId && oldChannel.id !== joinToCreateId;
          
          if ((isTempRoom || isCategoryRoom) && oldChannel.members.size === 0) {
            await oldChannel.delete('Temporary channel empty.').catch(() => {});
            if (client.tempVoiceRooms) {
              client.tempVoiceRooms = client.tempVoiceRooms.filter(id => id !== oldChannel.id);
            }
          }
        }
      }

      // ==========================================
      // 2. VOICE LEVELING XP TRACKING
      // ==========================================
      if (guildSettings.levelingEnabled) {
        let userSettings = await User.findOne({ userId: member.id, guildId });
        if (!userSettings) {
          userSettings = await User.create({ userId: member.id, guildId });
        }

        // User joined a voice channel (and wasn't in one before, or switched to non-afk)
        if (!oldState.channelId && newState.channelId) {
          userSettings.voiceJoinedTimestamp = new Date();
          await userSettings.save();
        } 
        // User left voice channel entirely
        else if (oldState.channelId && !newState.channelId) {
          if (userSettings.voiceJoinedTimestamp) {
            const joinedTime = new Date(userSettings.voiceJoinedTimestamp).getTime();
            const now = Date.now();
            const elapsedMs = now - joinedTime;
            const elapsedMins = Math.floor(elapsedMs / (60 * 1000));

            if (elapsedMins > 0) {
              const xpGained = elapsedMins * (config.defaults.voiceXPRate || 10);
              userSettings.xp += xpGained;
              
              const newLevel = Math.floor(Math.sqrt(userSettings.xp / 100));
              if (newLevel > userSettings.level) {
                userSettings.level = newLevel;
                // Note: Optionally send level-up alert here or keep it silent for voice
              }
            }
            userSettings.voiceJoinedTimestamp = null;
            await userSettings.save();
          }
        }
      }

      // ==========================================
      // 3. MUSIC AUTO-DISCONNECT SYSTEM
      // ==========================================
      const queue = MusicPlayer.getQueue(guildId);
      if (queue && queue.connection) {
        const botVoiceChannel = newState.guild.members.me.voice.channel;
        if (botVoiceChannel) {
          // If bot is left alone (members count is 1, i.e., only bot)
          const realMembers = botVoiceChannel.members.filter(m => !m.user.bot);
          if (realMembers.size === 0) {
            // Wait 10 seconds before checking and disconnecting, to avoid accidental disconnects
            setTimeout(() => {
              const checkQueue = MusicPlayer.getQueue(guildId);
              if (checkQueue && checkQueue.connection) {
                const currentChan = newState.guild.members.me.voice.channel;
                if (currentChan) {
                  const checkMembers = currentChan.members.filter(m => !m.user.bot);
                  if (checkMembers.size === 0) {
                    MusicPlayer.destroy(guildId);
                    queue.textChannel.send({
                      embeds: [
                        LeonexEmbed.info(
                          'Disconnected',
                          'Left voice channel because everyone else left.'
                        )
                      ]
                    });
                  }
                }
              }
            }, 10 * 1000);
          }
        }
      }

    } catch (err) {
      Logger.error('Error handling voiceStateUpdate event:', err.stack);
    }
  }
};
