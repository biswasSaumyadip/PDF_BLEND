#!/usr/bin/env node
"use strict";
/**
 * Module dependencies.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../app"));
const http_1 = __importDefault(require("http"));
const logger_1 = __importDefault(require("../utils/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3000');
app_1.default.set('port', port);
/**
 * Create HTTP server.
 */
const server = http_1.default.createServer(app_1.default);
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}
/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        logger_1.default.error(`Unexpected server error: ${error.message}`, { error });
        throw error;
    }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger_1.default.error(`[Startup Error] ${bind} requires elevated privileges`, {
                port,
                errorCode: error.code,
            });
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger_1.default.error(`[Startup Error] ${bind} is already in use`, {
                port,
                errorCode: error.code,
            });
            process.exit(1);
            break;
        default:
            logger_1.default.error(`[Startup Error] Unknown error occurred on ${bind}`, {
                port,
                error,
            });
            throw error;
    }
}
/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `Pipe ${addr}` : `Port ${addr?.port}`;
    logger_1.default.info(`[Server] Listening on ${bind}`, {
        port: typeof addr !== 'string' ? addr?.port : port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
}
