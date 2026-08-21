import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// Standard rate limiter for general routes (10,000 requests per 15 min in dev mode)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes',
      details: null,
    },
  },
});

// Rate limiter for authentication endpoints (1,000 requests per 15 min in dev mode)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      details: null,
    },
  },
});
