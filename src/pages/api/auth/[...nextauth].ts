import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

// Initialize Prisma
const initializePrisma = async () => {
  try {
    // Ensure Prisma is connected to the database
    await prisma.$connect();
    console.info('Prisma connected successfully.');
  } catch (error) {
    console.error('Error connecting to Prisma:', error);
    throw new Error('Failed to connect to Prisma.');
  }
};

// Initialize Prisma when the module is loaded
initializePrisma();

/**
 * Authenticate user and generate JWT token.
 * @param email User's email.
 * @param password User's password.
 * @returns JWT token on successful authentication.
 */
const authenticateUser = async (email: string, password: string) => {
  try {
    // Find the user in the database
    const user = await prisma.users.findUnique({ where: { email } });

    // Check if the user exists and if the password is correct
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
      expiresIn: '30d',
    });

    return token;
  } catch (error) {
    throw new Error(
      'Authentication failed: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
  }
};

/**
 * Handle POST request for authentication.
 * @param req Next.js API request object.
 * @param res Next.js API response object.
 */
const handleAuthentication = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  try {
    // Check if the request method is POST
    if (req.method === 'POST') {
      const { email, password } = req.body;

      // Validate email and password
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Authenticate user and get JWT token
      const token = await authenticateUser(email, password);

      // Send JWT token as response
      res.status(200).json({ token });
    } else {
      // If the request method is not POST, send 405 Method Not Allowed
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // Handle any errors and send a 500 Internal Server Error response
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};

/**
 * Next.js API route handler for authentication.
 * @param req Next.js API request object.
 * @param res Next.js API response object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  try {
    // Handle authentication logic
    await handleAuthentication(req, res);
  } catch (error) {
    // Handle any errors during Prisma connection or authentication
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    });
  } finally {
    // Ensure that the Prisma client is disconnected from the database
    await prisma.$disconnect();
  }
}

// Optional: Custom Pages Configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
