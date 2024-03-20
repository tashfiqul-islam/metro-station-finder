module.exports = {
  target: './.next/pages/_app.js',
  faithfull: false,
  dev: false,
  dir: {
    read: ['pages'],
    write: ['pages'],
  },
  rules: {
    '/': 'soft',
    '/register': 'soft',
    '/login': 'soft',
    '/logout': 'soft',
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
    signOut: '/auth/signout', // Custom sign-out page
    error: '/auth/error', // Custom error page
    verifyRequest: '/auth/verify-request', // Custom email verification request page
    newUser: '/auth/new-user', // Custom new user registration page
  },
  callbacks: {
    async jwt(token, user, account, profile, isNewUser) {
      if (!user) throw new Error('No user found');
      const { email } = user;
      // Save user data in session
      session.user = user;
      // Generate a JWT token
      const jwtToken = await jwt.sign(user, process.env.NEXTAUTH_SECRET, {
        expiresIn: 86400, // Expires in 24 hours
      });
      // Return the JWT token
      return jwtToken;
    },
    async session(session, token) {
      // Check if the session is valid
      if (!session.user) throw new Error('Invalid session');
      // Update the session with the new token
      session.token = token;
      // Save the updated session
      await session.save();
    },
  },
  databases: {
    users: {
      // Connect to the PostgreSQL database
      url: process.env.POSTGRES_URI,
      // Define the table name
      tableName: 'users',
    },
  },
  strategies: {
    google: {
      // Use the Google OAuth 2.0 strategy
      strategy: require('next-auth/strategies/google').Strategy,
      // Set the Google Client ID and Secret
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      // Use the Facebook OAuth 2.0 strategy
      strategy: require('next-auth/strategies/facebook').Strategy,
      // Set the Facebook Client ID and Secret
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    github: {
      // Use the GitHub OAuth 2.0 strategy
      strategy: require('next-auth/strategies/github').Strategy,
      // Set the GitHub Client ID and Secret
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
};
