const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Creates a support message for the ticketing system.'),
    async execute(interaction) {
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

        await interaction.reply({
            content: 'Click a button below to create a support ticket for the relevant issue.',
            components: [row],
            ephemeral: true,
        });
    },
};
