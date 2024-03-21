import React from 'react';

/**
 * Component for rendering email login form.
 */
const EmailLogin: React.FC = () => (
  <form className="w-full">
    {/* Email input field */}
    <div className="mb-4 w-full">
      <input
        type="email"
        id="email"
        name="email"
        className="mt-1 p-3 w-full md:w-96 rounded-lg bg-gray-100 border border-gray-300 placeholder-gray-500 shadow-sm focus:outline-none focus:border-blue-500 h-10 montserrat-regular"
        placeholder="Email"
      />
    </div>
    {/* Password input field */}
    <div className="mb-2 w-full relative">
      <input
        type="password"
        id="password"
        name="password"
        className="mt-1 p-3 w-full md:w-96 rounded-lg bg-gray-100 border border-gray-300 placeholder-gray-500 shadow-sm focus:outline-none focus:border-blue-500 h-10 montserrat-regular"
        placeholder="Password"
      />
    </div>
    {/* Remember me and Forgot password row */}
    <div className="flex justify-between items-center mb-4">
      {/* Remember me checkbox */}
      <div className="flex items-center">
        <input type="checkbox" id="rememberMe" className="mr-2" />
        <label htmlFor="rememberMe" className="text-sm text-gray-500">
          Remember me
        </label>
      </div>
      {/* Forgot password link */}
      <div className="text-sm text-gray-500">
        <a href="#" className="underline">
          Forgot your password?
        </a>
      </div>
    </div>
  </form>
);

export default EmailLogin;
