const { SlashCommandBuilder } = require('discord.js');
const pool = require('../utils/dbUtils');
const { logError } = require('../handlers/loggingHandler');
const {
    generateOperationSummaryEmbed,
    generateHostSummaryEmbed,
    generateDateSummaryEmbed,
} = require('../embedHandlers/modSummaryEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod_report_summary')
        .setDescription('Generate a mission report summary.')
        .addStringOption(option =>
            option
                .setName('filter')
                .setDescription('Filter by Operation Name, Host Name, or Date')
                .setRequired(true)
                .addChoices(
                    { name: 'Operation Name', value: 'operation_name' },
                    { name: 'Host Name', value: 'host_name' },
                    { name: 'Date', value: 'date' }
                )
        )
        .addStringOption(option =>
            option
                .setName('value')
                .setDescription('Provide the value for filtering (if applicable)')
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName('start_date')
                .setDescription('Start date (YYYY-MM-DD) for date range')
        )
        .addStringOption(option =>
            option
                .setName('end_date')
                .setDescription('End date (YYYY-MM-DD) for date range')
        ),

        async autocomplete(interaction) {
            const focusedValue = interaction.options.getFocused();
            const filter = interaction.options.getString('filter');
        
            let results = [];
            try {
                const connection = await pool.getConnection();
        
                if (filter === 'operation_name') {
                    const query = focusedValue
                        ? `SELECT operation_name FROM (
                            SELECT DISTINCT operation_name, MAX(created_at) AS recent_date
                            FROM mission_reports
                            WHERE operation_name LIKE ?
                            GROUP BY operation_name
                          ) AS subquery
                          ORDER BY recent_date DESC LIMIT 10`
                        : `SELECT operation_name FROM (
                            SELECT DISTINCT operation_name, MAX(created_at) AS recent_date
                            FROM mission_reports
                            GROUP BY operation_name
                          ) AS subquery
                          ORDER BY recent_date DESC LIMIT 10`;
        
                    const [rows] = await connection.execute(query, focusedValue ? [`%${focusedValue}%`] : []);
                    results = rows.map(row => ({
                        name: row.operation_name,
                        value: row.operation_name,
                    }));
                } else if (filter === 'host_name') {
                    const [rows] = await connection.execute(`SELECT DISTINCT host_id FROM mission_reports`);
                    console.log(`[DEBUG] Host IDs from DB:`, rows);
        
                    results = await Promise.all(
                        rows.map(async row => {
                            const hostId = row.host_id;
        
                            if (!hostId || hostId === "Unknown Host") {
                                // Skip invalid host IDs
                                console.warn(`[WARN] Skipping invalid host_id:`, hostId);
                                return null;
                            }
        
                            try {
                                // Fetch the Discord member by host ID
                                const member = await interaction.guild.members.fetch(hostId);
                                const nickname = member?.displayName || 'Unknown Host';
                                console.log(`[DEBUG] Resolved Host ID ${hostId}: ${nickname}`);
        
                                if (!focusedValue || nickname.toLowerCase().includes(focusedValue.toLowerCase())) {
                                    return { name: nickname, value: hostId };
                                }
                            } catch (error) {
                                console.error(`[ERROR] Failed to fetch member for host_id ${hostId}:`, error.message);
                                return null; // Gracefully handle fetch errors
                            }
                        })
                    );
        
                    // Remove null results and sort alphabetically
                    results = results.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
                }
        
                connection.release();
            } catch (error) {
                logError(`[Autocomplete Error] ${error.message}`);
            }
        
            await interaction.respond(results.length ? results : []);
        },

    async execute(interaction) {
        await interaction.deferReply();

        const filter = interaction.options.getString('filter');
        const value = interaction.options.getString('value');
        const startDate = interaction.options.getString('start_date');
        const endDate = interaction.options.getString('end_date');

        try {
            const connection = await pool.getConnection();
            let rows = [];
            if (filter === 'operation_name') {
                [rows] = await connection.execute(
                    `SELECT * FROM mission_reports WHERE operation_name = ? ORDER BY created_at ASC`,
                    [value]
                );
                if (!rows.length) {
                    await interaction.editReply({ content: 'No reports found for this operation.' });
                    return;
                }
                const embed = generateOperationSummaryEmbed(value, rows, interaction.guild);
                await interaction.editReply({ embeds: [embed] });
            } else if (filter === 'host_name') {
                [rows] = await connection.execute(
                    `SELECT * FROM mission_reports WHERE host_id = ? ORDER BY created_at ASC`,
                    [value]
                );
                if (!rows.length) {
                    await interaction.editReply({ content: 'No reports found for this host.' });
                    return;
                }
                const embed = generateHostSummaryEmbed(value, rows, interaction.guild);
                await interaction.editReply({ embeds: [embed] });
            } else if (filter === 'date') {
                const startDateTime = `${startDate} 00:00:00`;
                const endDateTime = `${endDate} 23:59:59`;
                [rows] = await connection.execute(
                    `SELECT * FROM mission_reports WHERE created_at BETWEEN ? AND ? ORDER BY created_at ASC`,
                    [startDateTime, endDateTime]
                );
                if (!rows.length) {
                    await interaction.editReply({ content: 'No reports found for this date range.' });
                    return;
                }
                const embed = generateDateSummaryEmbed(startDate, endDate, rows, interaction.guild);
                await interaction.editReply({ embeds: [embed] });
            }
            connection.release();
        } catch (error) {
            logError(`[Execute Error] ${error.message}`);
            await interaction.editReply({ content: 'An error occurred while generating the summary.' });
        }
    },
};
