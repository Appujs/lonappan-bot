const LeonexEmbed = require('../../utils/embedBuilder');
const config = require('../../config');

module.exports = {
  name: 'help',
  description: 'Displays a lists of all available commands.',
  aliases: ['h', 'commands'],
  slashData: {
    name: 'help',
    description: 'Displays lists of all available commands'
  },
  async execute(message, args, client) {
    const categories = {};
    client.commands.forEach(cmd => {
      const cat = cmd.category ? cmd.category.toUpperCase() : 'UTILITY';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`\`${cmd.name}\``);
    });

    const prefix = config.defaultPrefix;
    const fields = Object.keys(categories).map(catName => ({
      name: `${catName}`,
      value: categories[catName].join(', '),
      inline: false
    }));

    const embed = LeonexEmbed.create({
      title: '📖 Leonex Bot Commands Help',
      description: `Leonex is a premium Discord bot. Use client commands with prefix \`${prefix}\` or with slash commands \`/\`.\n\nHere are the loaded commands categorized:`,
      fields,
      footer: { text: `Developed by Akhilesh | Use ${prefix}help for details` }
    });

    message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const categories = {};
    client.commands.forEach(cmd => {
      const cat = cmd.category ? cmd.category.toUpperCase() : 'UTILITY';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`\`${cmd.name}\``);
    });

    const fields = Object.keys(categories).map(catName => ({
      name: `${catName}`,
      value: categories[catName].join(', '),
      inline: false
    }));

    const embed = LeonexEmbed.create({
      title: '📖 Leonex Bot Commands Help',
      description: `Leonex is a premium Discord bot. You can use standard slash commands \`/\` or prefix commands.\n\nHere are the loaded commands:`,
      fields,
      footer: { text: `Developed by Akhilesh` }
    });

    await interaction.reply({ embeds: [embed] });
  }
};
