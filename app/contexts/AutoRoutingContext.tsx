import React, { createContext, useContext, useState } from 'react';

interface AutoRoutingContextType {
  autoRoutingEnabled: boolean;
  toggleAutoRouting: () => void;
}

const AutoRoutingContext = createContext<AutoRoutingContextType | undefined>(undefined);

export function AutoRoutingProvider({ children }: { children: React.ReactNode }) {
  const [autoRoutingEnabled, setAutoRoutingEnabled] = useState(false);

  const toggleAutoRouting = () => {
    setAutoRoutingEnabled(prev => !prev);
  };

  return (
    <AutoRoutingContext.Provider value={{ autoRoutingEnabled, toggleAutoRouting }}>
      {children}
    </AutoRoutingContext.Provider>
  );
}

export function useAutoRouting() {
  const context = useContext(AutoRoutingContext);
  if (context === undefined) {
    throw new Error('useAutoRouting must be used within an AutoRoutingProvider');
  }
  return context;
} 