import React from 'react';
import EmailLogin from './EmailLogin';
import SocialLogins from './SocialLogins';

/**
 * Component for rendering the left side content of the modal.
 */
const LeftModalContent: React.FC = () => {
  return (
    <div className="p-8 montserrat"> {/* Apply Montserrat font */}
      <h2 className="text-xl font-semibold mb-4 text-center">Sign In</h2> {/* Center align Sign In */}
      {/* Render email login form */}
      <EmailLogin />
      <div className="flex justify-center mb-4">
        {/* Center-align the sign-in button with margin-top */}
        <div className="flex justify-center w-1/2 mt-2"> {/* Added margin-top */}
          {/* Sign-in button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
            >
              Sign In
          </button>
        </div>
      </div>
      {/* Render social login icons */}
      <SocialLogins />
    </div>
  );
};

export default LeftModalContent;
