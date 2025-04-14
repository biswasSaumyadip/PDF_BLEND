"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}));
// Create Winston logger instance
const logger = winston_1.default.createLogger({
    level: 'info', // Set default log level
    format: logFormat,
    transports: [
        new winston_1.default.transports.Console(), // Log to console
        new winston_1.default.transports.File({ filename: path_1.default.join(__dirname, '../../logs/app.log') }), // Log to file
    ],
});
exports.default = logger;
