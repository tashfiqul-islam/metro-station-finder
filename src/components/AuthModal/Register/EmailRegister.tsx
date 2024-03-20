import React from 'react';

/**
 * Component for rendering email registration form.
 */
const EmailRegister: React.FC = () => {
  return (
    <form className="w-full">
      {/* Name input field */}
      <div className="mb-4 w-full">
        <input
          type="text"
          id="name"
          name="name"
          className="mt-1 p-3 w-full md:w-96 rounded-lg bg-gray-100 border border-gray-300 placeholder-gray-500 shadow-sm focus:outline-none focus:border-blue-500 h-10 montserrat-regular"
          placeholder="Name"
        />
      </div>
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
    </form>
  );
};

export default EmailRegister;
