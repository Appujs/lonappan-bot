const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'suggest',
  description: 'Submits a suggestion for user voting.',
  aliases: ['suggestion'],
  slashData: {
    name: 'suggest',
    description: 'Submits a suggestion for voting',
    options: [
      {
        name: 'text',
        type: 3, // STRING
        description: 'The suggestion text',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const text = args.join(' ');
    if (!text) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please provide a suggestion description.')]
      });
    }

    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (!guildSettings || !guildSettings.suggestionsChannelId) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Suggestions Disabled', 'A suggestion channel has not been configured yet. Set one up via the dashboard.')]
      });
    }

    const targetChannel = message.guild.channels.cache.get(guildSettings.suggestionsChannelId);
    if (!targetChannel) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Suggestions Channel Missing', 'The configured suggestions channel could not be found.')]
      });
    }

    const embed = LeonexEmbed.create({
      title: `💡 New Suggestion`,
      description: text,
      author: {
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      },
      footer: { text: 'Leonex Suggestions System' }
    });

    const suggestionMsg = await targetChannel.send({ embeds: [embed] });
    await suggestionMsg.react('👍');
    await suggestionMsg.react('👎');

    message.channel.send({
      embeds: [LeonexEmbed.success('Suggestion Sent', `Your suggestion has been submitted successfully to ${targetChannel}`)]
    });
  },

  async executeSlash(interaction, client) {
    const text = interaction.options.getString('text');

    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildSettings || !guildSettings.suggestionsChannelId) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Suggestions Disabled', 'A suggestion channel has not been configured yet. Set one up via the dashboard.')],
        ephemeral: true
      });
    }

    const targetChannel = interaction.guild.channels.cache.get(guildSettings.suggestionsChannelId);
    if (!targetChannel) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Suggestions Channel Missing', 'The configured suggestions channel could not be found.')],
        ephemeral: true
      });
    }

    const embed = LeonexEmbed.create({
      title: `💡 New Suggestion`,
      description: text,
      author: {
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL()
      },
      footer: { text: 'Leonex Suggestions System' }
    });

    const suggestionMsg = await targetChannel.send({ embeds: [embed] });
    await suggestionMsg.react('👍');
    await suggestionMsg.react('👎');

    await interaction.reply({
      embeds: [LeonexEmbed.success('Suggestion Sent', `Your suggestion has been submitted successfully to ${targetChannel}`)]
    });
  }
};
