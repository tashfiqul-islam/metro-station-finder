// prismaConnection.test.ts

import { prismaTesting } from './prisma.test';

describe('Prisma connection tests', () => {
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
