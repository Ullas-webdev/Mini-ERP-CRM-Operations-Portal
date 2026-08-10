export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: any = null
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details: any = null) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details: any = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: any = null) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details: any = null) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details: any = null) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details: any = null) {
    super(409, 'CONFLICT', message, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details: any = null) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}
