const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder 
} = require('discord.js');
const Guild = require('../../models/Guild');
const Ticket = require('../../models/Ticket');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');
const ticketHandler = require('../../events/tickets/ticketInteractionHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the Leonex Ticket System')
    .addSubcommand(subcommand =>
      subcommand.setName('setup')
        .setDescription('Create a ticket creation panel in the current channel')
        .addRoleOption(option => 
          option.setName('staff-role')
            .setDescription('Role permitted to access and manage support tickets')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('Category folder under which ticket channels are created')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('log-channel')
            .setDescription('Channel where ticket actions and transcripts are logged')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand.setName('close')
        .setDescription('Close the active support ticket'))
    .addSubcommand(subcommand =>
      subcommand.setName('claim')
        .setDescription('Claim ownership of the active ticket')),

  category: 'tickets',
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      let dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      if (!dbGuild) dbGuild = new Guild({ guildId: interaction.guild.id });

      // 1. Setup ticket panel command
      if (subcommand === 'setup') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({
            embeds: [Embeds.error('Access Denied', 'Only administrators can perform ticket configurations.')],
            ephemeral: true
          });
        }

        const staffRole = interaction.options.getRole('staff-role');
        const category = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('log-channel');

        dbGuild.ticketStaffRoleId = staffRole.id;
        dbGuild.ticketChannelId = interaction.channel.id;
        if (category) dbGuild.ticketCategoryId = category.id;
        if (logChannel) dbGuild.ticketLogsChannelId = logChannel.id;
        await dbGuild.save();

        const panelEmbed = Embeds.create({
          title: '🛠️ Server Support Center',
          description: 'Need assistance? Create a private support ticket using the menu below.\n\nSelect a category that best describes your request. A staff member will guide you.',
          color: '#5865F2'
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_category_select')
          .setPlaceholder('Choose a support category...')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('General Support').setDescription('Questions about server roles or features').setValue('support').setEmoji('🛠️'),
            new StringSelectMenuOptionBuilder().setLabel('Report User').setDescription('Report members violating guidelines').setValue('report').setEmoji('🚫'),
            new StringSelectMenuOptionBuilder().setLabel('Partnership Query').setDescription('Inquire about collaborating with our server').setValue('partnership').setEmoji('🤝'),
            new StringSelectMenuOptionBuilder().setLabel('Purchase Help').setDescription('Assistance with store purchases or nitro boosts').setValue('purchase').setEmoji('💰'),
            new StringSelectMenuOptionBuilder().setLabel('Staff Application').setDescription('Apply to join the server moderation team').setValue('staff').setEmoji('📝')
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.channel.send({ embeds: [panelEmbed], components: [row] });

        await interaction.reply({
          embeds: [Embeds.success('Ticket System Configured', 'Support panel spawned successfully.')],
          ephemeral: true
        });
      } 
      
      // 2. Close active ticket channel
      else if (subcommand === 'close') {
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (!ticket) {
          return interaction.reply({
            embeds: [Embeds.error('Error', 'This command can only be executed inside an active ticket channel.')],
            ephemeral: true
          });
        }
        
        // Let the button close system handle it to prevent duplication
        const mockInteraction = {
          customId: 'ticket_close',
          channel: interaction.channel,
          user: interaction.user,
          member: interaction.member,
          guild: interaction.guild,
          reply: async (payload) => interaction.reply(payload),
          editReply: async (payload) => interaction.editReply(payload),
          deferReply: async (payload) => interaction.deferReply(payload)
        };
        await ticketHandler.handleButton(mockInteraction, client);
      } 
      
      // 3. Claim active ticket channel
      else if (subcommand === 'claim') {
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (!ticket) {
          return interaction.reply({
            embeds: [Embeds.error('Error', 'This command must be run inside a ticket channel.')],
            ephemeral: true
          });
        }

        const mockInteraction = {
          customId: 'ticket_claim',
          channel: interaction.channel,
          user: interaction.user,
          member: interaction.member,
          guild: interaction.guild,
          reply: async (payload) => interaction.reply(payload)
        };
        await ticketHandler.handleButton(mockInteraction, client);
      }

    } catch (error) {
      Logger.error(`Error in ticket management commands:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to execute command.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const action = args[0]?.toLowerCase();
    
    try {
      if (action === 'close') {
        const ticket = await Ticket.findOne({ channelId: message.channel.id });
        if (!ticket) return message.reply('This is not a ticket channel.');

        const mockInteraction = {
          customId: 'ticket_close',
          channel: message.channel,
          user: message.author,
          member: message.member,
          guild: message.guild,
          reply: async (payload) => message.reply(payload),
          editReply: async (payload) => message.channel.send(payload),
          deferReply: async () => {}
        };
        await ticketHandler.handleButton(mockInteraction, client);
      } 
      
      else if (action === 'claim') {
        const ticket = await Ticket.findOne({ channelId: message.channel.id });
        if (!ticket) return message.reply('This is not a ticket channel.');

        const mockInteraction = {
          customId: 'ticket_claim',
          channel: message.channel,
          user: message.author,
          member: message.member,
          guild: message.guild,
          reply: async (payload) => message.reply(payload)
        };
        await ticketHandler.handleButton(mockInteraction, client);
      } 
      
      else {
        message.reply('Ticket command support prefix commands: `!ticket close` or `!ticket claim`. For setup, please use slash command `/ticket setup`.');
      }
    } catch (err) {
      Logger.error(err);
    }
  }
};
