import React, { useState, useEffect, useRef } from 'react';
import AuthModal from './AuthModal/AuthModal';
import Image from 'next/image';
import styles from './Animations/Avatar.module.css'; // Import CSS module

interface AvatarProps {
  isAuthenticated: boolean; // Prop indicating whether the user is authenticated
}

const Avatar: React.FC<AvatarProps> = ({ isAuthenticated }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSignIn, setShowSignIn] = useState(true);
  const avatarRef = useRef<HTMLDivElement>(null); // Reference to the Avatar div

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click event occurred outside of the Avatar component
      if (
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false); // Hide the dropdown
      }
    };

    // Add event listener for clicks outside of the Avatar component
    document.addEventListener('click', handleClickOutside);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []); // Only run this effect once, on component mount

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const openModalAndSetSignIn = (signIn: boolean) => {
    setShowSignIn(signIn);
    setShowModal(true);
    setShowDropdown(false); // Close the dropdown menu
  };

  return (
    <div className="avatar ml-4 relative" ref={avatarRef}>
      {/* Avatar image */}
      <Image
        className="w-10 h-10 rounded-full cursor-pointer"
        src="/assets/avatar.jpg"
        alt="Avatar"
        width={500}
        height={500}
        onClick={toggleDropdown}
      />
      {/* Dropdown menu */}
      {showDropdown && ( // Conditionally render the dropdown only when showDropdown is true
        <div className={`${styles.dropdown}`}>
          <div className="absolute right-0 mt-4 w-48 bg-slate-700 rounded-md shadow-lg">
            <div className="py-1">
              {/* Login and Register options */}
              {!isAuthenticated && (
                <>
                  <button
                    className="block px-4 py-2 text-sm text-white hover:bg-slate-600 w-full text-left"
                    onClick={() => openModalAndSetSignIn(true)}
                  >
                    Login
                  </button>
                  <div className="border-t border-slate-500" />
                  <button
                    className="block px-4 py-2 text-sm text-white hover:bg-slate-600 w-full text-left"
                    onClick={() => openModalAndSetSignIn(false)}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* AuthModal component to handle login and registration */}
      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialShowSignIn={showSignIn}
      >
        <></>
      </AuthModal>
    </div>
  );
};

export default Avatar;
