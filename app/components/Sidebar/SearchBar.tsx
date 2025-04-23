import React from 'react';

export default function SearchBar() {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <input
        type="text"
        placeholder="Search components..."
        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
    </div>
  );
} 