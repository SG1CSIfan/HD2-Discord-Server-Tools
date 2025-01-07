const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function generateMainEmbed(operationName, hostId, guild) {
    let hostNickname = 'Unknown Host';
    try {
        const member = guild.members.cache.get(hostId);
        hostNickname = member ? member.displayName : 'Unknown Host';
    } catch (error) {
        console.error(`[ERROR] Failed to resolve host ID ${hostId}:`, error);
    }

    const embed = new EmbedBuilder()
        .setTitle('📜 MOD Report Submission')
        .setDescription(
            `Welcome to the **1st Colonial Regiment MOD Reporting System**.\n\n` +
            `**Operation Name:** ${operationName}\n` +
            `**Host:** ${hostNickname}\n\n` +
            'Click the button below to submit a MOD Report for a completed deployment.\n\n' +
            '• You have **10 minutes** to edit your report after submission.\n' +
            '• To request changes after 10 minutes, please submit a ticket.'
        )
        .setColor(0x1f8b4c)
        .setFooter({ text: '1st Colonial Regiment | Helldivers 2' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_mission_report_modal')
            .setLabel('Submit MOD Report')
            .setStyle(ButtonStyle.Success)
    );

    return { embed, row };
}

async function generateSubmittedReportEmbed(report, guild) {
    let submitterName = 'Unknown Submitter';

    try {
        const submitter = await guild.members.fetch(report.submittedBy);
        submitterName = submitter ? submitter.displayName : 'Unknown Submitter';
    } catch (error) {
        console.error(`[ERROR] Failed to resolve submitter ID ${report.submittedBy}:`, error);
    }

    return new EmbedBuilder()
        .setTitle(`Mission Report #${report.id} - ${report.operationName}`)
        .setDescription('A new mission report has been submitted.')
        .setColor(0x2ecc71)
        .addFields(
            { name: 'Planet Name', value: report.planetName, inline: true },
            { name: 'Operations Succeeded/Total', value: `${report.operationsSucceeded}/${report.operationsTotal}`, inline: true },
            { name: 'Missions Succeeded/Total', value: `${report.missionsSucceeded}/${report.missionsTotal}`, inline: true },
            { name: 'Squad', value: report.squad, inline: false },
            { name: 'Mission Notes', value: report.missionNotes || 'None', inline: false },
            { name: 'Submitted By', value: submitterName, inline: true }
        )
        .setFooter({ text: `Report ID: ${report.id}` })
        .setTimestamp();
}

module.exports = { generateMainEmbed, generateSubmittedReportEmbed };
