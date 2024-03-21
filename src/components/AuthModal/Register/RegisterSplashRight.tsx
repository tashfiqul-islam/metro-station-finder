// RegisterSplashRight.tsx
import React from 'react';

interface RegisterSplashRightProps {
  onRegisterClick: () => void; // Function to handle click on register button
}

/**
 * Component for rendering an alternative right side content of the modal.
 * This component displays a greeting message and a register button.
 */
const RegisterSplashRight: React.FC<RegisterSplashRightProps> = ({
  onRegisterClick,
}) => (
  <div className="flex flex-col items-center justify-center h-full">
    {/* Greeting message */}
    <h2 className="text-2xl font-bold mb-4 text-center text-white">
      Hello, there!
    </h2>
    {/* Instruction text */}
    <p className="text-lg mb-8 text-center text-white">
      Register with your details.
    </p>
    {/* Register button */}
    <button
      type="button"
      onClick={onRegisterClick}
      className="bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 hover:text-white transition duration-300"
    >
      Register
    </button>
  </div>
);

export default RegisterSplashRight;
