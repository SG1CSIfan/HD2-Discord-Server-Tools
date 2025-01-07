const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateSubmittedReportEmbed } = require('../embedHandlers/missionEmbed');
const { loadModReportSettings } = require('../utils/fileUtils');
const mysql = require('mysql2/promise');

// Handle the "Submit MOD Report" button interaction
async function handleOpenMissionReportModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('submit_mission_report')
        .setTitle('Submit MOD Report');

    const planetNameInput = new TextInputBuilder()
        .setCustomId('planet_name')
        .setLabel('Planet Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: Mastia')
        .setRequired(true);

    const operationsInput = new TextInputBuilder()
        .setCustomId('operations')
        .setLabel('Operations (Succeeded / Total)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: 3/5')
        .setRequired(true);

    const missionsInput = new TextInputBuilder()
        .setCustomId('missions')
        .setLabel('Missions (Succeeded / Total)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: 6/7')
        .setRequired(true);

    const squadInput = new TextInputBuilder()
        .setCustomId('squad')
        .setLabel('Squad (List player names)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Example: Player1, Player2, Player3')
        .setRequired(true);

    const missionNotesInput = new TextInputBuilder()
        .setCustomId('mission_info')
        .setLabel('Mission Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Additional mission details (optional)')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(planetNameInput),
        new ActionRowBuilder().addComponents(operationsInput),
        new ActionRowBuilder().addComponents(missionsInput),
        new ActionRowBuilder().addComponents(squadInput),
        new ActionRowBuilder().addComponents(missionNotesInput)
    );

    await interaction.showModal(modal);
}

