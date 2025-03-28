import winston from 'winston';
import config from '../config';

/**
 * Winston logger configuration
 * - Logs to console with appropriate formatting
 * - Log level is configurable via environment variables
 */
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'solana-telegram-bot' },
  transports: [
    // Console transport with custom formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          
          // Add metadata if present
          if (Object.keys(metadata).length > 0 && metadata.service !== 'solana-telegram-bot') {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          
          return msg;
        })
      )
    })
  ]
});

// Add file transport in production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

export default logger;
