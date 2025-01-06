    const { EmbedBuilder } = require('discord.js');

    function generatePromotionEmbed(member, rankData) {
        return new EmbedBuilder()
            .setTitle('Promotion Application')
            .setColor(0x1f8b4c)
            .setDescription(`${member.displayName} has applied for a promotion.`)
            .addFields(
                { name: 'Current Rank', value: rankData.currentRank, inline: true },
                { name: 'Eligible for', value: rankData.nextRank, inline: true },
                { name: 'IRON Level', value: `[ ${rankData.ironLevel} ]`, inline: true }
            );
    }

    function generateApprovalEmbed(member, nextRank) {
        return new EmbedBuilder()
            .setTitle('Promotion Approved')
            .setColor(0x1f8b4c)
            .setDescription(`Congratulations, ${member.displayName}!\n\n${message}`);
            
    }

    function generateDenialEmbed(member, reason) {
        return new EmbedBuilder()
            .setTitle('Promotion Denied')
            .setColor(0xff0000)
            .setDescription(
                `Unfortunately, your promotion application was denied.\n\n` +
                `**Reason:** ${reason}`
            );
    }

    module.exports = { generatePromotionEmbed, generateApprovalEmbed, generateDenialEmbed };
