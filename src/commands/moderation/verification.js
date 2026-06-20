const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('../../models/Guild');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Configure and spawn the member verification system')
    .addSubcommand(subcommand =>
      subcommand.setName('setup')
        .setDescription('Create a verification embed panel in this channel')
        .addRoleOption(option => 
          option.setName('role')
            .setDescription('The role to assign to verified users')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable the verification system')),
  
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      let dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      if (!dbGuild) dbGuild = new Guild({ guildId: interaction.guild.id });

      if (subcommand === 'setup') {
        const role = interaction.options.getRole('role');

        // Check if role is higher than bot's role
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({
            embeds: [Embeds.error('Hierarchy Error', 'The verification role must be below the bot\'s highest role in order to be assigned.')],
            ephemeral: true
          });
        }

        dbGuild.verificationEnabled = true;
        dbGuild.verificationRoleId = role.id;
        dbGuild.verificationChannelId = interaction.channel.id;
        await dbGuild.save();

        const verifyEmbed = Embeds.create({
          title: '🛡️ Member Verification',
          description: `Welcome to **${interaction.guild.name}**!\n\nTo access the server channels, please verify your account by clicking the button below.\n\n*By verifying, you agree to adhere to the community rules and guidelines.*`,
          color: '#5865F2'
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('verify_user')
            .setLabel('Verify Account')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

        await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });
        
        await interaction.reply({
          embeds: [Embeds.success('Verification Panel Spawned', `Verification system has been enabled and mapped to the **${role.name}** role.`)],
          ephemeral: true
        });

      } else {
        dbGuild.verificationEnabled = false;
        dbGuild.verificationRoleId = null;
        dbGuild.verificationChannelId = null;
        await dbGuild.save();

        await interaction.reply({
          embeds: [Embeds.success('Verification Disabled', 'The verification system has been disabled.')]
        });
      }

    } catch (error) {
      Logger.error(`Error in verification command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to configure verification settings.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [Embeds.error('Access Denied', 'Missing permissions.')] });
    }

    const action = args[0]?.toLowerCase();
    if (action === 'disable') {
      try {
        await Guild.findOneAndUpdate({ guildId: message.guild.id }, { verificationEnabled: false });
        return message.reply({ embeds: [Embeds.success('Verification Disabled', 'Disabled successfully.')] });
      } catch (err) { Logger.error(err); }
    }

    const roleMention = message.mentions.roles.first();
    if (!roleMention) {
      return message.reply({ embeds: [Embeds.error('Invalid Arguments', 'Usage: `!verification <@role>` to setup panel, or `!verification disable` to turn off.')] });
    }

    try {
      const dbGuild = await Guild.findOneAndUpdate(
        { guildId: message.guild.id },
        { verificationEnabled: true, verificationRoleId: roleMention.id, verificationChannelId: message.channel.id },
        { new: true, upsert: true }
      );

      const verifyEmbed = Embeds.create({
        title: '🛡️ Member Verification',
        description: `Welcome to **${message.guild.name}**!\n\nTo access the server channels, please verify your account by clicking the button below.`,
        color: '#5865F2'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_user')
          .setLabel('Verify Account')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );

      await message.channel.send({ embeds: [verifyEmbed], components: [row] });
      message.reply({ embeds: [Embeds.success('Verification Set', 'Setup complete.')] });
    } catch (error) {
      Logger.error(error);
    }
  }
};
