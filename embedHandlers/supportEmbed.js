const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

 // Generate the support embed and buttons.
function generateSupportEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('Support Ticket System')
        .setDescription('Click a button below to create a support ticket for the relevant issue.')
        .setColor(0x1f8b4c);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('general_issue')
            .setLabel('General Issue')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('iron_issue')
            .setLabel('IRON Issue')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('bot_issue')
            .setLabel('Bot Issue')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('player_issue')
            .setLabel('Player Issue')
            .setStyle(ButtonStyle.Danger)
    );

    return { embed, row };
}

module.exports = { generateSupportEmbed };
