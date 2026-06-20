const { 
  ChannelType, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const Ticket = require('../../models/Ticket');
const Guild = require('../../models/Guild');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  /**
   * Handle dropdown category selection
   */
  async handleSelectMenu(interaction, client) {
    const category = interaction.values[0]; // support, report, partnership, purchase, staff
    
    // Setup Modal
    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${category}`)
      .setTitle(`Create Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`);

    const topicInput = new TextInputBuilder()
      .setCustomId('ticket_topic')
      .setLabel('Brief Topic / Reason')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the main reason for your ticket...')
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Detailed Explanation')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Provide as much detail as possible to help our team...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(topicInput),
      new ActionRowBuilder().addComponents(descInput)
    );

    await interaction.showModal(modal);
  },

  /**
   * Handle Modal Submissions (Creates the Ticket Channel)
   */
  async handleModalSubmit(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    
    const category = interaction.customId.split('_')[2]; // support, report, etc.
    const topic = interaction.fields.getTextInputValue('ticket_topic');
    const description = interaction.fields.getTextInputValue('ticket_description');

    try {
      const dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      if (!dbGuild) {
        return interaction.editReply({ embeds: [Embeds.error('Error', 'Guild configuration database missing.')] });
      }

      // Check if ticket limit reached
      const activeTickets = await Ticket.countDocuments({ guildId: interaction.guild.id, userId: interaction.user.id, status: { $ne: 'closed' } });
      if (activeTickets >= 2) {
        return interaction.editReply({
          embeds: [Embeds.warn('Ticket Limit', 'You already have 2 active tickets open. Please close existing tickets before opening a new one.')]
        });
      }

      dbGuild.ticketCounter = (dbGuild.ticketCounter || 0) + 1;
      await dbGuild.save();

      const ticketNum = dbGuild.ticketCounter;
      const channelName = `ticket-${category}-${interaction.user.username.substring(0, 10)}`;

      // Setup Permission Overwrites
      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles
          ]
        }
      ];

      // Add staff role permissions if configured
      if (dbGuild.ticketStaffRoleId) {
        permissionOverwrites.push({
          id: dbGuild.ticketStaffRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles
          ]
        });
      }

      // Create Category folder reference if configured
      const parentId = dbGuild.ticketCategoryId || null;

      // Create channel
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentId,
        permissionOverwrites,
        reason: `Ticket #${ticketNum} created by ${interaction.user.tag}`
      });

      // Save to database
      const ticket = new Ticket({
        guildId: interaction.guild.id,
        channelId: channel.id,
        userId: interaction.user.id,
        ticketNumber: ticketNum,
        category,
        status: 'open'
      });
      await ticket.save();

      // Post panel embed in the ticket channel
      const panelEmbed = Embeds.create({
        title: `🎫 Ticket #${ticketNum} - ${category.toUpperCase()}`,
        description: `Welcome ${interaction.user}! Staff will assist you shortly.\n\n**Topic:** ${topic}\n**Description:** ${description}`,
        color: '#5865F2'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🙋‍♂️'),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('ticket_priority').setLabel('Priority').setStyle(ButtonStyle.Secondary).setEmoji('⚠️')
      );

      await channel.send({ content: `${interaction.user} | <@&${dbGuild.ticketStaffRoleId || ''}>`, embeds: [panelEmbed], components: [row] });

      await interaction.editReply({
        embeds: [Embeds.success('Ticket Opened', `Your ticket has been opened in ${channel}.`)]
      });

      // Log ticket creation
      if (dbGuild.ticketLogsChannelId) {
        const logChannel = interaction.guild.channels.cache.get(dbGuild.ticketLogsChannelId);
        if (logChannel) {
          const logEmbed = Embeds.create({
            title: '🎫 Ticket Created',
            color: '#57F287',
            fields: [
              { name: 'Ticket Number', value: `#${ticketNum}`, inline: true },
              { name: 'User', value: `${interaction.user.tag}`, inline: true },
              { name: 'Category', value: category, inline: true },
              { name: 'Channel', value: `${channel}`, inline: false }
            ]
          });
          await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error('Error creating ticket channel:', error.stack || error);
      await interaction.editReply({
        embeds: [Embeds.error('Error', 'Failed to generate ticket channel. Please contact administrators.')]
      });
    }
  },

  /**
   * Handle Ticket Button Actions
   */
  async handleButton(interaction, client) {
    const action = interaction.customId.split('_')[1]; // claim, close, priority, etc.

    try {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) {
        return interaction.reply({ content: 'No ticket data found for this channel.', ephemeral: true });
      }

      const dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      
      // Verify staff role permissions for button triggers (except creator can close)
      const isStaff = dbGuild.ticketStaffRoleId && interaction.member.roles.cache.has(dbGuild.ticketStaffRoleId);
      const isCreator = interaction.user.id === ticket.userId;

      if (!isStaff && !isCreator && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: 'Only support staff can perform this action.', ephemeral: true });
      }

      if (action === 'claim') {
        if (ticket.status === 'claimed') {
          return interaction.reply({ content: `This ticket has already been claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        ticket.claimedBy = interaction.user.id;
        ticket.status = 'claimed';
        await ticket.save();

        // Update permissions so only claiming staff and user can converse
        if (dbGuild.ticketStaffRoleId) {
          await interaction.channel.permissionOverwrites.edit(dbGuild.ticketStaffRoleId, {
            SendMessages: false // Lock other staff out of writing
          }).catch(() => null);
        }
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
          ViewChannel: true, SendMessages: true
        }).catch(() => null);

        const claimEmbed = Embeds.success('Ticket Claimed', `This ticket has been claimed by ${interaction.user}. They will be handling your request.`);
        await interaction.reply({ embeds: [claimEmbed] });

        // Log Claim
        if (dbGuild.ticketLogsChannelId) {
          const logChannel = interaction.guild.channels.cache.get(dbGuild.ticketLogsChannelId);
          if (logChannel) {
            const logEmbed = Embeds.create({
              title: '🙋‍♂️ Ticket Claimed',
              color: '#5865F2',
              fields: [
                { name: 'Ticket', value: `#${ticket.ticketNumber}`, inline: true },
                { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
                { name: 'Channel', value: `${interaction.channel}`, inline: false }
              ]
            });
            await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
          }
        }
      } 
      
      else if (action === 'close') {
        await interaction.reply({ content: '🔒 Closing ticket, generating transcript...', ephemeral: true });

        // 1. Fetch channel messages to create transcript
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let htmlTranscript = `
        <html>
          <head>
            <title>Leonex Transcript - Ticket #${ticket.ticketNumber}</title>
            <style>
              body { font-family: sans-serif; background-color: #36393f; color: #dcddde; padding: 20px; }
              .message { border-bottom: 1px solid #4f545c; padding: 10px 0; display: flex; }
              .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; }
              .content { flex-grow: 1; }
              .author { font-weight: bold; color: #fff; margin-bottom: 5px; }
              .time { font-size: 11px; color: #72767d; margin-left: 10px; }
              .text { line-height: 1.4; }
            </style>
          </head>
          <body>
            <h2>Leonex Transcript - Guild: ${interaction.guild.name}</h2>
            <h3>Ticket Category: ${ticket.category.toUpperCase()} | Ticket Number: #${ticket.ticketNumber}</h3>
        `;

        // Reverse to maintain chronologic order
        const msgArray = Array.from(messages.values()).reverse();
        for (const msg of msgArray) {
          if (msg.author.bot && msg.embeds.length > 0) continue; // Skip welcome bot embeds
          htmlTranscript += `
          <div class="message">
            <img class="avatar" src="${msg.author.displayAvatarURL({ forceStatic: true })}">
            <div class="content">
              <span class="author">${msg.author.tag}</span>
              <span class="time">${msg.createdAt.toUTCString()}</span>
              <div class="text">${msg.content}</div>
            </div>
          </div>
          `;
        }
        htmlTranscript += `</body></html>`;

        ticket.status = 'closed';
        ticket.closedBy = interaction.user.id;
        ticket.closedAt = new Date();
        await ticket.save();

        // 2. Deliver transcript to creator via DM
        const creator = await client.users.fetch(ticket.userId).catch(() => null);
        const transcriptAttachment = Buffer.from(htmlTranscript, 'utf-8');
        
        if (creator) {
          await creator.send({
            embeds: [Embeds.info(
              'Ticket Closed',
              `Your ticket **#${ticket.ticketNumber}** in **${interaction.guild.name}** has been closed. Find your text transcript attached.`
            )],
            files: [{ attachment: transcriptAttachment, name: `transcript-ticket-${ticket.ticketNumber}.html` }]
          }).catch(() => null);
        }

        // 3. Post to Ticket log channel
        if (dbGuild.ticketLogsChannelId) {
          const logChannel = interaction.guild.channels.cache.get(dbGuild.ticketLogsChannelId);
          if (logChannel) {
            const logEmbed = Embeds.create({
              title: '🔒 Ticket Closed',
              color: '#ED4245',
              fields: [
                { name: 'Ticket Number', value: `#${ticket.ticketNumber}`, inline: true },
                { name: 'Closed By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Created By', value: `<@${ticket.userId}>`, inline: true }
              ]
            });
            await logChannel.send({ 
              embeds: [logEmbed],
              files: [{ attachment: transcriptAttachment, name: `transcript-ticket-${ticket.ticketNumber}.html` }]
            }).catch(() => null);
          }
        }

        // Delete channel
        setTimeout(async () => {
          await interaction.channel.delete().catch(() => null);
        }, 5000);
      } 
      
      else if (action === 'priority') {
        // Toggle Priority cycle: medium -> high -> low -> medium
        let newPriority = 'medium';
        if (ticket.priority === 'medium') newPriority = 'high';
        else if (ticket.priority === 'high') newPriority = 'low';

        ticket.priority = newPriority;
        await ticket.save();

        const priorityEmoji = newPriority === 'high' ? '🔴 HIGH' : newPriority === 'medium' ? '🟡 MEDIUM' : '🟢 LOW';
        await interaction.reply({
          content: `Priority updated to: **${priorityEmoji}**`,
          ephemeral: true
        });

        // Edit original panel embed if present
        const origMessage = interaction.message;
        if (origMessage && origMessage.embeds.length > 0) {
          const embedData = origMessage.embeds[0];
          const updatedEmbed = Embeds.create({
            title: embedData.title,
            description: embedData.description + `\n\n**Priority Status:** ${priorityEmoji}`,
            color: embedData.color
          });
          await origMessage.edit({ embeds: [updatedEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error('Error handling ticket button action:', error.stack || error);
    }
  }
};
