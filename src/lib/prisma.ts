import { PrismaClient } from '@prisma/client';

// Ensure 'globalThis' is available in both Node.js and browser environments
declare const globalThis: {
  prisma?: PrismaClient;
};

// Initialize PrismaClient instance if not already initialized
if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient();
}

// Assign PrismaClient instance from globalThis variable
const { prisma } = globalThis;

// Export PrismaClient instance
export default prisma;
