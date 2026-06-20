const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'counting',
  description: 'View or configure counting game settings.',
  slashData: {
    name: 'counting',
    description: 'View or configure counting game settings',
    options: [
      {
        name: 'channel',
        type: 7, // CHANNEL
        description: 'Set channel for the counting game (leave empty to view status)',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    let guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (!guildSettings) guildSettings = await Guild.create({ guildId: message.guild.id });

    const targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
      // Status view
      const activeChannel = guildSettings.countingChannelId ? `<#${guildSettings.countingChannelId}>` : '*None*';
      const embed = LeonexEmbed.create({
        title: '🔢 Counting Game Status',
        description: 'Members take turns counting up sequentially. Breaking sequence resets the score.',
        fields: [
          { name: 'Active Channel', value: activeChannel, inline: true },
          { name: 'Current Counter Number', value: `\`${guildSettings.countingCurrentNumber}\``, inline: true }
        ]
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Authorization
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Permission Denied', 'You need the Manage Server permission to configure counting.')]
      });
    }

    guildSettings.countingChannelId = targetChannel.id;
    guildSettings.countingCurrentNumber = 0;
    guildSettings.countingLastUser = null;
    await guildSettings.save();

    message.channel.send({
      embeds: [LeonexEmbed.success('Counting Channel Set', `The counting game has been initialized in ${targetChannel}. Start at **1**!`)]
    });
  },

  async executeSlash(interaction, client) {
    let guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildSettings) guildSettings = await Guild.create({ guildId: interaction.guild.id });

    const targetChannel = interaction.options.getChannel('channel');

    if (!targetChannel) {
      const activeChannel = guildSettings.countingChannelId ? `<#${guildSettings.countingChannelId}>` : '*None*';
      const embed = LeonexEmbed.create({
        title: '🔢 Counting Game Status',
        fields: [
          { name: 'Active Channel', value: activeChannel, inline: true },
          { name: 'Current Counter Number', value: `\`${guildSettings.countingCurrentNumber}\``, inline: true }
        ]
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Permission Denied', 'You need the Manage Server permission to configure counting.')],
        ephemeral: true
      });
    }

    guildSettings.countingChannelId = targetChannel.id;
    guildSettings.countingCurrentNumber = 0;
    guildSettings.countingLastUser = null;
    await guildSettings.save();

    await interaction.reply({
      embeds: [LeonexEmbed.success('Counting Channel Set', `The counting game has been initialized in ${targetChannel}. Start at **1**!`)]
    });
  }
};
