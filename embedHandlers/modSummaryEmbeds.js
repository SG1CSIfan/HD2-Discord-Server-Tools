const { EmbedBuilder } = require('discord.js');

function generateOperationSummaryEmbed(operationName, reports, guild) {
    const totalReports = reports.length;
    const succeededOperations = reports.reduce((sum, report) => sum + report.operations_succeeded, 0);
    const failedOperations = reports.reduce((sum, report) => sum + (report.operations_total - report.operations_succeeded), 0);
    const totalOperations = succeededOperations + failedOperations;

    const succeededMissions = reports.reduce((sum, report) => sum + report.missions_succeeded, 0);
    const failedMissions = reports.reduce((sum, report) => sum + (report.missions_total - report.missions_succeeded), 0);
    const totalMissions = succeededMissions + failedMissions;

    const host = guild.members.cache.get(reports[0].host_id);
    const hostName = host?.displayName || 'Unknown';
    const hostRole = host?.roles.highest.name || 'No Role';

    const modDate = `<t:${Math.floor(new Date(reports[0].created_at).getTime() / 1000)}:D>`;

    return new EmbedBuilder()
        .setTitle('1st Colonial Regiment: MOD Report')
        .setDescription(`**Operation:** ${operationName}`)
        .setColor(0x3498db)
        .addFields(
            { name: 'Host | Rank', value: `${hostName} - ${hostRole}`, inline: true },
            { name: 'MOD Date', value: modDate, inline: true },
            { name: '** **', value:'** **',inline: false},
            { name: 'Total Reports', value: `${totalReports}`, inline: true },
            { name: 'Est. Helldivers Per MOD', value: `${totalReports * 4}`, inline: true },
            { name: '** **', value: '** **', inline: false},
            {
                name: 'Operations',
                value: `- Failed: **${failedOperations}**\n- Succeeded: **${succeededOperations}**\n- Total: **${totalOperations}**`,
                inline: true,
            },
            {
                name: 'Missions',
                value: `- Failed: **${failedMissions}**\n- Succeeded: **${succeededMissions}**\n- Total: **${totalMissions}**`,
                inline: true,
            }
        )
        .setFooter({ text: 'Helldivers 2 | Mission Report System' });
}

function generateHostSummaryEmbed(hostId, reports, guild) {
    const uniqueOperations = [...new Set(reports.map(report => report.operation_name))];
    const modNames = uniqueOperations.join('\n');
    const modDates = uniqueOperations
        .map(opName => {
            const report = reports.find(r => r.operation_name === opName);
            return `<t:${Math.floor(new Date(report.created_at).getTime() / 1000)}:D>`;
        })
        .join('\n');

    const succeededOperations = reports.reduce((sum, report) => sum + report.operations_succeeded, 0);
    const failedOperations = reports.reduce((sum, report) => sum + (report.operations_total - report.operations_succeeded), 0);
    const totalOperations = succeededOperations + failedOperations;

    const succeededMissions = reports.reduce((sum, report) => sum + report.missions_succeeded, 0);
    const failedMissions = reports.reduce((sum, report) => sum + (report.missions_total - report.missions_succeeded), 0);
    const totalMissions = succeededMissions + failedMissions;

    const member = guild.members.cache.get(hostId);
    const hostName = member?.displayName || 'Unknown';
    const hostRole = member?.roles.highest.name || 'No Role';

    return new EmbedBuilder()
        .setTitle('1st Colonial Regiment: Host Report')
        .setDescription(`**Host:** ${hostName} | ${hostRole}`)
        .setColor(0x3498db)
        .addFields(
            { name: 'Total MODs', value: `${uniqueOperations.length}`, inline: false },
            { name: 'MOD Names', value: modNames || 'None', inline: true },
            { name: 'MOD Dates', value: modDates || 'None', inline: true },
            { name: 'Est. Helldivers Total', value: `${reports.length * 4}`, inline: false },         
            {
                name: 'Operations',
                value: `- Failed: **${failedOperations}**\n- Succeeded: **${succeededOperations}**\n- Total: **${totalOperations}**`,
                inline: true,
            },
            {
                name: 'Missions',
                value: `- Failed: **${failedMissions}**\n- Succeeded: **${succeededMissions}**\n- Total: **${totalMissions}**`,
                inline: true,
            }
        )
        .setFooter({ text: 'Helldivers 2 | Mission Report System' });
}

function generateDateSummaryEmbed(startDate, endDate, reports, guild) {
    const uniqueOperations = [...new Set(reports.map(report => report.operation_name))];
    const uniqueHosts = [...new Set(reports.map(report => report.host_id))];

    const succeededOperations = reports.reduce((sum, report) => sum + report.operations_succeeded, 0);
    const failedOperations = reports.reduce((sum, report) => sum + (report.operations_total - report.operations_succeeded), 0);
    const totalOperations = succeededOperations + failedOperations;

    const succeededMissions = reports.reduce((sum, report) => sum + report.missions_succeeded, 0);
    const failedMissions = reports.reduce((sum, report) => sum + (report.missions_total - report.missions_succeeded), 0);
    const totalMissions = succeededMissions + failedMissions;

    const hosts = uniqueHosts
        .map(hostId => {
            const member = guild.members.cache.get(hostId);
            return member?.displayName || 'Unknown';
        })
        .join('\n');

    return new EmbedBuilder()
        .setTitle('1st Colonial Regiment: Dates Report')
        .setDescription(`**Dates:** ${startDate} - ${endDate}`)
        .setColor(0x3498db)
        .addFields(
            { name: 'Total MODs', value: `${uniqueOperations.length}`, inline: true },
            { name: 'Total Hosts', value: `${uniqueHosts.length}`, inline: true },
            { name: '** **', value: '** **', inline: false },
            {
                name: 'Operations',
                value: `- Failed: **${failedOperations}**\n- Succeeded: **${succeededOperations}**\n- Total: **${totalOperations}**`,
                inline: true,
            },
            {
                name: 'Missions',
                value: `- Failed: **${failedMissions}**\n- Succeeded: **${succeededMissions}**\n- Total: **${totalMissions}**`,
                inline: true,
            },
            { name: 'Est. Total Helldivers', value: `${reports.length * 4}`, inline: false },
            { name: 'Total Reports Submitted', value: `${reports.length}`, inline: false }, // Fixed this
            { name: 'Hosts', value: hosts || 'None', inline: true },
            { name: '# of MODs', value: `${uniqueOperations.length}`, inline: true }, // Fixed undefined `modsColumn`
        )
        .setFooter({ text: 'Helldivers 2 | Mission Report System' });
}

module.exports = {
    generateOperationSummaryEmbed,
    generateHostSummaryEmbed,
    generateDateSummaryEmbed,
};
