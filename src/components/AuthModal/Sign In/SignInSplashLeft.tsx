// SignInSplashLeft.tsx
import React from 'react';

interface SignInSplashLeftProps {
  onSignInClick: () => void; // Function to handle click on sign-in button
  show: boolean; // Prop to control visibility
}

/**
 * Component for rendering an alternative left side content of the modal.
 * This component displays a welcome message and a sign-in button.
 */
const SignInSplashLeft: React.FC<SignInSplashLeftProps> = ({
  onSignInClick,
}) => (
  <div className={`flex flex-col items-center justify-center h-full`}>
    {/* Welcome message */}
    <h2 className="text-2xl font-bold mb-4 text-center text-white">
      Welcome Back!
    </h2>
    {/* Instruction text */}
    <p className="text-lg mb-8 text-center text-white">
      Please sign in with your account details.
    </p>
    {/* Sign In button */}
    <button
      type="button"
      onClick={onSignInClick}
      className="bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 hover:text-white transition duration-300"
    >
      Sign In
    </button>
  </div>
);

export default SignInSplashLeft;
