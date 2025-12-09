const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  createEmbed() {
    return new EmbedBuilder()
      .setTitle('Support Tickets')
      .setDescription(
        'Welcome to the support system. Use the buttons below to create a ticket for assistance.'
      )
      .setColor(0x00ff00);
  },
  createButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('general_support')
        .setLabel('General Support')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('bot_issue')
        .setLabel('Bot Issue')
        .setEmoji('🤖')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('player_issue')
        .setLabel('Player Issue')
        .setEmoji('🕵🏻')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('promotion')
        .setLabel('Promotion')
        .setEmoji('🎖️')
        .setStyle(ButtonStyle.Success)
    );
  },
};
