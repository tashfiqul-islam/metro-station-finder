import React from 'react';
import { FaGoogle, FaFacebook, FaGithub } from 'react-icons/fa';

/**
 * Component for rendering social registration icons.
 */
const SocialRegister: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Divider */}
      <div className="flex items-center w-full my-4">
        <hr className="flex-grow border-gray-300" />
        <span className="text-sm text-gray-500 mx-2">Or Sign In with</span>
        <hr className="flex-grow border-gray-300" />
      </div>
      {/* Container for social registration icons */}
      <div className="flex items-center space-x-10">
        {/* Google registration icon */}
        <div className="border border-gray-400 rounded-md p-1 cursor-pointer transition duration-300 hover:border-red-600">
          <FaGoogle className="w-6 h-6 hover:text-red-600" />
        </div>
        {/* Facebook registration icon */}
        <div className="border border-gray-400 rounded-md p-1 cursor-pointer transition duration-300 hover:border-blue-600">
          <FaFacebook className="w-6 h-6 hover:text-blue-600" />
        </div>
        {/* GitHub registration icon */}
        <div className="border border-gray-400 rounded-md p-1 cursor-pointer transition duration-300 hover:border-black">
          <FaGithub className="w-6 h-6 hover:text-black" />
        </div>
      </div>
    </div>
  );
};

export default SocialRegister;
