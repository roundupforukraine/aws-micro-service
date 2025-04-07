import crypto from 'crypto';

export const generateApiKey = (): string => {
  return crypto.randomBytes(16).toString('hex');
}; 