// Handle modal submission
async function handleMissionReportSubmission(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const planetName = interaction.fields.getTextInputValue('planet_name').trim();
    const operations = interaction.fields.getTextInputValue('operations').trim();
    const missions = interaction.fields.getTextInputValue('missions').trim();
    const squad = interaction.fields.getTextInputValue('squad') || 'Unknown';
    const missionNotes = interaction.fields.getTextInputValue('mission_info') || 'None';

    const formatRegex = /^(\d+)\s*\/\s*(\d+)$/;

    const operationsMatch = operations.match(formatRegex);
    const missionsMatch = missions.match(formatRegex);

    if (!operationsMatch || !missionsMatch) {
        await interaction.editReply({
            content: 'Invalid format for Operations or Missions. Please use "# / #" or "#/#" format with valid numbers.',
            ephemeral: true,
        });
        return;
    }

    const [operationsSucceeded, operationsTotal] = operationsMatch.slice(1).map(Number);
    const [missionsSucceeded, missionsTotal] = missionsMatch.slice(1).map(Number);

    if (
        isNaN(operationsSucceeded) ||
        isNaN(operationsTotal) ||
        isNaN(missionsSucceeded) ||
        isNaN(missionsTotal) ||
        operationsSucceeded > operationsTotal ||
        missionsSucceeded > missionsTotal
    ) {
        await interaction.editReply({
            content: 'Invalid values in Operations or Missions. Ensure succeeded <= total and use valid numbers.',
            ephemeral: true,
        });
        return;
    }

    const settings = loadModReportSettings();
    const operationName = settings.operationName || 'Unknown Operation';
    const hostId = settings.hostId || null;

    if (!hostId) {
        await interaction.editReply({
            content: 'Host information is missing. Please contact an administrator.',
            ephemeral: true,
        });
        return;
    }

    const submitterId = interaction.user.id;

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        // Insert the mission report into the database
        const [result] = await connection.execute(
            `INSERT INTO mission_reports 
            (operation_name, operations_succeeded, operations_total, missions_succeeded, missions_total, squad, mission_notes, submitted_by, planet_name, host_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                operationName,
                operationsSucceeded,
                operationsTotal,
                missionsSucceeded,
                missionsTotal,
                squad,
                missionNotes,
                submitterId,
                planetName,
                hostId,
            ]
        );

        const reportId = result.insertId;

        const embed = await generateSubmittedReportEmbed(
            {
                id: reportId,
                planetName,
                operationsSucceeded,
                operationsTotal,
                missionsSucceeded,
                missionsTotal,
                squad,
                missionNotes,
                operationName,
                submittedBy: submitterId,
                hostId,
            },
            interaction.guild
        );

        const editRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`edit_report_${reportId}`)
                .setLabel('Edit Report')
                .setStyle(ButtonStyle.Primary)
        );

        const submissionChannel = interaction.guild.channels.cache.get(settings.submissionChannelId);

        let submissionMessage;
        if (submissionChannel) {
            submissionMessage = await submissionChannel.send({ embeds: [embed] });
        }

        // Save the message ID in the database
        if (submissionMessage) {
            await connection.execute(
                'UPDATE mission_reports SET message_id = ? WHERE id = ?',
                [submissionMessage.id, reportId]
            );
        }

        await connection.end();

        // Send an ephemeral response to the user
        await interaction.editReply({
            content: 'Your mission report has been submitted successfully. You can edit it within 10 minutes.',
            embeds: [embed],
            components: [editRow],
        });
    } catch (error) {
        console.error('[ERROR] Failed to handle mission report submission:', error);
        await interaction.editReply({
            content: 'An error occurred while submitting your report. Please try again later.',
            ephemeral: true,
        });
    }
}

async function handleEditReport(interaction) {
    const reportId = interaction.customId.split('_')[2]; // Extract the report ID

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [rows] = await connection.execute(
        'SELECT * FROM mission_reports WHERE id = ? AND submitted_by = ?',
        [reportId, interaction.user.id]
    );

    if (!rows.length) {
        await interaction.reply({
            content: 'You are not authorized to edit this report or it no longer exists.',
            ephemeral: true,
        });
        return;
    }

    const report = rows[0];

    const modal = new ModalBuilder()
        .setCustomId(`edit_modal_${reportId}`)
        .setTitle('Edit MOD Report');

    const planetNameInput = new TextInputBuilder()
        .setCustomId('planet_name')
        .setLabel('Planet Name')
        .setStyle(TextInputStyle.Short)
        .setValue(report.planet_name)
        .setRequired(true);

    const operationsInput = new TextInputBuilder()
        .setCustomId('operations')
        .setLabel('Operations (Succeeded / Total)')
        .setStyle(TextInputStyle.Short)
        .setValue(`${report.operations_succeeded}/${report.operations_total}`)
        .setRequired(true);

    const missionsInput = new TextInputBuilder()
        .setCustomId('missions')
        .setLabel('Missions (Succeeded / Total)')
        .setStyle(TextInputStyle.Short)
        .setValue(`${report.missions_succeeded}/${report.missions_total}`)
        .setRequired(true);

    const squadInput = new TextInputBuilder()
        .setCustomId('squad')
        .setLabel('Squad (List player names)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(report.squad)
        .setRequired(true);

    const missionNotesInput = new TextInputBuilder()
        .setCustomId('mission_info')
        .setLabel('Mission Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(report.mission_notes)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(planetNameInput),
        new ActionRowBuilder().addComponents(operationsInput),
        new ActionRowBuilder().addComponents(missionsInput),
        new ActionRowBuilder().addComponents(squadInput),
        new ActionRowBuilder().addComponents(missionNotesInput)
    );

    await connection.end();

    await interaction.showModal(modal);
}


async function handleEditReportSubmission(interaction) {
    const reportId = interaction.customId.split('_')[2]; // Extract the report ID

    // Fetch new modal values
    const planetName = interaction.fields.getTextInputValue('planet_name').trim();
    const operations = interaction.fields.getTextInputValue('operations').trim();
    const missions = interaction.fields.getTextInputValue('missions').trim();
    const squad = interaction.fields.getTextInputValue('squad') || 'Unknown';
    const missionNotes = interaction.fields.getTextInputValue('mission_info') || 'None';

    // Regex to validate the format (e.g., "1/1" or "1 / 1")
    const formatRegex = /^(\d+)\s*\/\s*(\d+)$/;

    const operationsMatch = operations.match(formatRegex);
    const missionsMatch = missions.match(formatRegex);

    // Validate input formats
    if (!operationsMatch || !missionsMatch) {
        await interaction.reply({
            content: 'Invalid format for Operations or Missions. Please use "# / #" or "#/#" format with valid numbers.',
            ephemeral: true,
        });
        return;
    }

    const [operationsSucceeded, operationsTotal] = operationsMatch.slice(1).map(Number);
    const [missionsSucceeded, missionsTotal] = missionsMatch.slice(1).map(Number);

    if (
        isNaN(operationsSucceeded) ||
        isNaN(operationsTotal) ||
        isNaN(missionsSucceeded) ||
        isNaN(missionsTotal) ||
        operationsSucceeded > operationsTotal ||
        missionsSucceeded > missionsTotal
    ) {
        await interaction.reply({
            content: 'Invalid values in Operations or Missions. Ensure succeeded <= total and use valid numbers.',
            ephemeral: true,
        });
        return;
    }

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        // Update the mission report in the database
        await connection.execute(
            `UPDATE mission_reports SET 
            planet_name = ?, operations_succeeded = ?, operations_total = ?, missions_succeeded = ?, missions_total = ?, squad = ?, mission_notes = ?
            WHERE id = ? AND submitted_by = ?`,
            [
                planetName,
                operationsSucceeded,
                operationsTotal,
                missionsSucceeded,
                missionsTotal,
                squad,
                missionNotes,
                reportId,
                interaction.user.id,
            ]
        );

        // Retrieve the updated report data
        const [rows] = await connection.execute(
            'SELECT * FROM mission_reports WHERE id = ?',
            [reportId]
        );

        const updatedReport = rows[0];

        // Generate the updated embed
        const updatedEmbed = await generateSubmittedReportEmbed(
            {
                id: updatedReport.id,
                planetName: updatedReport.planet_name,
                operationsSucceeded: updatedReport.operations_succeeded,
                operationsTotal: updatedReport.operations_total,
                missionsSucceeded: updatedReport.missions_succeeded,
                missionsTotal: updatedReport.missions_total,
                squad: updatedReport.squad,
                missionNotes: updatedReport.mission_notes,
                operationName: updatedReport.operation_name,
                submittedBy: updatedReport.submitted_by,
                hostId: updatedReport.host_id,
            },
            interaction.guild
        );

        // Fetch the submission channel and update the embed
        const submissionChannel = interaction.guild.channels.cache.get(process.env.SUBMISSION_CHANNEL_ID); // Replace with your method of storing the channel ID
        if (submissionChannel) {
            const message = await submissionChannel.messages.fetch(updatedReport.message_id).catch(() => null);
            if (message) {
                await message.edit({ embeds: [updatedEmbed] });
            } else {
                console.error(`Message with ID ${updatedReport.message_id} not found in submission channel.`);
            }
        }

        await connection.end();

        // Inform the user of the successful update
        await interaction.reply({
            content: 'Your mission report has been successfully updated, and the main embed has been updated as well.',
            ephemeral: true,
        });
    } catch (error) {
        console.error('[ERROR] Failed to handle edit report submission:', error);
        await interaction.reply({
            content: 'An error occurred while updating your report. Please try again later.',
            ephemeral: true,
        });
    }
}


module.exports = { handleOpenMissionReportModal, handleMissionReportSubmission, handleEditReport, handleEditReportSubmission };
