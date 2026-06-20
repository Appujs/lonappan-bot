const { Collection, EmbedBuilder, InteractionType } = require('discord.js');
const Logger = require('../../utils/logger');
const Embeds = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [Embeds.error('Error', 'This command is no longer registered.')],
          ephemeral: true
        });
      }

      // Check User and Bot permissions
      if (interaction.guild) {
        // Fetch Guild Config to check emergency lockdown mode
        try {
          const dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
          if (dbGuild && dbGuild.emergencyLockdown && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
              embeds: [Embeds.error('Server Locked Down', 'The server is currently in emergency lockdown mode. Only administrators can use commands.')],
              ephemeral: true
            });
          }
        } catch (err) {
          Logger.error('Error checking lockdown state:', err);
        }

        // Check Bot Permissions
        if (command.botPermissions && command.botPermissions.length > 0) {
          const botPermissions = interaction.guild.members.me.permissionsIn(interaction.channel);
          const missing = command.botPermissions.filter(perm => !botPermissions.has(perm));
          if (missing.length > 0) {
            return interaction.reply({
              embeds: [Embeds.error('Missing Permissions', `I am missing the following permissions required for this command:\n\`${missing.join(', ')}\``)],
              ephemeral: true
            });
          }
        }

        // Check User Permissions
        if (command.userPermissions && command.userPermissions.length > 0) {
          const missing = command.userPermissions.filter(perm => !interaction.member.permissions.has(perm));
          if (missing.length > 0) {
            return interaction.reply({
              embeds: [Embeds.error('Access Denied', `You do not have the required permissions to use this command:\n\`${missing.join(', ')}\``)],
              ephemeral: true
            });
          }
        }
      }

      // Cooldown Checking
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownAmount = 3; // Default 3 seconds
      const cooldownAmount = (command.cooldown || defaultCooldownAmount) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            embeds: [Embeds.warn('Cooldown', `Please wait **${timeLeft.toFixed(1)}** more second(s) before reusing the \`/${command.data.name}\` command.`)],
            ephemeral: true
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (error) {
        Logger.error(`Error executing slash command ${command.data.name}:`, error.stack || error);
        
        const responsePayload = {
          embeds: [Embeds.error('Command Error', 'An unexpected error occurred while executing this command.')],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(responsePayload).catch(() => null);
        } else {
          await interaction.reply(responsePayload).catch(() => null);
        }
      }
    }
    
    // 2. Handle Button Interactions
    else if (interaction.isButton()) {
      try {
        // Ticket interactions routing
        if (interaction.customId.startsWith('ticket_')) {
          const ticketHandler = require('../tickets/ticketInteractionHandler');
          await ticketHandler.handleButton(interaction, client);
        }
        // Verification interaction routing
        else if (interaction.customId === 'verify_user') {
          const verificationHandler = require('../moderation/verificationHandler');
          await verificationHandler.handleButton(interaction, client);
        }
        // Music button interactions routing
        else if (interaction.customId.startsWith('music_')) {
          const musicHandler = require('../voice/musicButtonHandler');
          await musicHandler.handleButton(interaction, client);
        }
      } catch (error) {
        Logger.error(`Error in button interaction ${interaction.customId}:`, error.stack || error);
        await interaction.reply({
          content: 'An error occurred while handling this button interaction.',
          ephemeral: true
        }).catch(() => null);
      }
    }

    // 3. Handle Select Menu / Dropdown Interactions
    else if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === 'ticket_category_select') {
          const ticketHandler = require('../tickets/ticketInteractionHandler');
          await ticketHandler.handleSelectMenu(interaction, client);
        }
      } catch (error) {
        Logger.error(`Error in select menu interaction ${interaction.customId}:`, error.stack || error);
        await interaction.reply({
          content: 'An error occurred while handling this selection.',
          ephemeral: true
        }).catch(() => null);
      }
    }

    // 4. Handle Modal Submission Interactions
    else if (interaction.type === InteractionType.ModalSubmit) {
      try {
        if (interaction.customId.startsWith('ticket_modal_')) {
          const ticketHandler = require('../tickets/ticketInteractionHandler');
          await ticketHandler.handleModalSubmit(interaction, client);
        }
      } catch (error) {
        Logger.error(`Error in modal interaction ${interaction.customId}:`, error.stack || error);
        await interaction.reply({
          content: 'An error occurred while processing your modal submission.',
          ephemeral: true
        }).catch(() => null);
      }
    }
  }
};
