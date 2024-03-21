import React from 'react';
import EmailRegister from './EmailRegister';
import SocialRegister from './SocialRegister';

/**
 * Component for rendering the right side content of the modal.
 */
const RightModalContent: React.FC = () => (
  <div className="p-8 montserrat">
    {' '}
    {/* Apply Montserrat font */}
    <h2 className="text-xl font-semibold mb-4 text-center">Register</h2>{' '}
    {/* Center align Register */}
    {/* Render email login form */}
    <EmailRegister />
    <div className="flex justify-center mb-4">
      {/* Center-align the Register button with margin-top */}
      <div className="flex justify-center w-1/2 mt-2">
        {' '}
        {/* Added margin-top */}
        {/* Register button */}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white font-semibold py-2 px-4 mt-3 rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
        >
          Register
        </button>
      </div>
    </div>
    {/* Render social login icons */}
    <SocialRegister />
  </div>
);

export default RightModalContent;
