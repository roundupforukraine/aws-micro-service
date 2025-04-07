import { Organization } from '../tests/setup';

declare global {
  namespace Express {
    interface Request {
      organization?: Organization;
    }
  }
} 