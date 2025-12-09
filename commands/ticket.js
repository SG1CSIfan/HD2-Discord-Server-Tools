const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createButtons } = require('../embedHandlers/ticketEmbedHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sets up the ticket system embed in the specified channel.')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Channel to place the ticket embed.').setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    const filePath = path.join(__dirname, '../data/channels.json');
    const channelsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check if we already have a ticket embed recorded
    const ticketEmbed = channelsData.channels.ticketEmbed;

    const embed = createEmbed();
    const buttons = createButtons();

    try {
      if (ticketEmbed.channelID && ticketEmbed.messageID) {
        try {
          // Attempt to fetch the channel and message
          const messageChannel = await interaction.client.channels.fetch(ticketEmbed.channelID);
          const message = await messageChannel.messages.fetch(ticketEmbed.messageID);

          // Edit the existing message
          await message.edit({ embeds: [embed], components: [buttons] });
          await interaction.reply({ content: 'Ticket embed updated successfully!', ephemeral: true });
        } catch (error) {
          if (error.code === 10008) {
            console.warn('Message not found. Creating a new one.');

            // Create a new message and update the JSON
            const sentMessage = await channel.send({ embeds: [embed], components: [buttons] });
            ticketEmbed.channelID = channel.id;
            ticketEmbed.messageID = sentMessage.id;

            fs.writeFileSync(filePath, JSON.stringify(channelsData, null, 2));
            await interaction.reply({ content: 'Old message was missing. Created a new ticket embed.', ephemeral: true });
          } else {
            throw error;
          }
        }
      } else {
        // If no record exists, create a new message and update the JSON
        const sentMessage = await channel.send({ embeds: [embed], components: [buttons] });
        ticketEmbed.channelID = channel.id;
        ticketEmbed.messageID = sentMessage.id;

        fs.writeFileSync(filePath, JSON.stringify(channelsData, null, 2));
        await interaction.reply({ content: 'Ticket embed created successfully!', ephemeral: true });
      }
    } catch (error) {
      console.error('Error handling ticket command:', error);
      await interaction.reply({
        content: 'There was an error setting up the ticket embed. Please check the logs.',
        ephemeral: true,
      });
    }
  },
};
