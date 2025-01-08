const { loadModForumSettings } = require('../utils/fileUtils');
const { generateEventEmbed } = require('../embedHandlers/modForumEmbed');
const { logInfo, logError } = require('./loggingHandler');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const settings = loadModForumSettings('modForumSettings');

async function monitorForum(client) {
    try {
        const forumChannel = await client.channels.fetch(settings.forumChannelId);
        if (!forumChannel || forumChannel.type !== 15) {
            logError(`[ERROR] Invalid forum channel: ${settings.forumChannelId}`);
            return;
        }

        console.log(`[INFO] Monitoring forum channel: ${forumChannel.name} (${forumChannel.id})`);

        const threads = await forumChannel.threads.fetchActive();
        console.log(`[INFO] Found ${threads.threads.size} active thread(s).`);

        const events = [];
        for (const thread of threads.threads.values()) {
            if (thread.id === "1300502994625757185") {
                console.log(`[INFO] Skipping thread: Weekly Schedule (${thread.id})`);
                continue; // Skip "Weekly Schedule"
            }

            try {
                const messages = await thread.messages.fetch({ limit: 10 });
                const firstBotMessage = messages
                    .filter(msg => msg.author.bot && msg.embeds.length > 0)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .first(); // Ensure it picks the first bot message

                if (firstBotMessage) {
                    console.log(`[INFO] Found embed in thread: ${thread.name}`);
                    const eventData = parseEventFromEmbed(firstBotMessage.embeds[0], thread.name, thread.url);
                    if (eventData) {
                        events.push(eventData);
                    } else {
                        console.warn(`[WARN] Could not parse event data for thread: ${thread.name}`);
                    }
                } else {
                    console.warn(`[WARN] No valid bot messages with embeds found in thread: ${thread.name}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to fetch messages for thread: ${thread.name} - ${error.message}`);
            }
        }

        if (events.length > 0) {
            // Sort events by date
            events.sort((a, b) => a.startTimestamp - b.startTimestamp);
            await updateEmbed(events, client);
        } else {
            console.warn(`[WARN] No valid events found in the forum.`);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to monitor forum: ${error.message}`);
    }
}

function parseEventFromEmbed(embed, threadTitle, threadUrl) {
    console.debug('[DEBUG] Processing embed:', embed);

    const eventData = {
        title: embed.title || threadTitle || 'Untitled Event',
        description: embed.description || 'No description provided.',
        host: 'Unknown Host',
        operation: '',
        startTimestamp: null,
        endTimestamp: null,
        attendeeRole: 'Not specified',
        threadUrl: threadUrl, // Add thread URL for linking
    };

    // Extract Host from Footer
    const footerText = embed.footer?.text || '';
    const hostMatch = footerText.match(/Created by \[.*\]\s*(.+)/);
    if (hostMatch) {
        eventData.host = hostMatch[1].trim();
    }

    // Extract Operation
    const operationRegex = /Operation\s*[:-]\s*(.+)/i;
    const operationMatch = embed.description?.match(operationRegex);
    if (operationMatch) {
        eventData.operation = operationMatch[1].trim();
    }

    // Extract Start and End Timestamps
    const timeField = embed.fields?.find(field =>
        field.name.toLowerCase().includes('time')
    );
    if (timeField) {
        const timeMatch = timeField.value.match(/<t:(\d+):[A-Za-z]>/g);
        if (timeMatch) {
            const timestamps = timeMatch.map(t => t.match(/\d+/)[0]);
            if (timestamps.length > 0) {
                eventData.startTimestamp = timestamps[0];
                eventData.endTimestamp = timestamps[1] || null;
            }
        }
    }

    return eventData;
}

async function updateEmbed(events, client) {
    try {
        const channelId = settings.testMode ? settings.testServerEmbedChannelId : settings.embedChannelId;
        const embedChannel = await client.channels.fetch(channelId);

        if (!embedChannel) {
            console.error(`[ERROR] Embed channel not found: ${channelId}`);
            return;
        }

        console.log(`[INFO] Posting to embed channel: ${embedChannel.name} (${embedChannel.id})`);

        const embed = generateEventEmbed(events);

        const existingMessages = await embedChannel.messages.fetch({ limit: 10 });
        const lastEmbed = existingMessages.find(msg => msg.embeds.length > 0);

        if (lastEmbed) {
            console.log(`[INFO] Updating existing embed in channel: ${embedChannel.name}`);
            await lastEmbed.edit({ embeds: [embed] });
        } else {
            console.log(`[INFO] Sending new embed to channel: ${embedChannel.name}`);
            await embedChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`[ERROR] Failed to post or update embed: ${error.message}`);
    }
}

module.exports = { monitorForum };
