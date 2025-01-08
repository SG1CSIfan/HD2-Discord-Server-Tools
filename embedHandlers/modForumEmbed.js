const { EmbedBuilder } = require('discord.js');

function generateEventEmbed(events) {
    if (!events || events.length === 0) {
        return new EmbedBuilder()
            .setTitle('Upcoming Events')
            .setColor(0xff0000)
            .setDescription('No events scheduled.')
            .setFooter({ text: 'Stay tuned for updates!' });
    }

    const eventsByDate = groupEventsByDate(events);

    const embed = new EmbedBuilder()
        .setTitle('Upcoming Events')
        .setColor(0x00ff00)
        .setDescription('Here are the upcoming scheduled events:')
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });

    Object.keys(eventsByDate).forEach(date => {
        const eventsOnDate = eventsByDate[date]
            .sort((a, b) => a.startTimestamp - b.startTimestamp)
            .map(event => {
                const start = event.startTimestamp
                    ? `<t:${event.startTimestamp}:t>`
                    : 'TBA';
                const end = event.endTimestamp
                    ? `<t:${event.endTimestamp}:t>`
                    : 'TBA';

                let eventDetails = `- **${event.title}**\n  - Time: ${start} - ${end}\n  - Host: ${event.host}`;
                if (event.operation) {
                    eventDetails += `\n  - Op: ${event.operation}`;
                }

                // Add the thread link
                if (event.threadUrl) {
                    eventDetails += `\n  - [View Thread](${event.threadUrl})`;
                }

                return eventDetails;
            })
            .join('\n\n');

        embed.addFields({ name: `__${date}__`, value: eventsOnDate });
    });

    return embed;
}

function groupEventsByDate(events) {
    const grouped = events.reduce((acc, event) => {
        const date = event.startTimestamp
            ? new Date(event.startTimestamp * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
              })
            : 'Unknown Date';
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
    }, {});

    // Sort dates and return sorted groups
    const sortedDates = Object.keys(grouped).sort(
        (a, b) => new Date(a) - new Date(b)
    );
    return sortedDates.reduce((sorted, date) => {
        sorted[date] = grouped[date];
        return sorted;
    }, {});
}

module.exports = { generateEventEmbed };
