import React, { useEffect, useState } from "react";

interface ComponentItemProps {
  name: string;
  icon: string;
  onDragStart: (e: React.DragEvent) => void;
}

export default function ComponentItem({
  name,
  icon,
  onDragStart,
}: ComponentItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imagePath, setImagePath] = useState<string>("");

  useEffect(() => {
    // If the icon path is relative and doesn't start with http or /, add a leading slash
    if (icon && !icon.startsWith("http") && !icon.startsWith("/")) {
      setImagePath(`/${icon}`);
    } else {
      setImagePath(icon);
    }
    console.log(`Component ${name} icon path:`, imagePath);
  }, [name, icon]);

  const handleImageError = () => {
    console.error(`Failed to load image for component ${name}:`, imagePath);
    setImageError(true);
  };

  return (
    <div
      className="flex flex-col items-center p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-gray-200 dark:border-gray-600 transition-colors duration-150"
      draggable
      onDragStart={onDragStart}
    >
      <div className="w-10 h-10 flex items-center justify-center mb-1">
        {imagePath && !imageError ? (
          <img
            src={imagePath}
            alt={name}
            className="w-full h-full object-contain"
            onError={handleImageError}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
          </svg>
        )}
      </div>
      <span className="text-xs text-center text-gray-600 dark:text-gray-300 truncate w-full">
        {name}
      </span>
    </div>
  );
}
