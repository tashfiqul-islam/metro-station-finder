import React, { useState } from 'react';
import AuthModal from './AuthModal/AuthModal';

// Define the props for the Avatar component
interface AvatarProps {
  isAuthenticated: boolean; // Prop indicating whether the user is authenticated
}

// Avatar component representing the user's avatar in the navigation bar
const Avatar: React.FC<AvatarProps> = ({ isAuthenticated }) => {
  // State to control the visibility of the dropdown menu
  const [showDropdown, setShowDropdown] = useState(false);
  // State to control the visibility of the modal
  const [showModal, setShowModal] = useState(false);
  // State to control whether to show sign-in or registration screen
  const [showSignIn, setShowSignIn] = useState(true);

  // Function to toggle the dropdown menu visibility
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Function to open the modal and set showSignIn based on the option clicked
  const openModalAndSetSignIn = (signIn: boolean) => {
    setShowSignIn(signIn);
    setShowModal(true);
    setShowDropdown(false); // Close the dropdown menu
  };

  return (
    <div className="avatar ml-4 relative">
      {/* Avatar image */}
      <img
        className="w-8 h-8 rounded-full cursor-pointer"
        src="/assets/avatar.jpg" // Path to the image in the public folder
        alt="Avatar"
        onClick={toggleDropdown} // Toggle dropdown menu visibility
      />
      {/* Dropdown menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg">
          <div className="py-1">
            {/* Login and Register options */}
            {!isAuthenticated && (
              <>
                <button
                  className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 w-full text-left"
                  onClick={() => openModalAndSetSignIn(true)} // Open modal with sign-in screen
                >
                  Login
                </button>
                <div className="border-t border-gray-200" /> {/* Divider */}
                <button
                  className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 w-full text-left"
                  onClick={() => openModalAndSetSignIn(false)} // Open modal with registration screen
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* AuthModal component to handle login and registration */}
      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialShowSignIn={showSignIn} // Pass the showSignIn state variable as initialShowSignIn prop
      >
        <></>
      </AuthModal>
    </div>
  );
};

export default Avatar;
