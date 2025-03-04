import morgan, { StreamOptions } from 'morgan';
import logger from '../utils/logger';

// Define stream object for Morgan (direct logs to Winston)
const stream: StreamOptions = {
    write: (message) => logger.info(message.trim()), // Trim to remove extra newlines
};

// Setup Morgan middleware
const morganMiddleware = morgan('combined', { stream });

export default morganMiddleware;
