import winston from 'winston';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

// Create Winston logger instance
const logger = winston.createLogger({
    level: 'info', // Set default log level
    format: logFormat,
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/app.log') }), // Log to file
    ],
});

export default logger;
