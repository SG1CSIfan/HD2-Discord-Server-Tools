// commandHandler.js
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const { logInfo, logError } = require('./loggingHandler');
require('dotenv').config();

/**
 * Registers all commands dynamically from the commands folder.
 * @param {Client} client Discord.js client instance
 */
async function registerCommands(client) {
    const commands = [];
    const commandPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`${commandPath}/${file}`);
        if (command.data && typeof command.data.toJSON === 'function') {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
            logInfo(`Registered command: ${command.data.name}`);
        } else {
            logError(`Invalid command structure: ${file}`);
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands }
        );
        logInfo('Commands registered with Discord API.');
    } catch (error) {
        logError(`Failed to register commands: ${error.message}`);
    }
}

module.exports = { registerCommands };
