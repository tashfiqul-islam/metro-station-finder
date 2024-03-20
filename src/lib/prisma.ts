import { PrismaClient } from '@prisma/client';

// Declare global variable to store PrismaClient instance
declare const global: {
  prisma?: PrismaClient;
};

// Initialize PrismaClient instance
let prisma: PrismaClient;

// Initialize PrismaClient instance if not already initialized
if (!global.prisma) {
  global.prisma = new PrismaClient();
}

// Assign PrismaClient instance from global variable
prisma = global.prisma;

// Export PrismaClient instance
export default prisma;
