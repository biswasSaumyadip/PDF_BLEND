import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/app.log') }),
    ],
});

export default logger;
