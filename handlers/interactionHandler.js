const { logInfo, logError } = require('./loggingHandler');
const {
    createTicket,
    closeTicket,
    reopenTicket,
    deleteTicket,
    showCloseTicketModal,
    showDeleteTicketModal,
    handleCloseTicketSubmission,
    handleDeleteTicketSubmission,
    showIssueModal,
    handleModalSubmission,
} = require('./ticketHandler');
const { loadTicketSettings } = require('../utils/fileUtils');

async function handleInteraction(interaction, client) {
    // Log interaction details
    const interactionDetails = {
        user: interaction.user.tag,
        type: interaction.type,
        commandName: interaction.commandName || null,
        customId: interaction.customId || null,
    };
    logInfo(`Handled interaction: ${JSON.stringify(interactionDetails)}`);

    try {
        const settings = loadTicketSettings();

        // Handle button interactions
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'create_ticket':
                    await createTicket(interaction);
                    break;

                // Close Ticket Button
                case 'close_ticket':
                    await showCloseTicketModal(interaction);
                    break;

                // Delete Ticket Button
                case 'delete_ticket':
                    await showDeleteTicketModal(interaction);
                    break;

                // Reopen Ticket Button
                case 'reopen_ticket':
                    await reopenTicket(interaction);
                    break;

                // Issue Buttons
                case 'general_issue':
                    await showIssueModal(interaction, 'General');
                    break;
                case 'iron_issue':
                    await showIssueModal(interaction, 'IRON');
                    break;
                case 'bot_issue':
                    await showIssueModal(interaction, 'Bot');
                    break;
                case 'player_issue':
                    await showIssueModal(interaction, 'Player');
                    break;

                default:
                    logError(`Unhandled button interaction: ${interaction.customId}`);
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'close_ticket_modal') {
                await handleCloseTicketSubmission(interaction);
            } else if (interaction.customId === 'delete_ticket_modal') {
                await handleDeleteTicketSubmission(interaction);
            } else {
                await handleModalSubmission(interaction);
            }
            return;
        }

        // Handle slash commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logError(`Unknown command: ${interaction.commandName}`);
                await interaction.reply({ content: 'Command not found.', ephemeral: true });
                return;
            }

            // Ensure `/assignmember` is only usable in ticket channels
            if (interaction.commandName === 'assignmember') {
                const ticketCategoryId = settings.categoryId;
                if (!interaction.channel.parentId || interaction.channel.parentId !== ticketCategoryId) {
                    await interaction.reply({
                        content: 'This command can only be used in ticket channels.',
                        ephemeral: true,
                    });
                    return;
                }
            }

            await command.execute(interaction);
        }

        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command && command.autocomplete) {
                await command.autocomplete(interaction);
            }
            return;
        }
    } catch (error) {
        logError(`Failed to handle interaction: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
            });
        }
    }
}

module.exports = { handleInteraction };