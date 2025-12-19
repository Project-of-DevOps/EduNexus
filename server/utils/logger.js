
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists under repository root server/logs
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') }),
    ],
});

// Always log to console in all environments so Render/Container logs show output
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
}));

module.exports = logger;
