const { loadPromotionSettings } = require('../utils/fileUtils');
const { parseIRON, getEligibleRank } = require('../utils/ironUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder} = require('discord.js');
const {
    generateApplicationEmbed,
    generateDenialEmbed,
    generateStewardEmbed,
    generateDeploymentOfficerEmbed,
    generateDeploymentSupremeEmbed,
    generateFreedomCaptainEmbed,
    generateApprovalEmbed
} = require('../embedHandlers/promotionEmbed');
const path = require('path');

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

async function handlePromotionSubmission(interaction) {
    try {
        const reason = interaction.fields.getTextInputValue('reason');
        const contributions = interaction.fields.getTextInputValue('contributions');
        const leader = interaction.fields.getTextInputValue('leader');
        const member = await interaction.guild.members.fetch(interaction.user.id);

        const settings = loadPromotionSettings();
        const currentIRON = parseIRON(member.displayName);
        const currentRoles = member.roles.cache.map(role => role.id);
        const currentRank = Object.keys(settings.ranks).find(rankName =>
            currentRoles.includes(settings.ranks[rankName].roleId)
        );

        if (!settings.manageableRanks.includes(currentRank)) {
            await interaction.reply({
                content: `Applications for the rank **${currentRank}** are not handled by this bot.`,
                ephemeral: true,
            });
            return;
        }

        const eligibleRank = getEligibleRank(currentIRON, currentRoles, settings.ranks);
        if (!eligibleRank) {
            await interaction.reply({
                content: 'You do not meet the requirements for the next rank. Ensure you have enough IRON and are progressing in the correct order.',
                ephemeral: true,
            });
            return;
        }

        const joinedDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;
        const applicationEmbed = generateApplicationEmbed(
            member,
            currentIRON,
            currentRank,
            eligibleRank,
            joinedDate,
            reason,
            contributions,
            leader,
            settings
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

    if (!approver.roles.cache.has(settings.approvalRoleId)) {
        await interaction.reply({ content: 'You do not have permission to approve promotions.', ephemeral: true });
        return;
    }

    const embed = interaction.message.embeds[0];
    const currentRankField = embed.fields.find(f => f.name === 'Current Rank');
    const eligibleRankField = embed.fields.find(f => f.name === 'Eligible Rank');

    if (!currentRankField || !eligibleRankField) {
        throw new Error('Current or Eligible Rank fields are missing.');
    }

    const currentRankName = currentRankField.value.split(' ').slice(1).join(' ');
    const nextRankName = eligibleRankField.value.split(' ').slice(1).join(' ');

    const currentRankData = settings.ranks[currentRankName];
    const nextRankData = settings.ranks[nextRankName];

    if (!currentRankData || !nextRankData) {
        throw new Error('Rank data for current or next rank is undefined.');
    }

    const member = interaction.guild.members.cache.find(m => m.displayName.includes(embed.title.split(' ')[1]));
    if (!member) {
        await interaction.reply({ content: 'Could not find the user being promoted.', ephemeral: true });
        return;
    }

    try {
        await member.roles.remove(currentRankData.roleId);
        await member.roles.remove(currentRankData.casteRoleId);
        await member.roles.add(nextRankData.roleId);
        await member.roles.add(nextRankData.casteRoleId);
    } catch (error) {
        console.error(`Failed to update roles for ${member.displayName}: ${error.message}`);
    }

    let dmEmbed;
    switch (nextRankName) {
        case 'Steward':
            dmEmbed = generateStewardEmbed(member, approver);
            break;
        case 'Deployment Officer':
            dmEmbed = generateDeploymentOfficerEmbed(member, approver);
            break;
        case 'Deployment Supreme':
            dmEmbed = generateDeploymentSupremeEmbed(member, approver);
            break;
        case 'Freedom Captain':
            dmEmbed = generateFreedomCaptainEmbed(member, approver);
            break;
        default:
            dmEmbed = generateApprovalEmbed(member.displayName, nextRankName, approver.displayName);
    }

    try {
        await member.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.error(`Failed to send DM to ${member.displayName}: ${error.message}`);
    }

    const updatedEmbed = EmbedBuilder.from(embed)
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x1f8b4c);

    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
    await interaction.reply({ content: `Promotion for ${member.displayName} to ${nextRankName} has been approved.`, ephemeral: true });
}

async function handleDenialReasonSubmission(interaction) {
    const reason = interaction.fields.getTextInputValue('denial_reason');
    const embed = interaction.message.embeds[0];
    const member = interaction.guild.members.cache.find(m => m.displayName.includes(embed.title.split(' ')[1]));
    const approver = interaction.member;

    if (!member) {
        await interaction.reply({ content: 'Could not find the user being denied.', ephemeral: true });
        return;
    }

    const updatedEmbed = generateDenialEmbed(member.displayName, reason, approver.displayName);

    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

    try {
        await member.send({ embeds: [updatedEmbed] });
    } catch {
        console.error(`Failed to send DM to ${member.displayName}`);
    }

    await interaction.reply({
        content: `Promotion for ${member.displayName} has been denied.`,
        ephemeral: true,
    });
}

async function showDenialReasonModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('denial_reason_modal')
        .setTitle('Promotion Denial Reason');

    const reasonInput = new TextInputBuilder()
        .setCustomId('denial_reason')
        .setLabel('Reason for Denial')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
}

module.exports = {
    showPromotionModal,
    handlePromotionSubmission,
    handlePromotionApproval,
    handleDenialReasonSubmission,
    showDenialReasonModal,
};
