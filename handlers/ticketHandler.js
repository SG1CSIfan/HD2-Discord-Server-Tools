const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { loadTicketSettings, saveTicketSettings } = require('../utils/fileUtils');
const { generateSupportEmbed } = require('../embedHandlers/supportEmbed');
const { logInfo, logError } = require('./loggingHandler');
const fs = require('fs');
const path = require('path');

// Setup or update the support embed in the configured channel.
async function setupSupportInfo(client) {
    const settings = loadTicketSettings();

    if (!settings.channelId) {
        logError('Support channel ID not configured. Skipping setup.');
        return;
    }

    try {
        const channel = await client.channels.fetch(settings.channelId);

        if (!channel) {
            logError('Support channel not found. Check the channel ID in ticketSettings.json.');
            return;
        }

        const { embed, row } = generateSupportEmbed();

        if (settings.messageId) {
            const message = await channel.messages.fetch(settings.messageId);
            if (message) {
                await message.edit({ embeds: [embed], components: [row] });
                logInfo('Support embed updated.');
                return;
            }
        }

        const sentMessage = await channel.send({ embeds: [embed], components: [row] });
        settings.messageId = sentMessage.id;
        saveTicketSettings(settings);
        logInfo('Support embed posted and settings updated.');
    } catch (error) {
        logError(`Failed to setup support info: ${error.message}`);
    }
}


// Creates a new ticket channel.
async function createTicket(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const ticketCategory = process.env.TICKET_CATEGORY_ID; // Ensure this is set in your environment
        const ticketChannelName = `ticket-${interaction.user.username}`;
        const guild = interaction.guild;

        const channel = await guild.channels.create({
            name: ticketChannelName,
            type: 0, // Text channel
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.EmbedLinks,
                    ],
                },
            ],
        });

        logInfo(`Ticket created: ${channel.name}`);

        // Action buttons Close, Reopen, and delete
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('reopen_ticket')
                .setLabel('Reopen Ticket')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('delete_ticket')
                .setLabel('Delete Ticket')
                .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
            content: `<@${interaction.user.id}> Your ticket has been created. Please describe your issue.`,
            components: [row],
        });

        await interaction.editReply({
            content: `Your ticket has been created: ${channel}`,
        });
    } catch (error) {
        logError(`Failed to create ticket: ${error.message}`);
        await interaction.editReply({
            content: 'An error occurred while creating your ticket.',
        });
    }
}

// Create Model asking for Issue type and Issue details
async function showIssueModal(interaction, issueTag) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`submit_${issueTag.toLowerCase()}_ticket`)
            .setTitle(`${issueTag} Ticket`);

        const issueTypeInput = new TextInputBuilder()
            .setCustomId('issue_type')
            .setLabel('Type of Issue')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const issueDetailsInput = new TextInputBuilder()
            .setCustomId('issue_details')
            .setLabel('Details of the Issue')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(issueTypeInput),
            new ActionRowBuilder().addComponents(issueDetailsInput)
        );

        await interaction.showModal(modal);
        logInfo(`Displayed modal for ${issueTag} issue.`);
    } catch (error) {
        logError(`Failed to display modal: ${error.message}`);
    }
}

//Handle ticket creation from modal submission.
async function handleModalSubmission(interaction) {
    try {
        const issueType = interaction.fields.getTextInputValue('issue_type');
        const issueDetails = interaction.fields.getTextInputValue('issue_details');

        const tagNames = {
            submit_general_ticket: 'General Issue',
            submit_iron_ticket: 'IRON Issue',
            submit_bot_ticket: 'Bot Issue',
            submit_player_ticket: 'Player Issue',
        };

        const issueTag = tagNames[interaction.customId] || 'Unknown Issue';

        const ticketSettings = loadTicketSettings();
        const ticketCategory = ticketSettings.categoryId;
        const ticketRole = ticketSettings.roleId;

        if (!ticketRole) {
            throw new Error('Role ID is not defined in ticketSettings.json.');
        }

        const ticketCounter = ticketSettings.ticketCounter || 1;
        const ticketChannelName = `${String(ticketCounter).padStart(3, '0')}-${interaction.user.username}-ticket`;

        const guild = interaction.guild;

        // Fetch role from guild
        const supportRole = guild.roles.cache.get(ticketRole);
        if (!supportRole) {
            throw new Error(`Role with ID ${ticketRole} not found in guild.`);
        }

        // Create a new channel
        const channel = await guild.channels.create({
            name: ticketChannelName,
            type: 0, // Text channel
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
                {
                    id: supportRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.EmbedLinks,
                    ],
                },
            ],
        });

        logInfo(`Ticket created for ${interaction.user.tag}: ${channel.name}`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('reopen_ticket')
                .setLabel('Reopen Ticket')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('delete_ticket')
                .setLabel('Delete Ticket')
                .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
            content: `<@${interaction.user.id}> Your ticket has been created. Please describe your issue.\n\n**Type of Issue:** ${issueType}\n**Details:** ${issueDetails}\n**Tag:** ${issueTag}`,
            components: [row],
        });

        // Increment and save ticketCounter
        ticketSettings.ticketCounter = ticketCounter + 1;
        saveTicketSettings(ticketSettings);

        await interaction.reply({
            content: `Your ticket has been created in ${channel}.`,
            ephemeral: true,
        });
    } catch (error) {
        logError(`Failed to handle modal submission: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while processing your ticket.', ephemeral: true });
    }
}


// Close Ticket Button
async function closeTicket(interaction) {
    try {
        const channel = interaction.channel;

        await channel.permissionOverwrites.edit(interaction.user.id, {
            SendMessages: false,
        });

        const settings = loadTicketSettings();
        const now = Math.floor(Date.now() / 1000);

        // Prevent duplicate entries in closedTickets
        settings.closedTickets = settings.closedTickets || [];
        if (!settings.closedTickets.some(ticket => ticket.channelId === channel.id)) {
            settings.closedTickets.push({
                channelId: channel.id,
                closedAt: now,
            });
        }

        saveTicketSettings(settings);

        logInfo(`Ticket closed: ${channel.name} by ${interaction.user.tag} at ${new Date(now * 1000).toISOString()}`);

        await interaction.reply({
            content: `Ticket closed by <@${interaction.user.id}> at <t:${now}:F>. This ticket will be deleted after ${settings.ticketCloseDuration} seconds unless reopened.`,
        });
    } catch (error) {
        logError(`Failed to close ticket: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
    }
}

