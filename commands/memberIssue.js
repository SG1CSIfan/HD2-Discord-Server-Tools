const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logInfo, logError } = require('../handlers/loggingHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign_member')
        .setDescription('Assign a player to a Player Issue ticket.')
        .addStringOption(option =>
            option
                .setName('player')
                .setDescription('Start typing the player’s username or nickname.')
                .setAutocomplete(true)
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const playerId = interaction.options.getString('player');
            const member = await interaction.guild.members.fetch(playerId);
            const channel = interaction.channel;

            // Load ticket settings and JSON data
            const ticketSettings = require('../data/ticketSettings.json');
            const supportRoleId = ticketSettings.roleId;
            const ticketsPath = path.join(__dirname, '../data/tickets.json');
            const tickets = fs.existsSync(ticketsPath) ? JSON.parse(fs.readFileSync(ticketsPath)) : [];
            const ticket = tickets.find(t => t.channel_id === channel.id);

            if (!ticket) {
                await interaction.reply({
                    content: 'This ticket could not be found in the records.',
                    ephemeral: true,
                });
                return;
            }

            // Ensure the ticket is a Player Issue
            if (ticket.tag !== 'Player Issue') {
                await interaction.reply({
                    content: 'This command can only be used for tickets tagged as "Player Issue."',
                    ephemeral: true,
                });
                return;
            }

            // Remove the player from the channel if they have the support role
            if (member.roles.cache.has(supportRoleId)) {
                await channel.permissionOverwrites.edit(member.id, {
                    ViewChannel: false, // Deny access to the reported player
                });
                logInfo(`Removed access for reported player ${member.displayName} in ticket ${channel.name}`);
            }

            // Fetch messages in the channel to find the first embed
            const messages = await channel.messages.fetch({ limit: 10 });
            const firstEmbedMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title.includes('New Ticket Submission'));

            if (!firstEmbedMessage) {
                await interaction.reply({
                    content: 'Unable to find the initial ticket submission embed.',
                    ephemeral: true,
                });
                return;
            }

            // Update the embed with the player's server nickname
            const embed = firstEmbedMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(embed).setFields(
                ...embed.fields.map(field => {
                    if (field.name === 'Player Issue Name') {
                        return { name: 'Player Issue Name', value: member.displayName, inline: true };
                    }
                    return field;
                })
            );

            await firstEmbedMessage.edit({ embeds: [updatedEmbed] });

            // Log the assigned player in tickets.json
            ticket.assigned_player = {
                user_id: member.id,
                user_nickname: member.displayName || member.user.username,
                assigned_at: new Date().toISOString(),
            };

            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 4));
            logInfo(`Assigned player ${member.displayName} (${member.id}) to ticket ${ticket.ticket_id}.`);

            // Confirm the action to the user
            await interaction.reply({
                content: `Player **${member.displayName}** has been assigned to this Player Issue. They have been removed from this ticket if they belong to the support role.`,
                ephemeral: true,
            });

            logInfo(`Player ${member.displayName} assigned to ticket ${channel.name}.`);
        } catch (error) {
            logError(`Failed to assign player: ${error.message}`);
            await interaction.reply({
                content: 'An error occurred while assigning the player.',
                ephemeral: true,
            });
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();

            // Fetch all members dynamically
            const members = await interaction.guild.members.fetch({ force: true });

            // Filter and format members
            const filteredMembers = members
                .filter(
                    member =>
                        member.user.username.toLowerCase().includes(focusedValue.toLowerCase()) ||
                        member.displayName.toLowerCase().includes(focusedValue.toLowerCase())
                )
                .map(member => ({
                    name: member.displayName || member.user.username,
                    value: member.id, // Use member ID for accurate identification
                }))
                .slice(0, 25); // Limit to 25 results

            await interaction.respond(filteredMembers);
        } catch (error) {
            logError(`Failed to handle autocomplete: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
