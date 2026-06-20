const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');

module.exports = {
  name: 'purge',
  description: 'Clears a specified number of messages from the channel.',
  aliases: ['clear', 'clean'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  slashData: {
    name: 'purge',
    description: 'Clears a specified number of messages from the channel',
    options: [
      {
        name: 'amount',
        type: 4, // INTEGER
        description: 'Number of messages to clear (1-100)',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Invalid Argument', 'Please specify a number between 1 and 100.')]
      });
    }

    // Delete message trigger first if it is prefix command
    await message.delete().catch(() => {});

    try {
      const deleted = await message.channel.bulkDelete(amount, true);
      message.channel.send({
        embeds: [LeonexEmbed.success('Messages Purged', `Successfully cleared **${deleted.size}** messages.`)]
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    } catch (err) {
      message.channel.send({
        embeds: [LeonexEmbed.error('Purge Failed', 'An error occurred while deleting messages. Messages older than 14 days cannot be bulk deleted.')]
      });
    }
  },

  async executeSlash(interaction, client) {
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 100) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Invalid Argument', 'Please select a number between 1 and 100.')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply({
        embeds: [LeonexEmbed.success('Messages Purged', `Successfully cleared **${deleted.size}** messages.`)]
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [LeonexEmbed.error('Purge Failed', 'An error occurred while deleting messages. Messages older than 14 days cannot be bulk deleted.')]
      });
    }
  }
};
