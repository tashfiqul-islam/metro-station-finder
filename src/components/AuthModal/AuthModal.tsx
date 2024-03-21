import React, { ReactNode, useState } from 'react';
import LeftModalContent from './Sign In/LeftModalContent';
import RegisterSplashRight from './Register/RegisterSplashRight';
import RightModalContent from './Register/RightModalContent';
import SignInSplashLeft from './Sign In/SignInSplashLeft';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * The `AuthModal` component serves as a dynamic modal window that toggles
 * between sign-in and registration views based on user interaction.
 * It employs conditional rendering to manage which content is displayed.
 */
const AuthModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'md:max-w-screen-lg',
}) => {
  const [showSignIn, setShowSignIn] = useState(true);

  const toggleScreen = () => setShowSignIn(!showSignIn);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 flex items-center justify-center w-full h-full bg-black bg-opacity-50 z-50">
      <div className={`bg-white w-full ${maxWidth} min-h-[500px] flex rounded-lg`}>
        <div className={`w-1/2 flex flex-col justify-center items-center rounded-lg ${showSignIn ? 'bg-white' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ borderTopRightRadius: showSignIn ? '0' : '8rem', borderBottomRightRadius: showSignIn ? '0' : '8rem' }}>
          {showSignIn ? <LeftModalContent /> : <SignInSplashLeft onSignInClick={toggleScreen} show={false} />}
        </div>
        <div className={`w-1/2 flex flex-col justify-center items-center rounded-lg ${showSignIn ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-white'}`} style={{ borderTopLeftRadius: showSignIn ? '8rem' : '0', borderBottomLeftRadius: showSignIn ? '8rem' : '0' }}>
          {showSignIn ? <RegisterSplashRight onRegisterClick={toggleScreen} /> : <RightModalContent />}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
