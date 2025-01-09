const { EmbedBuilder } = require('discord.js');

function generateAnonymousSubmissionEmbed(data) {
    return new EmbedBuilder()
        .setTitle('📩 Anonymous Issue Report')
        .setColor(0x7289da)
        .addFields(
            { name: 'Category', value: data.category, inline: true },
            { name: 'Type', value: data.type, inline: true },
            { name: 'Details', value: data.details, inline: false },
            { name: 'Players Tagged', value: data.players !== 'None' ? data.players : 'No players tagged', inline: false }
        )
        .setTimestamp();
}

module.exports = { generateAnonymousSubmissionEmbed };
