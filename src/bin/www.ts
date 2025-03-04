#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from '../app';
import http from 'http';
import logger from '../utils/logger';

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string): number | string | false {
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

function onError(error: any): void {
  if (error.syscall !== 'listen') {
    logger.error(`Unexpected server error: ${error.message}`, { error });
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`[Startup Error] ${bind} requires elevated privileges`, {
        port,
        errorCode: error.code,
      });
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`[Startup Error] ${bind} is already in use`, {
        port,
        errorCode: error.code,
      });
      process.exit(1);
      break;
    default:
      logger.error(`[Startup Error] Unknown error occurred on ${bind}`, {
        port,
        error,
      });
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `Pipe ${addr}` : `Port ${addr?.port}`;

  logger.info(`[Server] Listening on ${bind}`, {
    port: typeof addr !== 'string' ? addr?.port : port,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}
