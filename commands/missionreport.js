const { SlashCommandBuilder } = require('discord.js');
const { generateMainEmbed } = require('../embedHandlers/missionEmbed');
const { loadModReportSettings, saveModReportSettings } = require('../utils/fileUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod_report_setup')
        .setDescription('Set up or update the MOD Report Submission system.')
        .addStringOption(option =>
            option.setName('operation_name')
                .setDescription('The name of the operation.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const operationName = interaction.options.getString('operation_name');
        const hostId = interaction.user.id; // Use the command executor as the host

        const settings = loadModReportSettings();

        const channelId = settings.mainEmbedChannelId || interaction.channelId;

        try {
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) throw new Error('Main embed channel not found.');

            const { embed, row } = await generateMainEmbed(operationName, hostId, interaction.guild);

            if (settings.mainEmbedMessageId) {
                const message = await channel.messages.fetch(settings.mainEmbedMessageId).catch(() => null);
                if (message) {
                    await message.edit({ embeds: [embed], components: [row] });
                } else {
                    const newMessage = await channel.send({ embeds: [embed], components: [row] });
                    settings.mainEmbedMessageId = newMessage.id;
                }
            } else {
                const newMessage = await channel.send({ embeds: [embed], components: [row] });
                settings.mainEmbedMessageId = newMessage.id;
            }

            settings.mainEmbedChannelId = channelId;
            settings.operationName = operationName;
            settings.hostId = hostId; // Store the host ID in the settings
            saveModReportSettings(settings);

            await interaction.reply({
                content: 'MOD Report Submission embed set up successfully.',
                ephemeral: true,
            });
        } catch (error) {
            console.error('[ERROR] Failed to set up MOD Report Submission system:', error);
            await interaction.reply({
                content: 'Failed to set up MOD Report Submission system.',
                ephemeral: true,
            });
        }
    },
};
