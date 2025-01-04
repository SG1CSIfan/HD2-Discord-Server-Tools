// loggingHandler.js
const { createLogger, format, transports } = require('winston');

// Create logger instance
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: './logs/general.log', level: 'info' }),
        new transports.File({ filename: './logs/error.log', level: 'error' }),
    ],
});

/**
 * Logs informational messages.
 * @param {string} message The message to log.
 */
function logInfo(message) {
    logger.info(message);
}

/**
 * Logs error messages.
 * @param {string} message The error message to log.
 */
function logError(message) {
    logger.error(message);
}

module.exports = { logInfo, logError };
