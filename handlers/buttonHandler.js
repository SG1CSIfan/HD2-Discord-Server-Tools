module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
      if (!interaction.isButton()) return;
  
      switch (interaction.customId) {
        case 'general_support':
        case 'bot_issue':
        case 'player_issue':
        case 'promotion':    
          await interaction.reply({
            content: `You clicked the button: ${interaction.customId}. This feature is under construction.`,
            ephemeral: true,
          });
          break;
        default:
          await interaction.reply({
            content: 'Unknown button interaction. Please try again later.',
            ephemeral: true,
          });
      }
    },
  };
  