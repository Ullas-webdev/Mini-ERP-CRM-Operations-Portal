import rateLimit from 'express-rate-limit';

// Standard rate limiter for general routes (10,000 requests per 15 min)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
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

// Rate limiter for authentication endpoints (10,000 requests per 15 min for seamless evaluation & demo)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
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
