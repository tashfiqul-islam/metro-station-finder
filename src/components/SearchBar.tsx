import React, { useState, FormEvent } from 'react';

// Define the props for the SearchBar component
interface SearchBarProps {
  onSearch: (searchTerm: string) => void; // Function to execute when a search is performed
}

// The SearchBar component with extended and centered styling
const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState<string>(''); // State to hold the search term

  // Handles the form submission by calling the onSearch prop with the search term
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission behavior
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim()); // Execute the onSearch function with trimmed search term
    }
  };

  return (
    <div className="flex justify-center items-center w-full py-4 bg-white shadow-md">
      {/* Form for the search bar */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4">
        <div className="flex items-center border-b-2 border-teal-500">
          {/* Input field for entering the search term */}
          <input
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-2 px-4 leading-tight focus:outline-none"
            type="text"
            placeholder="Enter a location"
            aria-label="Location"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Button to submit the search */}
          <button
            className="flex-shrink-0 bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-sm border-4 text-white py-2 px-4 rounded"
            type="submit"
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
