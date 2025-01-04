const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
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

            // Check if the reported player has the support role
            const ticketSettings = require('../data/ticketSettings.json');
            const supportRoleId = ticketSettings.roleId;

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
