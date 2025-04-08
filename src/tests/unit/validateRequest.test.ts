import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../../middleware/errorHandler';

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

describe('validateRequest Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn()
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when there are no validation errors', () => {
    // Mock validationResult to return empty errors
    ((validationResult as unknown) as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    validateRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw AppError when validation errors exist', () => {
    const errorMessage = 'Validation failed';
    
    // Mock validationResult to return errors
    ((validationResult as unknown) as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: errorMessage }]
    });

    expect(() => {
      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    }).toThrow(AppError);

    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should throw AppError with correct status code and message', () => {
    const errorMessage = 'Invalid input';
    
    // Mock validationResult to return errors
    ((validationResult as unknown) as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: errorMessage }]
    });

    try {
      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe(errorMessage);
        expect(error.statusCode).toBe(400);
      }
    }
  });

  it('should handle multiple validation errors and use first error message', () => {
    const errors = [
      { msg: 'First error' },
      { msg: 'Second error' }
    ];
    
    // Mock validationResult to return multiple errors
    ((validationResult as unknown) as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors
    });

    try {
      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    } catch (error: unknown) {
      if (error instanceof AppError) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('First error');
        expect(error.statusCode).toBe(400);
      }
    }
  });
}); 