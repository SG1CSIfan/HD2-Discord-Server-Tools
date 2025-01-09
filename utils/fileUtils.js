const fs = require('fs');
const path = require('path');
const { logError } = require('../handlers/loggingHandler');

// Load ticket settings
function loadTicketSettings() {
    const settingsPath = path.join(__dirname, '../data/ticketSettings.json');

    const defaultSettings = {
        supportEnabled: true,
        ticketExpiryHours: 24,
    };

    try {
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            return defaultSettings;
        }

        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(settingsData);
    } catch (error) {
        logError(`Failed to load ticket settings: ${error.message}`);
        return defaultSettings;
    }
}

function saveTicketSettings(settings) {
    const settingsPath = path.join(__dirname, '../data/ticketSettings.json');

    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        logError(`Failed to save ticket settings: ${error.message}`);
    }
}

// Load MOD Report settings
function loadModReportSettings() {
    const settingsPath = path.join(__dirname, '../data/modReportSettings.json');

    const defaultSettings = {
        mainEmbedChannelId: '',
        mainEmbedMessageId: '',
        submissionChannelId: '',
        operationName: 'Unknown Operation',
        hostId: '',
    };

    try {
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            return defaultSettings;
        }

        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(settingsData);
    } catch (error) {
        logError(`Failed to load MOD report settings: ${error.message}`);
        return defaultSettings;
    }
}

function saveModReportSettings(settings) {
    const settingsPath = path.join(__dirname, '../data/modReportSettings.json');

    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        logError(`Failed to save MOD report settings: ${error.message}`);
    }
}

function loadPromotionSettings() {
    const settingsPath = path.join(__dirname, '../data/promotionSettings.json');

    try {
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(settingsData);
        } else {
            logError(`Promotion settings file not found at ${settingsPath}`);
            return {};
        }
    } catch (error) {
        logError(`Failed to load promotion settings: ${error.message}`);
        return {};
    }
}

function loadModForumSettings(filename) {
    const settingsPath = path.join(__dirname, `../data/${filename}.json`);

    try {
        if (!fs.existsSync(settingsPath)) {
            throw new Error(`Settings file not found: ${filename}`);
        }

        const data = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading settings: ${error.message}`);
        return {};
    }
}

function loadAnonymousSubmissionsSettings(fileName) {
    const settingsPath = path.join(__dirname, '../data', fileName); // Changed to '../data'
    const defaultSettings = {
        submissionChannelId: '',
        rolePings: {
            general: '',
            player: '',
            other: '',
        },
    };

    try {
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            logError(`${fileName} not found. A default file has been created.`);
            return defaultSettings;
        }

        const data = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        logError(`Failed to load settings from ${fileName}: ${error.message}`);
        return defaultSettings;
    }
}

module.exports = {
    loadTicketSettings,
    saveTicketSettings,
    loadModReportSettings,
    saveModReportSettings,
    loadPromotionSettings,
    loadModForumSettings,
    loadAnonymousSubmissionsSettings,
};
