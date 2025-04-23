import React, { createContext, useContext, useState } from "react";

interface CoordinateContextType {
  coordinates: { x: number; y: number };
  setCoordinates: (coords: { x: number; y: number }) => void;
}

const CoordinateContext = createContext<CoordinateContextType | null>(null);

export function CoordinateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  return (
    <CoordinateContext.Provider value={{ coordinates, setCoordinates }}>
      {children}
    </CoordinateContext.Provider>
  );
}

export function useCoordinates() {
  const context = useContext(CoordinateContext);
  if (!context) {
    throw new Error("useCoordinates must be used within a CoordinateProvider");
  }
  return context;
}
