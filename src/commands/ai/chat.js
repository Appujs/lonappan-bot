const LeonexEmbed = require('../../utils/embedBuilder');
const { generateChatResponse } = require('../../utils/gemini');

module.exports = {
  name: 'chat',
  description: 'Chat directly with Leonex AI.',
  aliases: ['ai', 'ask'],
  slashData: {
    name: 'chat',
    description: 'Chat directly with Leonex AI',
    options: [
      {
        name: 'message',
        type: 3, // STRING
        description: 'The prompt/question for the AI',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const prompt = args.join(' ');
    if (!prompt) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please provide a message or prompt to talk to the AI.')]
      });
    }

    message.channel.sendTyping();
    try {
      const response = await generateChatResponse(prompt, message.author.id, message.guild.name);
      message.reply({ content: response });
    } catch (err) {
      message.channel.send({
        embeds: [LeonexEmbed.error('AI Error', 'Failed to communicate with AI engine.')]
      });
    }
  },

  async executeSlash(interaction, client) {
    const prompt = interaction.options.getString('message');
    
    await interaction.deferReply();
    try {
      const response = await generateChatResponse(prompt, interaction.user.id, interaction.guild.name);
      await interaction.editReply({ content: response });
    } catch (err) {
      await interaction.editReply({
        embeds: [LeonexEmbed.error('AI Error', 'Failed to communicate with AI engine.')]
      });
    }
  }
};
