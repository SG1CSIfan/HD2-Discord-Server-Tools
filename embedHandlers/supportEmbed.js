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



//Ticket submission info embed.
function generateSubmissionEmbed(data) {
    const embed = new EmbedBuilder()
        .setTitle('🎟️ New Ticket Submission')
        .setDescription('A new ticket has been submitted.')
        .setColor(0x1f8b4c)
        .addFields(
            { name: 'User', value: data.user, inline: true },
            { name: 'Date & Time', value: `<t:${data.timestamp}:F>`, inline: true },
            { name: 'Tag', value: data.tag, inline: false },
            { name: 'Type of Issue', value: data.issueType, inline: false },
            { name: 'Details', value: data.details, inline: false }
        );

    // Add Player Issue Name field conditionally
    if (data.tag === 'Player Issue') {
        embed.addFields({
            name: 'Player Issue Name',
            value: data.playerName || 'None',
            inline: true,
        });
    }

    return embed;
}

//Ticket submission closed embed.
function generateClosureEmbed(data) {
    return new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription('The ticket has been closed.')
        .setColor(0x2e3136)
        .addFields(
            { name: 'Closed By', value: data.closedBy, inline: true },
            { name: 'Date & Time', value: `<t:${data.timestamp}:F>`, inline: true },
            { name: 'Resolved', value: data.resolved, inline: false },
            { name: 'Summary', value: data.summary || 'No summary provided.', inline: false }
        );
}

module.exports = { generateSupportEmbed, generateSubmissionEmbed, generateClosureEmbed };
