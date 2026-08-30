import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errorDetails || 'Invalid request payload'
      }
    });
  }

  // 2. Custom App Errors (e.g. status code attached)
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR');

  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  const safeMessage = (isProduction && statusCode === 500)
    ? 'An unexpected error occurred while processing your request. Please try again later.'
    : (err.message || 'An unexpected internal server error occurred.');

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: safeMessage
    }
  });
}

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    }
  });
}
