const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { loadTicketSettings, saveTicketSettings } = require('../utils/fileUtils');
const { generateSupportEmbed, generateSubmissionEmbed, generateClosureEmbed } = require('../embedHandlers/supportEmbed');
const { logInfo, logError } = require('./loggingHandler');
const pool = require('../utils/dbUtils'); // Ensure the correct path
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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
            const message = await channel.messages.fetch(settings.messageId).catch(() => null);
            if (message) {
                // Update the existing embed
                await message.edit({ embeds: [embed], components: [row] });
                logInfo('Support embed updated.');
                return;
            } else {
                logInfo('Embed not found; creating a new one.');
            }
        }

        // If message doesn't exist, post a new embed
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
            .setPlaceholder('Example: Cannot ping on-call role.')
            .setRequired(true);

        const issueDetailsInput = new TextInputBuilder()
            .setCustomId('issue_details')
            .setLabel('Details of the Issue')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Example: Everytime i try to ping on-call, it throws me a error.')
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
        // Retrieve modal inputs
        const issueType = interaction.fields.getTextInputValue('issue_type');
        const issueDetails = interaction.fields.getTextInputValue('issue_details');

        logInfo('Modal inputs received successfully.');

        // Determine the issue tag
        const tagNames = {
            submit_general_ticket: 'General Issue',
            submit_iron_ticket: 'IRON Issue',
            submit_bot_ticket: 'Bot Issue',
            submit_player_ticket: 'Player Issue',
        };

        const issueTag = tagNames[interaction.customId] || 'Unknown Issue';
        logInfo(`Issue tag determined: ${issueTag}`);

        // Load ticket settings
        const ticketSettings = loadTicketSettings();
        const ticketCounter = ticketSettings.ticketCounter || 1;
        const ticketId = `ticket_${ticketCounter}`;
        const ticketChannelName = `${String(ticketCounter).padStart(3, '0')}-${interaction.user.username}-ticket`;

        const guild = interaction.guild;

        // Fetch the member's server nickname
        const member = await guild.members.fetch(interaction.user.id);
        const nickname = member.displayName || interaction.user.username;

        // Fetch role from guild
        const ticketRole = ticketSettings.roleId;
        if (!ticketRole) {
            throw new Error('Role ID is not defined in ticketSettings.json.');
        }

        const supportRole = guild.roles.cache.get(ticketRole);
        if (!supportRole) {
            throw new Error(`Role with ID ${ticketRole} not found in guild.`);
        }

        logInfo('Support role fetched successfully.');

        // Create a new ticket channel
        const channel = await guild.channels.create({
            name: ticketChannelName,
            type: 0,
            parent: ticketSettings.categoryId,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: supportRole.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'ManageChannels', 'SendMessages', 'EmbedLinks'] },
            ],
        });

        logInfo(`Ticket channel created: ${channel.name}`);

        // Save ticket data to JSON
        const ticketData = {
            ticket_id: ticketId,
            channel_id: channel.id,
            user_id: interaction.user.id,
            user_nickname: nickname,
            issue_type: issueType,
            details: issueDetails,
            tag: issueTag,
            created_at: new Date().toISOString(),
            messages: [], // Placeholder for future message logging
            closed: false,
        };

        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        const tickets = fs.existsSync(ticketsPath) ? JSON.parse(fs.readFileSync(ticketsPath)) : [];
        tickets.push(ticketData);
        fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 4));

        logInfo(`Ticket created and saved to JSON: ${JSON.stringify(ticketData)}`);

        // Generate the submission embed
        const embed = generateSubmissionEmbed({
            user: interaction.user.username,
            nickname,
            tag: issueTag,
            issueType,
            details: issueDetails,
            timestamp: Math.floor(Date.now() / 1000),
        });

        // Create action buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen Ticket').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete Ticket').setStyle(ButtonStyle.Secondary)
        );

        // Notify the user and provide ticket details
        await channel.send({
            content: `<@&${supportRole.id}> A new ticket has been created by <@${interaction.user.id}>. Please assist.`,
            embeds: [embed],
            components: [row],
        });

        if (issueTag === 'Player Issue') {
            await channel.send({
                content: `To associate this ticket with a specific player, please use the \`/member_issue\` command. If this person is related to <@&${supportRole.id}>, they will be removed from this ticket, once you run this command.`,
            });
        }

        // Increment ticket counter and save settings
        ticketSettings.ticketCounter = ticketCounter + 1;
        saveTicketSettings(ticketSettings);

        logInfo('Ticket counter incremented and settings saved.');

        await interaction.reply({
            content: `Your ticket has been created in ${channel}.`,
            ephemeral: true,
        });
    } catch (error) {
        logError(`Failed to handle modal submission: ${error.message}`);
        await interaction.reply({
            content: `An error occurred while processing your ticket, please contact an admin: ${error.message}`,
            ephemeral: true,
        });
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

        // Allow the user to send messages again
        await channel.permissionOverwrites.edit(interaction.user.id, {
            SendMessages: true,
        });

        const settings = loadTicketSettings();

        // Remove ticket from closedTickets if it exists
        settings.closedTickets = settings.closedTickets.filter(
            ticket => ticket.channelId !== channel.id
        );
        saveTicketSettings(settings);

        const now = Math.floor(Date.now() / 1000);
        logInfo(`Ticket reopened: ${channel.name} by ${interaction.user.tag} at <t:${now}:F>`);

        await interaction.reply({
            content: `Ticket reopened by <@${interaction.user.id}> at <t:${now}:F>.`,
            ephemeral: false,
        });
    } catch (error) {
        logError(`Failed to reopen ticket: ${error.message}`);
        await interaction.reply({
            content: 'An error occurred while reopening the ticket.',
            ephemeral: true,
        });
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
    try {
        const modal = new ModalBuilder()
            .setCustomId('close_ticket_modal')
            .setTitle('Close Ticket Information');

        const resolvedInput = new TextInputBuilder()
            .setCustomId('resolved')
            .setLabel('Was the issue resolved? (Yes/No)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const summaryInput = new TextInputBuilder()
            .setCustomId('summary')
            .setLabel('Summary of the issue. Please provide details.')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(resolvedInput),
            new ActionRowBuilder().addComponents(summaryInput)
        );

        // Show the modal
        await interaction.showModal(modal);
        console.log('Modal displayed successfully.');
    } catch (error) {
        console.error(`Error in showCloseTicketModal: ${error.message}`);
    }
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
        .setLabel('Summary of the issue. Please provide details.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(resolvedInput),
        new ActionRowBuilder().addComponents(summaryInput)
    );

    await interaction.showModal(modal);
}

