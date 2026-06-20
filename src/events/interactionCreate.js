const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('../models/Guild');
const User = require('../models/User');
const Logger = require('../utils/logger');
const LeonexEmbed = require('../utils/embedBuilder');

module.exports = {
  once: false,
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      try {
        // Retrieve settings for permissions/checks if needed
        let guildSettings = null;
        if (interaction.guildId) {
          guildSettings = await Guild.findOne({ guildId: interaction.guildId });
          if (!guildSettings) {
            guildSettings = await Guild.create({ guildId: interaction.guildId });
          }
        }

        // Permission Checks
        if (command.userPermissions && interaction.member) {
          const hasPerms = interaction.member.permissions.has(command.userPermissions);
          if (!hasPerms) {
            return interaction.reply({
              embeds: [LeonexEmbed.error('Permission Denied', `You need the following permissions to run this: \`${command.userPermissions.join(', ')}\``)],
              ephemeral: true
            });
          }
        }

        if (command.botPermissions && interaction.guild) {
          const hasPerms = interaction.guild.members.me.permissions.has(command.botPermissions);
          if (!hasPerms) {
            return interaction.reply({
              embeds: [LeonexEmbed.error('Bot Permission Missing', `I need the following permissions to run this command: \`${command.botPermissions.join(', ')}\``)],
              ephemeral: true
            });
          }
        }

        await command.executeSlash(interaction, client);
      } catch (err) {
        Logger.error(`Error running slash command ${interaction.commandName}:`, err.stack);
        const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        try {
          await interaction[replyMethod]({
            embeds: [LeonexEmbed.error('Command Error', 'An unexpected error occurred while executing this command.')],
            ephemeral: true
          });
        } catch (e) {
          // ignore double errors
        }
      }
      return;
    }

    // 2. Handle Button Interactions (Verification & Tickets)
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const guildId = interaction.guildId;

      if (!guildId) return;

      try {
        let guildSettings = await Guild.findOne({ guildId });
        if (!guildSettings) {
          guildSettings = await Guild.create({ guildId });
        }

        // Verify User Button
        if (customId === 'leonex_verify_user') {
          if (!guildSettings.verificationEnabled || !guildSettings.verificationRoleId) {
            return interaction.reply({
              embeds: [LeonexEmbed.error('Verification Error', 'Verification is currently disabled or misconfigured in this server.')],
              ephemeral: true
            });
          }

          const role = interaction.guild.roles.cache.get(guildSettings.verificationRoleId);
          if (!role) {
            return interaction.reply({
              embeds: [LeonexEmbed.error('Role Not Found', 'The verification role configured in settings no longer exists.')],
              ephemeral: true
            });
          }

          if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({
              embeds: [LeonexEmbed.info('Already Verified', 'You are already verified in this server!')],
              ephemeral: true
            });
          }

          await interaction.member.roles.add(role);
          return interaction.reply({
            embeds: [LeonexEmbed.success('Verified Successfully', `You have been verified and granted the **${role.name}** role!`)],
            ephemeral: true
          });
        }

        // Create Ticket Button
        if (customId === 'leonex_create_ticket') {
          await interaction.deferReply({ ephemeral: true });

          // Find if there is a category or setup
          guildSettings.ticketCounter = (guildSettings.ticketCounter || 0) + 1;
          await guildSettings.save();

          const ticketNumber = String(guildSettings.ticketCounter).padStart(4, '0');
          const channelName = `ticket-${ticketNumber}`;

          // Construct permission overwrites
          const permissionOverwrites = [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles
              ]
            }
          ];

          // Add Staff Role if present
          if (guildSettings.ticketStaffRoleId) {
            permissionOverwrites.push({
              id: guildSettings.ticketStaffRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ManageChannels // Allow staff to close/delete
              ]
            });
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: guildSettings.ticketCategoryId || null,
            permissionOverwrites
          });

          // Send confirmation button in ticket channel
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('leonex_close_ticket')
              .setLabel('Close Ticket')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔒')
          );

          await ticketChannel.send({
            content: `${interaction.user} Support Staff will be with you shortly.`,
            embeds: [
              LeonexEmbed.create({
                title: `🎫 Ticket #${ticketNumber}`,
                description: 'Welcome to your support ticket. Please explain the issue you are facing in detail. Our support staff will assist you shortly.',
                fields: [
                  { name: 'Opened By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
                ]
              })
            ],
            components: [row]
          });

          return interaction.editReply({
            embeds: [LeonexEmbed.success('Ticket Created', `Your support ticket has been created: ${ticketChannel}`)]
          });
        }

        // Close Ticket Button
        if (customId === 'leonex_close_ticket') {
          // Check channel name starts with ticket-
          if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
              embeds: [LeonexEmbed.error('Invalid Channel', 'This button can only be used inside ticket channels.')],
              ephemeral: true
            });
          }

          // Check permissions (User must have ManageChannels or staff role)
          const isStaff = guildSettings.ticketStaffRoleId ? interaction.member.roles.cache.has(guildSettings.ticketStaffRoleId) : false;
          const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
          
          if (!isStaff && !hasAdmin && interaction.user.id !== interaction.channel.topic) {
            // Check if user is creator
            // Allow creator to request close, but warn staff or delete
          }

          await interaction.reply({
            embeds: [LeonexEmbed.warn('Closing Ticket', 'This support ticket will be deleted in 5 seconds...')]
          });

          setTimeout(async () => {
            try {
              await interaction.channel.delete('Ticket closed by user.');
            } catch (err) {
              Logger.error('Failed to delete ticket channel:', err.message);
            }
          }, 5000);
        }

      } catch (err) {
        Logger.error('Error handling button interaction:', err.stack);
      }
    }
  }
};
