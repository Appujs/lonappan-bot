const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'ticket-setup',
  description: 'Sends the support ticket setup panel.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: {
    name: 'ticket-setup',
    description: 'Sends the support ticket setup panel',
    options: [
      {
        name: 'channel',
        type: 7, // CHANNEL
        description: 'Channel to send the ticket panel in (defaults to current)',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetChannel = message.mentions.channels.first() || message.channel;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('leonex_create_ticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

    const embed = LeonexEmbed.create({
      title: '🎫 Support Ticket Panel',
      description: 'Need assistance? Click the button below to open a private support ticket. Our server staff will get in touch with you shortly.',
      footer: { text: 'Leonex Support System' }
    });

    await targetChannel.send({
      embeds: [embed],
      components: [row]
    });

    message.channel.send({
      embeds: [LeonexEmbed.success('Setup Completed', `Ticket support panel sent to ${targetChannel}`)]
    });

    // Save ticket channel to configuration
    let guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (!guildSettings) {
      guildSettings = await Guild.create({ guildId: message.guild.id });
    }
    guildSettings.ticketChannelId = targetChannel.id;
    await guildSettings.save();
  },

  async executeSlash(interaction, client) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('leonex_create_ticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

    const embed = LeonexEmbed.create({
      title: '🎫 Support Ticket Panel',
      description: 'Need assistance? Click the button below to open a private support ticket. Our server staff will get in touch with you shortly.',
      footer: { text: 'Leonex Support System' }
    });

    await targetChannel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      embeds: [LeonexEmbed.success('Setup Completed', `Ticket support panel sent to ${targetChannel}`)],
      ephemeral: true
    });

    let guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildSettings) {
      guildSettings = await Guild.create({ guildId: interaction.guild.id });
    }
    guildSettings.ticketChannelId = targetChannel.id;
    await guildSettings.save();
  }
};
