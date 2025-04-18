#!/usr/bin/env node

/**
 * Load environment variables early
 */
import dotenv from 'dotenv';
dotenv.config();

/**
 * Module dependencies
 */
import app from '../app';
import http from 'http';
import logger from '../utils/logger';
import { AddressInfo } from 'net';

/**
 * Get port from environment and store in Express
 */
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Global process event handlers
 */
process.on('unhandledRejection', (reason) => {
  logger.error('[Process] Unhandled Promise Rejection', { reason });
  process.exit(1);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Normalize a port into a number, string, or false
 */
function normalizePort(val: string): number | string | false {
  const parsedPort = parseInt(val, 10);

  if (isNaN(parsedPort)) {
    return val; // named pipe
  }
  if (parsedPort >= 0) {
    return parsedPort; // valid port number
  }
  return false;
}

/**
 * Event listener for HTTP server "error" event
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    logger.error('[Server] Unexpected server error', { message: error.message, error });
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case 'EACCES':
      logger.error(`[Startup Error] ${bind} requires elevated privileges`, {
        port,
        errorCode: error.code,
      });
      process.exit(1);
    case 'EADDRINUSE':
      logger.error(`[Startup Error] ${bind} is already in use`, { port, errorCode: error.code });
      process.exit(1);
    default:
      logger.error(`[Startup Error] Unknown error occurred on ${bind}`, { port, error });
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event
 */
function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `Pipe ${addr}` : `Port ${addr?.port}`;

  const portNumber = typeof addr === 'string' ? null : addr?.port;

  logger.info(`[Server] Listening started on ${bind}`, {
    port: portNumber,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Graceful shutdown handler
 */
function shutdown(): void {
  logger.info('[Server] Shutting down gracefully...');
  server.close(() => {
    logger.info('[Server] Shutdown complete.');
    process.exit(0);
  });
}
