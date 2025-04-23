import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface RightSidebarState {
  code: string;
  generatedPrompt: any;
  activeTab: "code" | "prompt";
  isGenerating: boolean;
  selectedApplicationIndex: number | null;
}

interface RightSidebarContextType {
  sidebarState: RightSidebarState;
  setCode: (code: string) => void;
  setGeneratedPrompt: (prompt: any) => void;
  setActiveTab: (tab: "code" | "prompt") => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setSelectedApplicationIndex: (index: number | null) => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(
  undefined
);

export function RightSidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarState, setSidebarState] = useState<RightSidebarState>({
    code: "",
    generatedPrompt: null,
    activeTab: "code",
    isGenerating: false,
    selectedApplicationIndex: null,
  });

  const setCode = (code: string) => {
    setSidebarState((prev) => ({ ...prev, code }));
  };

  const setGeneratedPrompt = (prompt: any) => {
    setSidebarState((prev) => ({ ...prev, generatedPrompt: prompt, selectedApplicationIndex: null }));
  };

  const setActiveTab = (tab: "code" | "prompt") => {
    setSidebarState((prev) => ({ ...prev, activeTab: tab }));
  };

  const setIsGenerating = (isGenerating: boolean) => {
    setSidebarState((prev) => ({ ...prev, isGenerating }));
  };

  const setSelectedApplicationIndex = (index: number | null) => {
    setSidebarState((prev) => ({ ...prev, selectedApplicationIndex: index }));
  };

  return (
    <RightSidebarContext.Provider
      value={{
        sidebarState,
        setCode,
        setGeneratedPrompt,
        setActiveTab,
        setIsGenerating,
        setSelectedApplicationIndex,
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error(
      "useRightSidebar must be used within a RightSidebarProvider"
    );
  }
  return context;
}
