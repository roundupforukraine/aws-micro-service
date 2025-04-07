import { PrismaClient } from '@prisma/client';

// Create a new Prisma client for testing
const prisma = new PrismaClient();

export default async function globalTeardown() {
  // Close the Prisma client connection
  await prisma.$disconnect();
  
  console.log('Global teardown completed');
} 