import { jest } from '@jest/globals';

const mockFindUnique = jest.fn();

export const prisma = {
  organization: {
    findUnique: mockFindUnique
  }
}; 