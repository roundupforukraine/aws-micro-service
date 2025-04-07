import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application-specific errors
 * 
 * This class extends the built-in Error class to add a status code
 * and operational flag. It's used to distinguish between operational
 * errors (expected errors that occur during normal operation) and
 * programming errors (unexpected errors that indicate a bug).
 * 
 * @param message - Error message to be displayed
 * @param statusCode - HTTP status code for the error response
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * 
 * This middleware handles all errors thrown in the application.
 * It distinguishes between operational errors (AppError instances)
 * and programming errors (other Error instances).
 * 
 * For operational errors:
 * - Returns the error message and status code to the client
 * - Logs the error for debugging
 * 
 * For programming errors:
 * - Returns a generic error message to the client
 * - Logs the full error details for debugging
 * 
 * @param err - Error object thrown in the application
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Handle operational errors (expected errors)
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Handle programming errors (unexpected errors)
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
}; 