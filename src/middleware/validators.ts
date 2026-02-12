import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { sendError, HttpStatus } from '../utils/response';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    sendError(
      res,
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      errors.array()
    );
    return;
  }
  next();
};


export const loginValidator = [
  body('userId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Valid userId is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors,
];
