const { loadPromotionSettings } = require('../utils/fileUtils');
const { parseIRON, romanToDecimal, getEligibleRank } = require('../utils/ironUtils');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

async function showPromotionModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('promotion_application_modal')
        .setTitle('Promotion Application');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for Promotion')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const contributionsInput = new TextInputBuilder()
        .setCustomId('contributions')
        .setLabel('Your Recent Contributions to the 1CR')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const leaderInput = new TextInputBuilder()
        .setCustomId('leader')
        .setLabel('Who is the Leader of the 1CR?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput),
        new ActionRowBuilder().addComponents(contributionsInput),
        new ActionRowBuilder().addComponents(leaderInput)
    );

    await interaction.showModal(modal);
}

async function processPromotion(interaction, approved) {
    const settings = loadPromotionSettings();
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const currentIRON = parseIRON(member.displayName);
    const eligibleRank = getEligibleRank(currentIRON, member.roles.cache.map(role => role.id), settings.ranks);

    if (!eligibleRank) {
        await interaction.reply({ content: 'You do not meet the requirements for promotion.', flags: 64 });
        return;
    }

    if (approved) {
        const { roleId, casteRoleId, nextRank } = eligibleRank;

        // Remove current roles
        await member.roles.remove([roleId, casteRoleId]);

        // Add new roles
        const nextRoleData = settings.ranks[nextRank];
        if (nextRoleData) {
            await member.roles.add([nextRoleData.roleId, nextRoleData.casteRoleId]);

            // Send confirmation embed
            const promotionEmbed = new EmbedBuilder()
                .setTitle('Promotion Approved')
                .setColor(0x1f8b4c)
                .setDescription(`${member.displayName} has been promoted to **${nextRank}**! Congratulations!`);

            await interaction.channel.send({ embeds: [promotionEmbed] });
        }
    } else {
        await handleDenial(interaction);
    }
}

async function handleDenial(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('denial_reason_modal') // Matches the handler in interactionHandler.js
        .setTitle('Promotion Denial Reason');

    const reasonInput = new TextInputBuilder()
        .setCustomId('denial_reason') // Matches the retrieval in handleDenialReasonSubmission
        .setLabel('Reason for Denial')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
}

async function finalizeDenial(interaction) {
    const reason = interaction.fields.getTextInputValue('reason');
    const member = await interaction.guild.members.fetch(interaction.user.id);

    const denialEmbed = new EmbedBuilder()
        .setTitle('Promotion Denied')
        .setColor(0xff0000)
        .setDescription(
            `${member.displayName}, your promotion application was denied.`
        )
        .addFields({ name: 'Reason', value: reason });

    await member.send({ embeds: [denialEmbed] });
    await interaction.reply({ content: 'Denial reason sent to the applicant.', ephemeral: true });
}

async function handlePromotionSubmission(interaction) {
    try {
        const reason = interaction.fields.getTextInputValue('reason');
        const contributions = interaction.fields.getTextInputValue('contributions');
        const leader = interaction.fields.getTextInputValue('leader');
        const member = await interaction.guild.members.fetch(interaction.user.id);

        console.log(`Promotion Application: ${member.displayName} | Reason: ${reason} | Contributions: ${contributions} | Leader: ${leader}`);

        // Load promotion settings
        const settings = loadPromotionSettings();
        console.log('Loaded promotion settings:', settings);

        // Parse IRON level
        const currentIRON = parseIRON(member.displayName);
        console.log(`Current IRON: ${currentIRON}`);

        // Find user's current rank by matching roles with rank IDs
        const currentRoles = member.roles.cache.map(role => role.id);
        const currentRank = Object.keys(settings.ranks).find(rankName =>
            currentRoles.includes(settings.ranks[rankName].roleId)
        );

        console.log('Current Rank:', currentRank);

        // Ensure the current rank is manageable by this bot
        if (!settings.manageableRanks.includes(currentRank)) {
            await interaction.reply({
                content: `Applications for the rank **${currentRank}** are not handled by this bot.`,
                ephemeral: true,
            });
            return;
        }

        // Validate eligible rank
        const eligibleRank = getEligibleRank(currentIRON, currentRoles, settings.ranks);
        console.log('Eligible Rank:', eligibleRank);

        if (!eligibleRank) {
            await interaction.reply({
                content: 'You do not meet the requirements for the next rank. Ensure you have enough IRON and are progressing in the correct order.',
                ephemeral: true,
            });
            return;
        }

        // Format joined date in Discord's timestamp format
        const joinedDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;

        // Create and send promotion application embed
        const applicationEmbed = new EmbedBuilder()
            .setTitle(`${member.displayName} applied for a Promotion`)
            .setColor(0x1f8b4c)
            .setDescription(`Joined 1CR: ${joinedDate}`)
            .addFields(
                { name: 'IRON Level', value: `[ ${currentIRON} ] (${romanToDecimal(currentIRON)} IRON)`, inline: true },
                {
                    name: 'Current Rank',
                    value: `${settings.ranks[currentRank].emoji || ''} ${currentRank}`,
                    inline: true,
                },
                {
                    name: 'Eligible Rank',
                    value: `${settings.ranks[eligibleRank.nextRank]?.emoji || ''} ${eligibleRank.nextRank || 'N/A'}`,
                    inline: true,
                },
                { name: 'Reason for Promotion', value: reason, inline: false },
                { name: 'Recent Contributions', value: contributions, inline: false },
                { name: 'Leader Response', value: leader, inline: false }
            );

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('approve_promotion')
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('deny_promotion')
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
        );

        const promotionChannel = await interaction.guild.channels.fetch(settings.applicationChannelId);
        await promotionChannel.send({ embeds: [applicationEmbed], components: [buttons] });

        await interaction.reply({
            content: 'Your promotion application has been submitted.',
            ephemeral: true,
        });
    } catch (error) {
        console.error(`Failed to handle promotion submission: ${error.stack || error.message}`);
        await interaction.reply({ content: 'An error occurred while processing your application.', ephemeral: true });
    }
}

