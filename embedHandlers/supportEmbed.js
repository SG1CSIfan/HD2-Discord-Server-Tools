const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

 // Generate the support embed and buttons.
function generateSupportEmbed() {
    const embed = new EmbedBuilder()
    .setTitle("1st Colonial Regiment - Support | Promotions")
    .setDescription("Welcome, brave member of the 1st Colonial Regiment! Need assistance?\n\n**Common issues include:**\n__General Issue__ - Any issue outside the below buttons\n__IRON Issue__ - Issue with IRON\n__Bot Issue__ - Issues with one of the Bots (Please provide details and images if possible)\n__Player Issues__ -  Issue with another player\n__Promotion__ - Apply For a promotion.\n\nClick Submit Ticket to reach Command HQ. Your comrades are here to help!")
    .setColor(0x1f8b4c)
    .addFields(
        {
          name: "**__PROMOTIONS__**",
          value: "This bot handles applications for the following:",
          inline: false
        },
        {
          name: "Current Rank",
          value: "Steward\nDeployment Chief\nDeployment Supreme",
          inline: true
        },
        {
          name: "Next Rank",
          value: "Deployment Officer\nDeployment Supreme\nFreedom Captain",
          inline: true
        },
        {
          name: "IRON Needed",
          value: "[ V ] (5 IRON)\n[ X ] (10 IRON)\n[ X ] (10 IRON)",
          inline: true
        },
      )
      
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
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('promotion_application')
            .setLabel('Promotion')
            .setStyle(ButtonStyle.Success)
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
