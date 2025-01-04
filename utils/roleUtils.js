async function validateSupportRole(interaction, requiredRoleId) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const requiredRole = interaction.guild.roles.cache.get(requiredRoleId);

    if (!requiredRole) {
        await interaction.reply({
            content: 'The required role is misconfigured. Please contact an administrator.',
            ephemeral: true,
        });
        return false;
    }

    // Check if the member has a role equal to or higher than the required role
    const hasPermission = member.roles.cache.some(
        role => role.position >= requiredRole.position
    );

    if (!hasPermission) {
        await interaction.reply({
            content: `Please let your ${requiredRole.name} know your ticket is complete.`,
            ephemeral: true,
        });
        return false;
    }

    return true;
}

module.exports = { validateSupportRole };
