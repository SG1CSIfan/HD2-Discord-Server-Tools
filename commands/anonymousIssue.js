const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logInfo, logError } = require('../handlers/loggingHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anonymous_report')
        .setDescription('Report an issue anonymously or tag relevant players.')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Select the category of the issue')
                .setRequired(true)
                .addChoices(
                    { name: 'General Issue', value: 'general' },
                    { name: 'Player Issue', value: 'player' },
                    { name: 'Other', value: 'other' }
                )
        )
        .addStringOption(option =>
            option
                .setName('players')
                .setDescription('Mention players involved (optional, separate with spaces)')
        ),

    async execute(interaction) {
        try {
            const category = interaction.options.getString('category');
            const players = interaction.options.getString('players') || 'None';

            const modal = new ModalBuilder()
                .setCustomId(`report_issue_${category}`)
                .setTitle('Report Issue');

            const typeInput = new TextInputBuilder()
                .setCustomId('issue_type')
                .setLabel('Type of Issue')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const detailsInput = new TextInputBuilder()
                .setCustomId('issue_details')
                .setLabel('Details of the Issue')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(typeInput),
                new ActionRowBuilder().addComponents(detailsInput)
            );

            // Store the players' mentions in the interaction
            await interaction.showModal(modal);
            logInfo(`Displayed modal for report issue: ${category} with players: ${players}`);
            interaction.client.playersMentioned = players;
        } catch (error) {
            logError(`Failed to execute report_issue: ${error.message}`);
            await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    },
};
