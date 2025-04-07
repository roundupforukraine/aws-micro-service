import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Request Validation Middleware
 * 
 * This middleware validates incoming requests using express-validator.
 * It checks for validation errors in the request and returns a 400
 * status code with error messages if validation fails.
 * 
 * The middleware:
 * 1. Checks for validation errors using validationResult
 * 2. If errors exist, throws an AppError with the first error message
 * 3. If no errors, proceeds to the next middleware
 * 
 * This middleware should be used after defining validation rules
 * using express-validator's check() or body() methods.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function for error handling
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Throw error with first validation error message
    throw new AppError(errors.array()[0].msg, 400);
  }
  next();
}; 