const fs = require('fs');
const path = require('path');
const { logError } = require('../handlers/loggingHandler');

function loadTicketSettings() {
    const settingsPath = path.join(__dirname, '../data/ticketSettings.json');

    // Default settings
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

module.exports = { loadTicketSettings, saveTicketSettings, loadPromotionSettings };
