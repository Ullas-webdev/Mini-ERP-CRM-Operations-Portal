import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`
  );
  logger.info(`🔗 Health Check: http://localhost:${env.PORT}/api/v1/health`);
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
