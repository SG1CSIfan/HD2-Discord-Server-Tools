const { EmbedBuilder } = require('discord.js');

// Generate the Steward Embed Approval
function generateStewardEmbed(member, approver) {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion to Steward! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(
            "Entering the 3rd stage of 1st Colonial Regiment, we need new leaders and contributors to the greater entity that serves Super Earth and her colonies.\n\n**Your Responsibilities:**\n\n- Help maintain the standards of the 1st Colonial Regiment\n- Support and guide new recruits\n- Step in during MODs if there is a shortage of Deployment Caste and lead a team\n\n**To earn the next rank**, achieve IRON [ V ] (5 IRON) to become eligible for Deployment Officer."
        )
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}

// Generate the Deployment Officer Embed Approval
function generateDeploymentOfficerEmbed(member, approver) {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion to Deployment Officer! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(
            "You are now a Deployment Officer! Please read through **#deployment-materials** for a full list of responsibilities.\n\n**Your Responsibilities:**\n\n- Hosting Major Order MODs\n- Encouraging activity within the Discord server\n- Filing reports during MODs using **#submit-mod-report**"
        )
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}

// Generate the Deployment Supreme Embed Approval
function generateDeploymentSupremeEmbed(member, approver) {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion to Deployment Supreme! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(
            "Welcome to Deployment Supreme! Your leadership plays a critical role in the success of the 1CR.\n\nPlease speak with a Fleet Commander to receive training to run small events within your company.\n\n**Your Opportunities:**\n\n- Hosting small events\n\nYou are one step closer to achieving the rank of Freedom Captain!"
        )
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}

// Generate the Freedom Captain Embed Approval
function generateFreedomCaptainEmbed(member, approver) {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion to Freedom Captain! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(
            "As a Freedom Captain, you are now one of the highest-ranking leaders in the 1CR. Please contact High Command or the IRON Commission for training in your new responsibilities.\n\n**Your Responsibilities:**\n\n- Hosting MODs\n- Overseeing application onboarding\n- Answering support tickets\n- Supervising and guiding the regiment"
        )
        .addFields(
            { name: 'Approved By', value: approver.displayName, inline: true },
            { name: 'Date Approved', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}



// Generate the promotion denial embed
function generateDenialEmbed(member, reason, approver) {
    return new EmbedBuilder()
        .setTitle('Promotion Denied')
        .setColor(0xff0000)
        .setDescription(`${member}, your promotion application was denied.`)
        .addFields(
            { name: 'Reason', value: reason, inline: false },
            { name: 'Denied By', value: approver, inline: true },
            { name: 'Date Denied', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}

// Generate the promotion application embed
function generateApplicationEmbed(member, currentIRON, currentRank, eligibleRank, joinedDate, reason, contributions, leader, settings) {
    return new EmbedBuilder()
        .setTitle(`${member.displayName} applied for a Promotion`)
        .setColor(0x1f8b4c)
        .setDescription(`Joined 1CR: ${joinedDate}`)
        .addFields(
            { name: 'IRON Level', value: `[ ${currentIRON} ] (${eligibleRank.requiredIRON} IRON)`, inline: true },
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
}

// Generate the promotion approval embed
function generateApprovalEmbed(member, nextRankName, approver) {
    return new EmbedBuilder()
        .setTitle('🎉 Congratulations on Your Promotion! 🎉')
        .setColor(0x1f8b4c)
        .setDescription(`Congratulations on your promotion to **${nextRankName}**!`)
        .addFields(
            { name: 'New Rank', value: nextRankName, inline: true },
            { name: 'Approved By', value: approver, inline: true },
            { name: 'Date of Promotion', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );
}

module.exports = {
    generateStewardEmbed,
    generateDeploymentOfficerEmbed,
    generateDeploymentSupremeEmbed,
    generateFreedomCaptainEmbed,
    generateDenialEmbed,
    generateApplicationEmbed,
	generateApprovalEmbed,
};
