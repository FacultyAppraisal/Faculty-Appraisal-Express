import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constant/userInfo';
import { validateToken, JWTPayload } from '../utils/jwt';
import { sendError, HttpStatus } from '../utils/response';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Authentication middleware that validates JWT and optionally checks roles
 */
export const authMiddleware = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        sendError(res, 'Missing token', HttpStatus.UNAUTHORIZED);
        return;
      }

      // Extract token from "Bearer <token>"
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        sendError(res, 'Invalid authorization format', HttpStatus.BAD_REQUEST);
        return;
      }

      // Validate token
      let decoded: JWTPayload;
      try {
        decoded = validateToken(token);
      } catch (error) {
        sendError(res, 'Invalid or expired token', HttpStatus.UNAUTHORIZED);
        return;
      }

      // Check role if roles are specified
      if (allowedRoles.length > 0) {
        const userRole = decoded.role as UserRole;
        if (!allowedRoles.includes(userRole)) {
          sendError(res, 'Forbidden', HttpStatus.FORBIDDEN);
          return;
        }
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        role: decoded.role as UserRole,
      };

      next();
    } catch (error) {
      sendError(res, 'Authentication failed', HttpStatus.UNAUTHORIZED);
    }
  };
};

/**
 * Optional auth middleware - doesn't fail if no token present
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token) {
        try {
          const decoded = validateToken(token);
          req.user = {
            userId: decoded.userId,
            role: decoded.role as UserRole,
          };
        } catch {
          // Token invalid, but we don't fail - just proceed without user
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};
