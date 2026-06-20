const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'settings',
  description: 'View or modify Leonex security configurations.',
  aliases: ['security', 'config'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: {
    name: 'settings',
    description: 'View or modify server security settings',
    options: [
      {
        name: 'setting',
        type: 3, // STRING
        description: 'The security setting to toggle',
        required: false,
        choices: [
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Links', value: 'antilinks' },
          { name: 'Anti-Badwords', value: 'antibadwords' },
          { name: 'Alt-Detection', value: 'altdetection' }
        ]
      },
      {
        name: 'value',
        type: 5, // BOOLEAN
        description: 'True (enable) or False (disable)',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    let guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (!guildSettings) guildSettings = await Guild.create({ guildId: message.guild.id });

    const key = args[0]?.toLowerCase();
    const valStr = args[1]?.toLowerCase();

    if (!key) {
      // Print current settings
      const embed = LeonexEmbed.create({
        title: '🛡️ Server Security Settings',
        description: 'Current security and moderation module toggles.',
        fields: [
          { name: 'Anti-Spam 🚫', value: guildSettings.antiSpam ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Anti-Links 🔗', value: guildSettings.antiLinks ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Anti-Badwords 🤬', value: guildSettings.antiBadwords ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Alt-Detection 🤖', value: guildSettings.altDetection ? 'Enabled ✅' : 'Disabled ❌', inline: true }
        ]
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (!['antispam', 'antilinks', 'antibadwords', 'altdetection'].includes(key)) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Invalid Field', 'Valid choices: `antispam`, `antilinks`, `antibadwords`, `altdetection`')]
      });
    }

    if (!valStr || !['true', 'false'].includes(valStr)) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Invalid Value', 'Please specify either `true` or `false` to toggle the setting.')]
      });
    }

    const targetVal = valStr === 'true';

    if (key === 'antispam') guildSettings.antiSpam = targetVal;
    if (key === 'antilinks') guildSettings.antiLinks = targetVal;
    if (key === 'antibadwords') guildSettings.antiBadwords = targetVal;
    if (key === 'altdetection') guildSettings.altDetection = targetVal;

    await guildSettings.save();

    message.channel.send({
      embeds: [LeonexEmbed.success('Setting Saved', `Successfully set **${key}** to **${targetVal}**.`)]
    });
  },

  async executeSlash(interaction, client) {
    let guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildSettings) guildSettings = await Guild.create({ guildId: interaction.guild.id });

    const key = interaction.options.getString('setting');
    const targetVal = interaction.options.getBoolean('value');

    if (!key) {
      const embed = LeonexEmbed.create({
        title: '🛡️ Server Security Settings',
        description: 'Current security and moderation module toggles.',
        fields: [
          { name: 'Anti-Spam 🚫', value: guildSettings.antiSpam ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Anti-Links 🔗', value: guildSettings.antiLinks ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Anti-Badwords 🤬', value: guildSettings.antiBadwords ? 'Enabled ✅' : 'Disabled ❌', inline: true },
          { name: 'Alt-Detection 🤖', value: guildSettings.altDetection ? 'Enabled ✅' : 'Disabled ❌', inline: true }
        ]
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (targetVal === null) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please specify a value (True/False) for the setting.')],
        ephemeral: true
      });
    }

    if (key === 'antispam') guildSettings.antiSpam = targetVal;
    if (key === 'antilinks') guildSettings.antiLinks = targetVal;
    if (key === 'antibadwords') guildSettings.antiBadwords = targetVal;
    if (key === 'altdetection') guildSettings.altDetection = targetVal;

    await guildSettings.save();

    await interaction.reply({
      embeds: [LeonexEmbed.success('Setting Saved', `Successfully set **${key}** to **${targetVal}**.`)]
    });
  }
};
