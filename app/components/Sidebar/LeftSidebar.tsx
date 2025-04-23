import React from "react";
import ComponentsSidebar from "./ComponentsSidebar";
import { FaMicrochip } from "react-icons/fa";

export default function LeftSidebar() {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-800 shadow-sm">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button className="flex-1 py-3 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150">
          <FaMicrochip className="text-lg" />
        </button>
      </div>

      {/* Component Content */}
      <div className="flex-1 overflow-y-auto w-full h-full">
        <div className="w-full h-full">
          <ComponentsSidebar />
        </div>
      </div>
    </div>
  );
}
