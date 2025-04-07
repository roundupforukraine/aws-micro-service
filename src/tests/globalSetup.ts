import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

// Create a new Prisma client for testing
const prisma = new PrismaClient();

export default async function globalSetup() {
  // Clean up the database before all tests
  await prisma.transaction.deleteMany();
  await prisma.organization.deleteMany();
  
  console.log('Global setup completed');
} 