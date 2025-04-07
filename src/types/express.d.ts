import { Organization } from '../tests/setup';
import { Admin } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
      organization?: any; // We'll keep this for backward compatibility
    }
  }
} 