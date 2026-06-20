const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'afk',
  description: 'Sets your AFK status so others know you are away.',
  slashData: {
    name: 'afk',
    description: 'Sets your AFK status',
    options: [
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for going AFK',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const reason = args.join(' ') || 'AFK';
    const guildId = message.guild.id;

    let userSettings = await User.findOne({ userId: message.author.id, guildId });
    if (!userSettings) {
      userSettings = await User.create({ userId: message.author.id, guildId });
    }

    userSettings.isAfk = true;
    userSettings.afkMessage = reason;
    userSettings.afkTimestamp = new Date();
    await userSettings.save();

    message.channel.send({
      embeds: [LeonexEmbed.success('AFK Set', `${message.author} is now AFK: **${reason}**`)]
    });
  },

  async executeSlash(interaction, client) {
    const reason = interaction.options.getString('reason') || 'AFK';
    const guildId = interaction.guild.id;

    let userSettings = await User.findOne({ userId: interaction.user.id, guildId });
    if (!userSettings) {
      userSettings = await User.create({ userId: interaction.user.id, guildId });
    }

    userSettings.isAfk = true;
    userSettings.afkMessage = reason;
    userSettings.afkTimestamp = new Date();
    await userSettings.save();

    await interaction.reply({
      embeds: [LeonexEmbed.success('AFK Set', `${interaction.user} is now AFK: **${reason}**`)]
    });
  }
};
