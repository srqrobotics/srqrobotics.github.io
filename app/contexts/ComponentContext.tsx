import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ComponentContextType {
  selectedComponents: string[];
  setSelectedComponents: (components: string[]) => void;
  addSelectedComponent: (componentId: string) => void;
  removeSelectedComponent: (componentId: string) => void;
  clearSelectedComponents: () => void;
}

const ComponentContext = createContext<ComponentContextType | undefined>(
  undefined
);

export function ComponentProvider({ children }: { children: ReactNode }) {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const addSelectedComponent = (componentId: string) => {
    setSelectedComponents((prev) => {
      if (!prev.includes(componentId)) {
        return [...prev, componentId];
      }
      return prev;
    });
  };

  const removeSelectedComponent = (componentId: string) => {
    setSelectedComponents((prev) => prev.filter((id) => id !== componentId));
  };

  const clearSelectedComponents = () => {
    setSelectedComponents([]);
  };

  return (
    <ComponentContext.Provider
      value={{
        selectedComponents,
        setSelectedComponents,
        addSelectedComponent,
        removeSelectedComponent,
        clearSelectedComponents,
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponents() {
  const context = useContext(ComponentContext);
  if (context === undefined) {
    throw new Error("useComponents must be used within a ComponentProvider");
  }
  return context;
}
