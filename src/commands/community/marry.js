const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'marry',
  description: 'Propose to another user in the server.',
  aliases: ['propose'],
  slashData: {
    name: 'marry',
    description: 'Propose to another user in the server',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user you want to propose to',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention the user you wish to propose to.')]
      });
    }

    if (targetUser.id === message.author.id) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Action Blocked', 'You cannot marry yourself!')]
      });
    }

    if (targetUser.bot) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Action Blocked', 'You cannot marry a bot!')]
      });
    }

    // Check DB status
    let authorProfile = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!authorProfile) authorProfile = await User.create({ userId: message.author.id, guildId: message.guild.id });

    let targetProfile = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });
    if (!targetProfile) targetProfile = await User.create({ userId: targetUser.id, guildId: message.guild.id });

    if (authorProfile.marriedTo) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Already Married', `You are already married to <@${authorProfile.marriedTo}>!`)]
      });
    }

    if (targetProfile.marriedTo) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Target Already Married', `**${targetUser.username}** is already married to <@${targetProfile.marriedTo}>!`)]
      });
    }

    // Setup interactive proposal buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_proposal')
        .setLabel('Yes, I do! 💍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('decline_proposal')
        .setLabel('No, sorry...')
        .setStyle(ButtonStyle.Danger)
    );

    const proposalMsg = await message.channel.send({
      content: `${targetUser}`,
      embeds: [
        LeonexEmbed.create({
          title: '💖 Marriage Proposal! 💖',
          description: `${message.author} has proposed to ${targetUser}! \n\n**Do you accept?**`,
          color: '#E0115F', // Ruby pink
          footer: { text: 'Proposal expires in 60 seconds' }
        })
      ],
      components: [row]
    });

    // Create collector
    const filter = i => i.user.id === targetUser.id;
    const collector = proposalMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      await i.deferUpdate();

      if (i.customId === 'accept_proposal') {
        // Double-check statuses
        authorProfile = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
        targetProfile = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });

        if (authorProfile.marriedTo || targetProfile.marriedTo) {
          return proposalMsg.edit({
            content: ' ',
            embeds: [LeonexEmbed.error('Proposal Expired', 'One of the users has already gotten married!')],
            components: []
          });
        }

        authorProfile.marriedTo = targetUser.id;
        targetProfile.marriedTo = message.author.id;
        await authorProfile.save();
        await targetProfile.save();

        proposalMsg.edit({
          content: ' ',
          embeds: [
            LeonexEmbed.create({
              title: '🎉 Just Married! 🎉',
              description: `💖 **CONGRATULATIONS!** ${message.author} and ${targetUser} are now married! 💍\nMay your friendship/partnership be filled with joy!`,
              color: '#FF69B4',
              thumbnail: targetUser.displayAvatarURL()
            })
          ],
          components: []
        });
      } else {
        proposalMsg.edit({
          content: ' ',
          embeds: [LeonexEmbed.error('Proposal Declined', `💔 ${targetUser.username} has declined the proposal. Better luck next time!`)],
          components: []
        });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        proposalMsg.edit({
          content: ' ',
          embeds: [LeonexEmbed.error('Proposal Timeout', `⌛ The proposal to ${targetUser.username} has timed out.`)],
          components: []
        });
      }
    });
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Action Blocked', 'You cannot marry yourself!')],
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Action Blocked', 'You cannot marry a bot!')],
        ephemeral: true
      });
    }

    let authorProfile = await User.findOne({ userId: interaction.user.id, guildId });
    if (!authorProfile) authorProfile = await User.create({ userId: interaction.user.id, guildId });

    let targetProfile = await User.findOne({ userId: targetUser.id, guildId });
    if (!targetProfile) targetProfile = await User.create({ userId: targetUser.id, guildId });

    if (authorProfile.marriedTo) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Already Married', `You are already married to <@${authorProfile.marriedTo}>!`)],
        ephemeral: true
      });
    }

    if (targetProfile.marriedTo) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Target Already Married', `**${targetUser.username}** is already married to <@${targetProfile.marriedTo}>!`)],
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_proposal_slash')
        .setLabel('Yes, I do! 💍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('decline_proposal_slash')
        .setLabel('No, sorry...')
        .setStyle(ButtonStyle.Danger)
    );

    const proposalMsg = await interaction.reply({
      content: `${targetUser}`,
      embeds: [
        LeonexEmbed.create({
          title: '💖 Marriage Proposal! 💖',
          description: `${interaction.user} has proposed to ${targetUser}! \n\n**Do you accept?**`,
          color: '#E0115F',
          footer: { text: 'Proposal expires in 60 seconds' }
        })
      ],
      components: [row],
      fetchReply: true
    });

    const filter = i => i.user.id === targetUser.id;
    const collector = proposalMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      await i.deferUpdate();

      if (i.customId === 'accept_proposal_slash') {
        authorProfile = await User.findOne({ userId: interaction.user.id, guildId });
        targetProfile = await User.findOne({ userId: targetUser.id, guildId });

        if (authorProfile.marriedTo || targetProfile.marriedTo) {
          return interaction.editReply({
            content: ' ',
            embeds: [LeonexEmbed.error('Proposal Expired', 'One of the users has already gotten married!')],
            components: []
          });
        }

        authorProfile.marriedTo = targetUser.id;
        targetProfile.marriedTo = interaction.user.id;
        await authorProfile.save();
        await targetProfile.save();

        await interaction.editReply({
          content: ' ',
          embeds: [
            LeonexEmbed.create({
              title: '🎉 Just Married! 🎉',
              description: `💖 **CONGRATULATIONS!** ${interaction.user} and ${targetUser} are now married! 💍\nMay your friendship/partnership be filled with joy!`,
              color: '#FF69B4',
              thumbnail: targetUser.displayAvatarURL()
            })
          ],
          components: []
        });
      } else {
        await interaction.editReply({
          content: ' ',
          embeds: [LeonexEmbed.error('Proposal Declined', `💔 ${targetUser.username} has declined the proposal.`)],
          components: []
        });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: ' ',
          embeds: [LeonexEmbed.error('Proposal Timeout', `⌛ The proposal to ${targetUser.username} has timed out.`)],
          components: []
        });
      }
    });
  }
};
