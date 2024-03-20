import React, { ReactNode } from 'react';
import LeftModalContent from './Sign In/LeftModalContent';
import RightModalContent from './Register/RightModalContent';

interface ModalProps {
  isOpen: boolean; // Flag indicating whether the modal is open
  onClose: () => void; // Function to handle modal close event
  children: ReactNode; // Content to be rendered inside the modal
  maxWidth?: string; // Customizable maximum width for the modal
}

const AuthModal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'md:max-w-screen-lg' }) => {
  // Render the modal content only if it's open
  if (!isOpen) return null;

  return (
    // Background overlay for the modal
    <div className="fixed top-0 left-0 flex items-center justify-center w-full h-full bg-black bg-opacity-50 z-50">
      {/* Modal container */}
      <div className={`bg-white w-full ${maxWidth} min-h-[500px] flex rounded-lg`}>
        {/* Left section containing authentication content */}
        <div className="w-1/2 flex flex-col justify-center items-center">
          {/* Render left section content */}
          <LeftModalContent />
        </div>
        {/* Right section containing additional content */}
        <div className="w-1/2 bg-blue-500 flex flex-col justify-center items-center rounded-lg" style={{ borderTopLeftRadius: '10rem', borderBottomLeftRadius: '10rem' }}>
          {/* Render right section content here */}
          <RightModalContent />
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
