// next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  /**
   * Extends the built-in session types to include custom user attributes,
   * such as the user ID.
   */
  interface Session {
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  /** Extends the JWT type for consistency with the augmented session */
  interface JWT {
    userId?: string;
  }
}
