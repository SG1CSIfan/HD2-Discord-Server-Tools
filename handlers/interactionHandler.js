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
const {
    showPromotionModal,
    handlePromotionSubmission,
    handlePromotionApproval,
    showDenialReasonModal,
    handleDenialReasonSubmission,
} = require('../handlers/promotionHandler');
const {
    handleOpenMissionReportModal,
    handleMissionReportSubmission,
    handleEditReport,
    handleEditReportSubmission,
} = require('./missionReportHandler');
const { handleAnonymousSubmission } = require('./AnonymousSubmissionHandler');
const { loadTicketSettings } = require('../utils/fileUtils');

/**
 * Main interaction handler for all Discord interactions
 * Handles buttons, modals, slash commands, and autocomplete interactions
 */
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
            // Handle dynamic buttons like edit_report_<id>
            if (interaction.customId.startsWith('edit_report_')) {
                logInfo(`Editing report for interaction ID: ${interaction.customId}`);
                await handleEditReport(interaction);
                return;
            }

            // Static button interactions
            switch (interaction.customId) {
                case 'create_ticket': // Handles ticket creation
                    await createTicket(interaction);
                    break;

                case 'close_ticket': // Handles ticket closure
                    await showCloseTicketModal(interaction);
                    break;

                case 'delete_ticket': // Handles ticket deletion
                    await showDeleteTicketModal(interaction);
                    break;

                case 'reopen_ticket': // Handles ticket reopening
                    await reopenTicket(interaction);
                    break;

                // General issue-related buttons
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

                // Promotion-related buttons
                case 'promotion_application':
                    await showPromotionModal(interaction);
                    break;

                case 'approve_promotion': // Approve a promotion application
                    await handlePromotionApproval(interaction);
                    break;

                case 'deny_promotion': // Deny a promotion application
                    await showDenialReasonModal(interaction);
                    break;

                // Mission Report Button
                case 'open_mission_report_modal': // Opens the mission report modal
                    await handleOpenMissionReportModal(interaction);
                    break;

                default:
                    // Log unhandled button interactions
                    logError(`Unhandled button interaction: ${interaction.customId}`);
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            // Handle dynamic modals like edit_modal_<id>
            if (interaction.customId.startsWith('edit_modal_')) {
                logInfo(`Handling edit modal submission for ID: ${interaction.customId}`);
                await handleEditReportSubmission(interaction);
                return;
            }

            // Static modal interactions
            switch (interaction.customId) {
                case 'close_ticket_modal': // Handles ticket closure modal submission
                    await handleCloseTicketSubmission(interaction);
                    break;

                case 'delete_ticket_modal': // Handles ticket deletion modal submission
                    await handleDeleteTicketSubmission(interaction);
                    break;

                case 'promotion_application_modal': // Handles promotion application modal submission
                    await handlePromotionSubmission(interaction);
                    break;

                case 'denial_reason_modal': // Handles denial reason modal submission
                    await handleDenialReasonSubmission(interaction);
                    break;

                case 'submit_mission_report': // Handles mission report submission
                    logInfo('Handling mission report submission modal.');
                    await handleMissionReportSubmission(interaction);
                    break;

                default:
            // Use fallback for specific interactions like report_issue
            if (interaction.customId.startsWith('report_issue_')) {
                await handleAnonymousSubmission(interaction);
            } else if (interaction.customId.startsWith('submit_')) {
                await handleModalSubmission(interaction);
            } else {
                logError(`Unhandled modal interaction: ${interaction.customId}`);
                await interaction.reply({
                    content: 'This modal interaction is not recognized.',
                    ephemeral: true,
                });
            }
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
        // Log and respond to unexpected errors
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
