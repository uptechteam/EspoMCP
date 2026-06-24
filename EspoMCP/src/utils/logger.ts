import winston from 'winston';

/**
 * When running as a child process over stdio transport, all logging
 * MUST go to stderr, not stdout. The stdio MCP transport uses stdout
 * exclusively for JSON-RPC messages. Any non-JSON output on stdout
 * breaks the protocol.
 *
 * We detect this by checking if stdout is a TTY. When spawned as a
 * child process by the AI backend, stdout is a pipe (not a TTY).
 * When run standalone (e.g., for debugging), stdout is a TTY.
 *
 * FORCE_STDERR=true can also be set explicitly.
 */
const useStderr = !process.stdout.isTTY || process.env.FORCE_STDERR === 'true';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    })
  ),
  defaultMeta: { service: 'espocrm-mcp-server' },
  transports: [
    new winston.transports.Console({
      stderrLevels: useStderr ? ['error', 'warn', 'info', 'debug'] : [],
      format: winston.format.combine(
        ...(useStderr ? [] : [winston.format.colorize()]),
        winston.format.simple()
      )
    })
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

export default logger;