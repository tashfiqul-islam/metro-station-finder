// prisma.test.ts

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client for testing environment
export const prismaTesting = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRESQL_URI_TEST, // Test prisma connection with TEST URI
    },
  },
});

describe('Prisma tests', () => {
  test('Prisma connection should be successful', async () => {
    try {
      // Test the database connection by executing a simple query
      const result = await prismaTesting.$queryRaw`SELECT 1+1 AS result`;
      console.log('Database connection verified successfully.');
      console.log('Result:', result);
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw new Error('Database connection test failed.');
    } finally {
      // Disconnect from the database
      await prismaTesting.$disconnect();
    }
  });
});
