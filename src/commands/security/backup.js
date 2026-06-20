const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BackupService = require('../../services/backupService');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Server backup and restore system')
    .addSubcommand(subcommand =>
      subcommand.setName('create')
        .setDescription('Create a backup snapshot of current roles and channels'))
    .addSubcommand(subcommand =>
      subcommand.setName('load')
        .setDescription('Restore server using a backup ID')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('The backup ID to load')
            .setRequired(true))),
  
  category: 'security',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
  
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const backup = await BackupService.create(interaction.guild, interaction.user.id);
        
        await interaction.editReply({
          embeds: [Embeds.success(
            'Backup Created',
            `Successfully created server backup!\n\n**Backup ID:** \`${backup.backupId}\`\n**Channels backed up:** \`${backup.channels.length}\`\n**Roles backed up:** \`${backup.roles.length}\`\n\n*Keep this ID secure. You can load this backup anytime using \`/backup load id:${backup.backupId}\`.*`
          )]
        });
      } catch (error) {
        Logger.error(`Error creating backup via command:`, error.stack || error);
        await interaction.editReply({
          embeds: [Embeds.error('Backup Failed', 'Failed to generate server backup snapshot.')]
        });
      }
    } 
    
    else if (subcommand === 'load') {
      const backupId = interaction.options.getString('id').toUpperCase();

      // Confirm with user (DM alerts because channels are about to be wiped)
      try {
        await interaction.reply({
          embeds: [Embeds.warn(
            'Warning: Severe Action',
            `Restoring backup \`${backupId}\` will **delete** all current channels and customizable roles. The progress alerts will be sent to your DMs.\n\n*Pressing enter/proceeding will wipe this channel immediately.*`
          )],
          ephemeral: true
        });

        // Test if DM is open
        const dm = await interaction.user.send({
          embeds: [Embeds.info('Leonex Restore Status', `Initiating restoration of backup \`${backupId}\` for guild **${interaction.guild.name}**...`)]
        }).catch(() => null);

        if (!dm) {
          return interaction.followUp({
            embeds: [Embeds.error('DM Blocked', 'Please open your Direct Messages (DMs) to receive restore log progress, as channels will be deleted.')],
            ephemeral: true
          });
        }

        // Execute restore in background
        BackupService.load(interaction.guild, backupId)
          .then(async () => {
            await interaction.user.send({
              embeds: [Embeds.success('Restore Complete', `Successfully restored the backup structural layout in **${interaction.guild.name}**!`)]
            }).catch(() => null);
          })
          .catch(async (err) => {
            Logger.error(`Error loading backup:`, err);
            await interaction.user.send({
              embeds: [Embeds.error('Restore Failed', `An error occurred while loading backup: \`${err.message}\``)]
            }).catch(() => null);
          });

      } catch (error) {
        Logger.error(`Error initiating restore:`, error.stack || error);
        await interaction.reply({
          embeds: [Embeds.error('Restore Error', 'Failed to initiate restore sequence.')],
          ephemeral: true
        }).catch(() => null);
      }
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [Embeds.error('Access Denied', 'Administrators only.')] });
    }

    const action = args[0]?.toLowerCase();
    if (action === 'create') {
      try {
        const backup = await BackupService.create(message.guild, message.author.id);
        message.reply({
          embeds: [Embeds.success('Backup Created', `ID: \`${backup.backupId}\`\nUse \`!backup load <id>\` to restore.`)]
        });
      } catch (err) { Logger.error(err); }
    } else if (action === 'load') {
      const id = args[1]?.toUpperCase();
      if (!id) return message.reply('Specify a Backup ID.');

      const dm = await message.author.send('Starting restore...').catch(() => null);
      if (!dm) return message.reply('Please open your DMs.');

      BackupService.load(message.guild, id)
        .then(() => message.author.send('Successfully restored!'))
        .catch(err => message.author.send(`Restore error: ${err.message}`));
    } else {
      message.reply('Usage: `!backup create` or `!backup load <id>`');
    }
  }
};
