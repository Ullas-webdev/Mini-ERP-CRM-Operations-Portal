import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: any;
  };
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    logger.warn(
      {
        requestId,
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        details: err.details,
      },
      `Operational Error: ${err.message}`
    );

    return res.status(err.statusCode).json(errorResponse);
  }

  // Unhandled / Internal Server Errors
  logger.error(
    {
      requestId,
      err,
      stack: err.stack,
    },
    `Unhandled Server Error: ${err.message}`
  );

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred',
      details: {
        name: err.name,
        message: err.message,
      },
    },
  };

  return res.status(500).json(errorResponse);
};