// Format time for Close message
function formatDuration(durationInSeconds) {
    if (durationInSeconds >= 86400) {
        const days = Math.floor(durationInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''}`;
    } else if (durationInSeconds >= 3600) {
        const hours = Math.floor(durationInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (durationInSeconds >= 60) {
        const minutes = Math.floor(durationInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${durationInSeconds} second${durationInSeconds > 1 ? 's' : ''}`;
    }
}

// Handle submission of the close ticket modal.
async function handleCloseTicketSubmission(interaction) {
    try {
        // Retrieve modal inputs
        const resolved = interaction.fields.getTextInputValue('resolved');
        const summary = interaction.fields.getTextInputValue('summary');

        logInfo('Modal inputs for ticket closure received successfully.');

        // Fetch the member's server nickname
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const nickname = member.displayName || interaction.user.username;

        // Record the current timestamp
        const now = new Date().toISOString();

        // Record the closing details
        const closingDetails = {
            closed_at: now,
            closed_by: {
                user_id: interaction.user.id,
                user_nickname: nickname,
            },
            resolved,
            summary,
        };

        // Update the ticket in tickets.json
        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        const tickets = fs.existsSync(ticketsPath) ? JSON.parse(fs.readFileSync(ticketsPath)) : [];
        const ticket = tickets.find(t => t.channel_id === interaction.channel.id);

        if (ticket) {
            ticket.closed = true;
            ticket.closing_details = closingDetails; // Add closing details to the ticket
            ticket.closed_at = now; // Add the closed timestamp

            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 4));
            logInfo(`Ticket ${ticket.ticket_id} updated with closing details: ${JSON.stringify(closingDetails)}`);

            // Add the ticket to settings.closedTickets
            const settings = loadTicketSettings();
            settings.closedTickets.push({
                channelId: interaction.channel.id,
                closedAt: Math.floor(new Date().getTime() / 1000), // Save Unix timestamp for deletion interval check
            });
            saveTicketSettings(settings);
            logInfo(`Ticket ${ticket.ticket_id} added to closedTickets.`);
        } else {
            logError(`Ticket not found for channel ID: ${interaction.channel.id}`);
            return;
        }

        // Generate the closure embed
        const embed = generateClosureEmbed({
            closedBy: nickname,
            timestamp: Math.floor(new Date(closingDetails.closed_at).getTime() / 1000),
            resolved,
            summary,
        });

        // Format the duration for user-friendly output
        const ticketCloseDuration = loadTicketSettings().ticketCloseDuration;
        const formattedDuration = formatDuration(ticketCloseDuration);

        // Send the closure embed in the ticket channel
        await interaction.channel.send({
            embeds: [embed],
            content: `⏳ This ticket will be deleted in ${formattedDuration} unless reopened.`,
        });

        // Reply to the interaction
        await interaction.reply({
            content: 'Ticket has been closed and recorded successfully.',
            ephemeral: true,
        });
    } catch (error) {
        logError(`Failed to handle close ticket submission: ${error.message}`);
        await interaction.reply({
            content: 'An error occurred while closing the ticket.',
            ephemeral: true,
        });
    }
}

