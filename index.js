const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { registerCommands } = require('./handlers/commandHandler');
const { handleInteraction } = require('./handlers/interactionHandler');
const { setupSupportInfo, startTicketDeletionInterval, handleTicketMessage } = require('./handlers/ticketHandler');
const { logInfo, logError } = require('./handlers/loggingHandler');
const { loadTicketSettings } = require('./utils/fileUtils');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

function ensureFoldersAndFiles() {
    // Define paths
    const logsPath = path.join(__dirname, 'logs');
    const dataPath = path.join(__dirname, 'data');
    const ticketSettingsPath = path.join(dataPath, 'ticketSettings.json');

    // Ensure logs folder exists
    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath);
        console.log('[INFO] Created missing "logs" folder.');
    }

    // Ensure data folder exists
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath);
        console.log('[INFO] Created missing "data" folder.');
    }

    // Ensure ticketSettings.json exists
    if (!fs.existsSync(ticketSettingsPath)) {
        const defaultSettings = {
            channelId: "",
            messageId: "",
            categoryId: "",
            roleId: "",
            ticketCloseDuration: 86400,
            ticketCounter: 1,
            closedTickets: [],
        };
        fs.writeFileSync(ticketSettingsPath, JSON.stringify(defaultSettings, null, 2));
        console.log('[INFO] Created missing "ticketSettings.json" with default settings.');
    }
}

// Ensure folders and files before bot starts
ensureFoldersAndFiles();

// Collections for commands and contexts
client.commands = new Collection();
client.contexts = new Map();

client.once('ready', async () => {
    logInfo(`Logged in as ${client.user.tag}`);

    await setupSupportInfo(client);
    startTicketDeletionInterval(client);
    logInfo('Support ticket system initialized.');

    try {
        const settings = loadTicketSettings();
        console.log(`[INFO] Loaded bot settings: ${JSON.stringify(settings, null, 2)}`);

        // Register commands
        await registerCommands(client);
        console.log('[INFO] Commands registered successfully.');

        // Set up ticket system
        if (settings.supportEnabled) {
            await setupSupportInfo(client);
            console.log('[INFO] Ticket system initialized.');
        }

        console.log(`[INFO] Bot is ready and operational.`);
    } catch (error) {
        console.error('[ERROR] Initialization failed:', error.message);
    }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
    try {
        await handleInteraction(interaction, client);
        logInfo(`Handled interaction: ${interaction.type}`);
    } catch (error) {
        logError(`Failed to handle interaction: ${error.message}`);
    }
});

// Handle message logging in ticket channels
client.on('messageCreate', async (message) => {
    await handleTicketMessage(message);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
