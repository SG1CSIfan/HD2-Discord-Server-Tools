const { generateAnonymousSubmissionEmbed } = require('../embedhandlers/AnonymousSubmissionEmbed');
const { logInfo, logError } = require('./loggingHandler');
const { loadAnonymousSubmissionsSettings } = require('../utils/fileUtils');

async function handleAnonymousSubmission(interaction) {
    try {
        const category = interaction.customId.split('_')[2]; // Tag for the issue
        const issueType = interaction.fields.getTextInputValue('issue_type');
        const details = interaction.fields.getTextInputValue('issue_details');
        const players = interaction.client.playersMentioned || 'None';

        const settings = loadAnonymousSubmissionsSettings('AnonymousSubmissionSettings.json');
        const submissionChannel = interaction.client.channels.cache.get(settings.submissionChannelId);

        // Create mentions for all roles listed in rolePings
        const roleMentions = Object.values(settings.rolePings)
            .map(roleId => `<@&${roleId}>`)
            .join(' ');

        const embed = generateAnonymousSubmissionEmbed({
            category,
            type: issueType,
            details,
            players,
        });

        if (submissionChannel) {
            const content = roleMentions || 'No roles configured.';
            await submissionChannel.send({ content, embeds: [embed] });
        }

        await interaction.reply({ content: 'Your submission has been sent.', ephemeral: true });
        logInfo(`Anonymous submission handled successfully for category: ${category}. Roles notified: ${roleMentions}`);
    } catch (error) {
        logError(`Failed to handle anonymous submission: ${error.message}`);
        await interaction.reply({ content: 'An error occurred while processing your submission.', ephemeral: true });
    }
}




module.exports = { handleAnonymousSubmission };