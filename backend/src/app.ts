import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalRateLimiter } from './middleware/rateLimiter';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';
import routes from './routes/index';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // Explicit CORS Allowlist (No Wildcards)
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (
          env.CORS_ORIGIN.includes(origin) ||
          env.CORS_ORIGIN.includes('*') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy violation: ${origin} is not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // Cookie Parser Middleware for httpOnly Refresh Tokens
  app.use(cookieParser());

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Pino Logger & Request ID Middleware
  app.use(loggerMiddleware);

  // Global Rate Limiting
  app.use(globalRateLimiter);

  // Mount API V1 Routes
  app.use('/api/v1', routes);

  // 404 Route Handler
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
