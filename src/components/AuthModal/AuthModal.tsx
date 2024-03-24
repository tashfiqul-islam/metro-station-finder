import React, { ReactNode, useState, useEffect } from 'react';
import LeftModalContent from './Sign In/LeftModalContent';
import RegisterSplashRight from './Register/RegisterSplashRight';
import RightModalContent from './Register/RightModalContent';
import { FaRegWindowClose } from 'react-icons/fa';
import styles from './AuthModal.module.css';
import SignInSplashLeft from './Sign In/SignInSplashLeft';

// Define the props for the AuthModal component
interface ModalProps {
  isOpen: boolean; // Indicates whether the modal is open or not
  onClose: () => void; // Function to close the modal
  children: ReactNode; // Children components
  maxWidth?: string; // Maximum width of the modal (default value is 'md:max-w-screen-lg')
  initialShowSignIn: boolean; // Whether to initially show the sign-in screen or the registration screen
}

// AuthModal component
const AuthModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  maxWidth = 'md:max-w-screen-lg', // Default max width for the modal
  initialShowSignIn, // Prop to specify initial state of showSignIn
}) => {
  const [showSignIn, setShowSignIn] = useState(initialShowSignIn); // State to manage whether to show sign-in or registration screen

  useEffect(() => {
    // Update showSignIn state when initialShowSignIn prop changes
    setShowSignIn(initialShowSignIn);
  }, [initialShowSignIn]);

  // Function to toggle between sign-in and registration screens
  const toggleScreen = () => setShowSignIn(!showSignIn);

  // If modal is not open, return null (modal is hidden)
  if (!isOpen) return null;

  return (
    // Modal overlay with backdrop
    <div className="fixed top-0 left-0 flex items-center justify-center w-full h-full bg-black bg-opacity-50 z-50">
      {/* Modal content container */}
      <div
        className={`bg-white w-full ${maxWidth} min-h-[500px] flex rounded-lg relative`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-grey-500 hover:text-grey-700 focus:outline-none"
        >
          <FaRegWindowClose className="h-6 w-6" />
        </button>
        {/* Left side container */}
        <div
          className={`w-1/2 flex flex-col justify-center items-center rounded-lg ${
            showSignIn ? styles.LeftModalContent : styles.RegisterSplashRight
          }`}
          style={{
            borderTopRightRadius: showSignIn ? '0' : '8rem',
            borderBottomRightRadius: showSignIn ? '0' : '8rem',
          }}
        >
          {/* Render left content based on showSignIn state */}
          {showSignIn ? (
            <LeftModalContent />
          ) : (
            <SignInSplashLeft onSignInClick={toggleScreen} show={false} />
          )}
        </div>
        {/* Right side container */}
        <div
          className={`w-1/2 flex flex-col justify-center items-center rounded-lg ${
            showSignIn ? styles.RegisterSplashRight : styles.RightModalContent
          }`}
          style={{
            borderTopLeftRadius: showSignIn ? '8rem' : '0',
            borderBottomLeftRadius: showSignIn ? '8rem' : '0',
          }}
        >
          {/* Render right content based on showSignIn state */}
          {showSignIn ? (
            <RegisterSplashRight onRegisterClick={toggleScreen} />
          ) : (
            <RightModalContent />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
