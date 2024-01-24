import React, { useState } from 'react';

interface CustomDropdownProps {
  label: string;
  options: string[];
  onChange: (value: string) => void;
  value: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  options,
  onChange,
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Function to toggle dropdown visibility
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Function to handle option click
  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" data-te-dropdown-ref>
      {/* Dropdown Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between w-full px-4 py-2 rounded bg-primary text-xs font-medium uppercase leading-normal text-white text-gray-300 italic shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] motion-reduce:transition-none dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        type="button"
        data-te-dropdown-toggle-ref
        aria-expanded={isOpen}
        data-te-ripple-init
        data-te-ripple-color="light"
      >
        {value || label} {/* Display selected option or label */}
        <span className="w-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Options */}
      <ul
        className={`absolute z-[1000] float-left m-0 ${
          isOpen ? 'block' : 'hidden'
        } max-h-60 overflow-y-auto min-w-max list-none rounded-lg border-none bg-white bg-clip-padding text-left text-base shadow-lg dark:bg-neutral-700`}
        data-te-dropdown-menu-ref
      >
        {options.map((option, index) => (
          <li key={index}>
            <a
              onClick={() => handleOptionClick(option)}
              className="block w-full whitespace-nowrap bg-transparent px-4 py-2 text-sm font-normal text-neutral-700 hover:bg-neutral-100 active:text-neutral-800 active:no-underline disabled:pointer-events-none disabled:bg-transparent disabled:text-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-600"
              href="#"
              data-te-dropdown-item-ref
            >
              {option}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomDropdown;
