import React, { createContext, useContext, useState, useCallback } from "react";

interface CanvasRefreshContextType {
  refreshTrigger: number;
  triggerCanvasRefresh: () => void;
}

const CanvasRefreshContext = createContext<
  CanvasRefreshContextType | undefined
>(undefined);

export function CanvasRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerCanvasRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <CanvasRefreshContext.Provider
      value={{
        refreshTrigger,
        triggerCanvasRefresh,
      }}
    >
      {children}
    </CanvasRefreshContext.Provider>
  );
}

export function useCanvasRefresh() {
  const context = useContext(CanvasRefreshContext);
  if (context === undefined) {
    throw new Error(
      "useCanvasRefresh must be used within a CanvasRefreshProvider"
    );
  }
  return context;
}
