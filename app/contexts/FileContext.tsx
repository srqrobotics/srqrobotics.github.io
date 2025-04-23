import React, { createContext, useContext, useState } from 'react';

interface FileContextType {
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
}

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <FileContext.Provider value={{ selectedFile, setSelectedFile }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFile() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
} 