// ReOpen Ticket Button
async function reopenTicket(interaction) {
    try {
        const channel = interaction.channel;

        await channel.permissionOverwrites.edit(interaction.user.id, {
            SendMessages: true,
        });

        const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
        logInfo(`Ticket reopened: ${channel.name} by ${interaction.user.tag} at ${new Date().toISOString()}`);

        await interaction.reply({
            content: `Ticket reopened by <@${interaction.user.id}> at <t:${now}:F>. Please provide any additional details.`,
        });
    } catch (error) {
        logError(`Failed to reopen ticket: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while reopening the ticket.', ephemeral: true });
    }
}

// Delete Ticket Button
async function deleteTicket(interaction) {
    try {
        const channel = interaction.channel;

        const timestamp = new Date().toISOString();
        logInfo(`Ticket deleted: ${channel.name} by ${interaction.user.tag} at ${timestamp}`);

        await channel.delete();
    } catch (error) {
        logError(`Failed to delete ticket: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while deleting the ticket.', ephemeral: true });
    }
}

async function showCloseTicketModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('close_ticket_modal')
        .setTitle('Close Ticket');

    const resolvedInput = new TextInputBuilder()
        .setCustomId('resolved')
        .setLabel('Was the issue resolved? (Yes/No)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const summaryInput = new TextInputBuilder()
        .setCustomId('summary')
        .setLabel('Summary of the issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(resolvedInput),
        new ActionRowBuilder().addComponents(summaryInput)
    );

    await interaction.showModal(modal);
}

// Show a modal for deleting a ticket.
async function showDeleteTicketModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('delete_ticket_modal')
        .setTitle('Delete Ticket');

    const resolvedInput = new TextInputBuilder()
        .setCustomId('resolved')
        .setLabel('Was the issue resolved? (Yes/No)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const summaryInput = new TextInputBuilder()
        .setCustomId('summary')
        .setLabel('Summary of the issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(resolvedInput),
        new ActionRowBuilder().addComponents(summaryInput)
    );

    await interaction.showModal(modal);
}

// Handle submission of the close ticket modal.
async function handleCloseTicketSubmission(interaction) {
    try {
        const resolved = interaction.fields.getTextInputValue('resolved');
        const summary = interaction.fields.getTextInputValue('summary');

        await interaction.channel.send({
            content: `<@${interaction.user.id}> closed this ticket.\n**Resolved:** ${resolved}\n**Summary:** ${summary}`,
        });

        await closeTicket(interaction);
    } catch (error) {
        logError(`Failed to handle close ticket submission: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
    }
}

// Handle submission of the delete ticket modal.
async function handleDeleteTicketSubmission(interaction) {
    try {
        const resolved = interaction.fields.getTextInputValue('resolved');
        const summary = interaction.fields.getTextInputValue('summary');

        await interaction.channel.send({
            content: `<@${interaction.user.id}> deleted this ticket.\n**Resolved:** ${resolved}\n**Summary:** ${summary}`,
        });

        await deleteTicket(interaction);
    } catch (error) {
        logError(`Failed to handle delete ticket submission: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while deleting the ticket.', ephemeral: true });
    }
}


// Auto delete closed tickets
function startTicketDeletionInterval(client) {
    setInterval(async () => {
        const settings = loadTicketSettings();
        const now = Math.floor(Date.now() / 1000);

        logInfo(`Running ticket deletion check at ${now}`);

        const remainingTickets = [];

        for (const ticket of settings.closedTickets || []) {
            const timeElapsed = now - ticket.closedAt;
            logInfo(`Checking ticket ${ticket.channelId}, closed at ${ticket.closedAt}, elapsed: ${timeElapsed} seconds`);

            if (timeElapsed >= settings.ticketCloseDuration) {
                try {
                    const channel = await client.channels.fetch(ticket.channelId);
                    if (channel) {
                        await channel.delete();
                        logInfo(`Deleted ticket channel: ${ticket.channelId}`);
                    }
                } catch (error) {
                    logError(`Failed to delete ticket channel ${ticket.channelId}: ${error.message}`);
                }
            } else {
                remainingTickets.push(ticket);
            }
        }

        // Update closedTickets in settings
        settings.closedTickets = remainingTickets;
        saveTicketSettings(settings);
    }, 60 * 1000); // Run every minute
}

module.exports = { setupSupportInfo, 
                   createTicket, 
                   showIssueModal, 
                   handleModalSubmission, 
                   closeTicket, 
                   reopenTicket, 
                   deleteTicket,
                   showCloseTicketModal,
                   showDeleteTicketModal, 
                   handleCloseTicketSubmission,
                   handleDeleteTicketSubmission,
                   startTicketDeletionInterval 
                };