// Handle submission of the delete ticket modal.
async function handleDeleteTicketSubmission(interaction) {
    try {
        const resolved = interaction.fields.getTextInputValue('resolved');
        const summary = interaction.fields.getTextInputValue('summary');
        const logPlayer = interaction.channel.name.includes('player_issue')
            ? interaction.fields.getTextInputValue('log_player')
            : null;

        logInfo(`Ticket deleted with details:
            Resolved: ${resolved}
            Summary: ${summary}
            Player Issue: ${logPlayer || 'N/A'}
            Deleted by: ${interaction.user.tag}`);

        // Log details before deleting the ticket
        await interaction.reply({
            content: 'Ticket has been deleted. The response has been logged.',
            ephemeral: true,
        });

        await deleteTicket(interaction);
    } catch (error) {
        logError(`Failed to handle delete ticket submission: ${error.message}`);
        await interaction.reply({
            content: 'An error occurred while deleting the ticket.',
            ephemeral: true,
        });
    }
}

// Auto delete closed tickets
function startTicketDeletionInterval(client) {
    setInterval(async () => {
        const settings = loadTicketSettings();
        const now = Math.floor(Date.now() / 1000);

        logInfo(`Running ticket deletion check at ${now}`);

        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        const tickets = fs.existsSync(ticketsPath) ? JSON.parse(fs.readFileSync(ticketsPath)) : [];
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

                        const ticketData = tickets.find(t => t.channel_id === ticket.channelId);
                        if (ticketData) {
                            await saveTicketToDatabase(ticketData);
                            ticketData.deleted = true;
                            logInfo(`Marked ticket ${ticketData.ticket_id} as deleted in tickets.json`);
                        }
                    }
                } catch (error) {
                    logError(`Failed to delete ticket channel ${ticket.channelId}: ${error.message}`);
                }
            } else {
                remainingTickets.push(ticket);
            }
        }

        // Clean up tickets.json after saving to database
        const cleanedTickets = tickets.filter(t => !t.deleted);
        fs.writeFileSync(ticketsPath, JSON.stringify(cleanedTickets, null, 4));
        logInfo('Cleaned up tickets.json after saving tickets to the database.');

        // Update closedTickets in `ticketSettings.json`
        settings.closedTickets = remainingTickets;
        saveTicketSettings(settings);
    }, 15 * 60 * 1000); // Run every minute
}

// Save ticket to Database
async function saveTicketToDatabase(ticket) {
    try {
        const createdAt = formatMySQLDatetime(ticket.created_at);
        const closedAt = ticket.closed_at ? formatMySQLDatetime(ticket.closed_at) : null;

        const resolved = ticket.closing_details?.resolved || null; // Store resolved as text directly

        const query = `
            INSERT INTO tickets (
                ticket_id, channel_id, user_id, user_nickname, issue_type, details, tag,
                created_at, closed_at, messages, assigned_player, closed_by, closed_by_name, resolved, summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            ticket.ticket_id,
            ticket.channel_id,
            ticket.user_id,
            ticket.user_nickname,
            ticket.issue_type,
            ticket.details,
            ticket.tag,
            createdAt,
            closedAt,
            JSON.stringify(ticket.messages || []),
            JSON.stringify(ticket.assigned_player || null),
            ticket.closing_details?.closed_by?.user_id || null,
            ticket.closing_details?.closed_by?.user_nickname || null,
            resolved, // Store resolved as text
            ticket.closing_details?.summary || null,
        ];

        await pool.execute(query, values);
        logInfo(`Ticket ${ticket.ticket_id} saved to database.`);
    } catch (error) {
        logError(`Failed to save ticket ${ticket.ticket_id} to database: ${error.message}`);
    }
}

// Utility function to format ISO 8601 timestamps for MySQL DATETIME
function formatMySQLDatetime(isoDatetime) {
    const date = new Date(isoDatetime);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

//Records Message to File
async function handleTicketMessage(message) {
    try {
        // Ignore bot messages
        if (message.author.bot) return;

        // Path to tickets.json
        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        if (!fs.existsSync(ticketsPath)) return;

        // Load tickets data
        const tickets = JSON.parse(fs.readFileSync(ticketsPath));
        const ticket = tickets.find(t => t.channel_id === message.channel.id);

        // Check if the message belongs to a ticket
        if (ticket) {
            // Fetch server nickname of the user
            const member = await message.guild.members.fetch(message.author.id);
            const nickname = member.displayName || message.author.username;

            // Append message to the ticket's messages array
            ticket.messages.push({
                user_id: message.author.id,
                user_nickname: nickname,
                timestamp: new Date().toISOString(),
                content: message.content,
            });

            // Save the updated tickets back to the file
            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 4));
            logInfo(`Message logged for ticket ${ticket.ticket_id}: ${message.content}`);
        }
    } catch (error) {
        logError(`Failed to log message: ${error.message}`);
    }
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
                   startTicketDeletionInterval,
                   saveTicketToDatabase,
                   handleTicketMessage 
                };