async function handlePromotionApproval(interaction) {
    const settings = loadPromotionSettings();
    const approver = interaction.member;
    const approverRole = settings.approvalRoleId;

    if (!approver.roles.cache.has(approverRole)) {
        await interaction.reply({
            content: 'You do not have permission to approve promotions.',
            flags: 64, // Ephemeral response
        });
        return;
    }

    const embed = interaction.message.embeds[0];
    const currentRankField = embed.fields.find(f => f.name === 'Current Rank');
    const eligibleRankField = embed.fields.find(f => f.name === 'Eligible Rank');

    if (!currentRankField || !eligibleRankField) {
        console.error('Current or Eligible Rank fields are missing in the embed:', embed.fields);
        throw new Error('Current or Eligible Rank fields are missing.');
    }

    const currentRankName = currentRankField.value.split(' ').slice(1).join(' '); // Handle emojis in rank names
    const nextRankName = eligibleRankField.value.split(' ').slice(1).join(' ');   // Handle emojis in rank names

    const currentRankData = settings.ranks[currentRankName];
    const nextRankData = settings.ranks[nextRankName];

    if (!currentRankData || !nextRankData) {
        console.error('Rank data for current or next rank is undefined:', {
            currentRankName,
            nextRankName,
            currentRankData,
            nextRankData,
        });
        throw new Error('Rank data for current or next rank is undefined.');
    }

    const member = interaction.guild.members.cache.find(m => m.displayName.includes(embed.title.split(' ')[1]));
    if (!member) {
        await interaction.reply({
            content: 'Could not find the user being promoted.',
            flags: 64,
        });
        return;
    }

    await member.roles.remove(currentRankData.roleId);
    await member.roles.remove(currentRankData.casteRoleId);
    await member.roles.add(nextRankData.roleId);
    await member.roles.add(nextRankData.casteRoleId);

    const updatedEmbed = EmbedBuilder.from(embed)
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x1f8b4c);

    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

    await interaction.reply({
        content: `Promotion for ${member.displayName} to ${nextRankName} has been approved.`,
        flags: 64,
    });

    // Create DM Embed
    const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(`You have been promoted to **${nextRankName}** in the 1CR!`)
        .addFields(
            { name: 'New Responsibilities', value: settings.ranks[nextRankName]?.responsibilities || 'Details about your new rank.', inline: false },
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date of Promotion', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: 'We look forward to your continued contributions to the 1CR!' });

    // Send DM to the promoted user
    try {
        await member.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.error(`Failed to send DM to ${member.displayName}: ${error.message}`);
    }
}

async function showDenialReasonModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('denial_reason_modal') // This must match the handler in interactionHandler.js
        .setTitle('Promotion Denial Reason');

    const reasonInput = new TextInputBuilder()
        .setCustomId('denial_reason') // Matches the retrieval in handleDenialReasonSubmission
        .setLabel('Reason for Denial')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
}

async function handleDenialReasonSubmission(interaction) {
    // Log all fields for debugging
    console.log('Modal Fields:', interaction.fields.fields);

    const reason = interaction.fields.getTextInputValue('denial_reason'); // Matches the modal's customId
    const embed = interaction.message.embeds[0];
    const userTag = embed.title.match(/\[ (.+?) \]/)[1];
    const member = interaction.guild.members.cache.find(m => m.displayName.includes(userTag));
    const approver = interaction.member;

    if (!member) {
        await interaction.reply({ content: 'Could not find the user being denied.', flags: 64 });
        return;
    }

    const updatedEmbed = EmbedBuilder.from(embed)
        .addFields(
            { name: 'Denied By', value: approver.displayName, inline: true },
            { name: 'Date Denied', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: 'Reason for Denial', value: reason, inline: false }
        )
        .setColor(0xff0000);

    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

    const denialEmbed = new EmbedBuilder()
        .setTitle('Promotion Denied')
        .setColor(0xff0000)
        .setDescription(
            `${member.displayName}, your promotion application was denied.\n\n**Reason:** ${reason}`
        )
        .addFields({ name: 'Denied By', value: approver.displayName, inline: true });

    try {
        await member.send({ embeds: [denialEmbed] });
    } catch {
        console.error(`Failed to send DM to ${member.displayName}`);
    }

    await interaction.reply({
        content: `Promotion for ${member.displayName} has been denied.`,
        flags: 64,
    });
}


module.exports = {
    showPromotionModal,
    handlePromotionSubmission,
    processPromotion,
    handleDenial,
    finalizeDenial,
    handlePromotionApproval,
    showDenialReasonModal,
    handleDenialReasonSubmission,
};
