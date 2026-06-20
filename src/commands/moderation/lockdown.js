const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');

module.exports = {
  name: 'lockdown',
  description: 'Locks or unlocks the current channel for sending messages.',
  aliases: ['lock', 'unlock'],
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: {
    name: 'lockdown',
    description: 'Locks or unlocks the current channel permissions'
  },
  async execute(message, args, client) {
    const channel = message.channel;
    const everyoneRole = message.guild.roles.everyone;

    // Check if channel is currently locked
    const currentPermissions = channel.permissionsFor(everyoneRole);
    const isCurrentlyLocked = currentPermissions.has(PermissionFlagsBits.SendMessages) === false;

    if (isCurrentlyLocked) {
      // Unlock
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null
      });
      return message.channel.send({
        embeds: [LeonexEmbed.success('Channel Unlocked', 'This channel is now unlocked. Members can send messages.')]
      });
    } else {
      // Lock
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });
      return message.channel.send({
        embeds: [LeonexEmbed.warn('Channel Locked', 'This channel is now locked. Sending messages is disabled.')]
      });
    }
  },

  async executeSlash(interaction, client) {
    const channel = interaction.channel;
    const everyoneRole = interaction.guild.roles.everyone;

    const currentPermissions = channel.permissionsFor(everyoneRole);
    const isCurrentlyLocked = currentPermissions.has(PermissionFlagsBits.SendMessages) === false;

    if (isCurrentlyLocked) {
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null
      });
      return interaction.reply({
        embeds: [LeonexEmbed.success('Channel Unlocked', 'This channel is now unlocked.')]
      });
    } else {
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });
      return interaction.reply({
        embeds: [LeonexEmbed.warn('Channel Locked', 'This channel has been locked.')]
      });
    }
  }
};
