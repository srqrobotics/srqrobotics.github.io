import React, { useState, useRef } from "react";
import Canvas from "../Canvas/Canvas";
import {
  FaPlay,
  FaCode,
  FaTable,
  FaMicrochip,
  FaFileCode,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
} from "react-icons/fa";
import { IoMdUndo, IoMdRedo } from "react-icons/io";
import { BsZoomIn, BsZoomOut } from "react-icons/bs";
import { FiSun, FiMoon } from "react-icons/fi";
import RightSidebar from "../Sidebar/RightSidebar";
import LeftSidebar from "../Sidebar/LeftSidebar";
import { useTheme } from "~/contexts/ThemeContext";
import { useFile } from "~/contexts/FileContext";
import { useAutoRouting } from "~/contexts/AutoRoutingContext";
import { useCanvasRefresh } from "~/contexts/CanvasRefreshContext";

export default function Layout() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { setSelectedFile, selectedFile } = useFile();
  const { autoRoutingEnabled, toggleAutoRouting } = useAutoRouting();
  const { triggerCanvasRefresh } = useCanvasRefresh();
  const [activeRightTab, setActiveRightTab] = useState<"code">("code");
  const [rightPanelWidth, setRightPanelWidth] = useState(600);
  const [leftPanelWidth, setLeftPanelWidth] = useState(200); // 18rem = 288px
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const handleCodeButtonClick = () => {
    setSelectedFile("/projects/defaultCode.ino");
    setActiveRightTab("code");
  };

  const handleTableButtonClick = () => {
    setSelectedFile("/configs/demo.json");
    setActiveRightTab("code");
  };

  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed((prev) => !prev);
  };

  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed((prev) => !prev);
  };

  const handleRefreshCanvas = () => {
    triggerCanvasRefresh();
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
          {/* Project Title */}
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Circuit Smith
          </h1>

          {/* Basic Controls */}
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
              <IoMdUndo />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
              <IoMdRedo />
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
              <BsZoomIn />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
              <BsZoomOut />
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
            <button 
              onClick={handleRefreshCanvas}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100"
              title="Refresh Canvas"
            >
              <FaSync />
            </button>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-gray-100"
          >
            {isDarkMode ? <FiSun /> : <FiMoon />}
          </button>
          <button
            id="layout-auto-route-button"
            className={`flex items-center gap-2 px-3 py-1.5 ${
              autoRoutingEnabled
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white rounded-md transition-colors`}
            onClick={toggleAutoRouting}
          >
            <span id="layout-auto-route-text">
              {autoRoutingEnabled ? "Stop Routing" : "Auto Route"}
            </span>
          </button>
          <button className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center space-x-2">
            <FaPlay className="text-sm" />
            <span>Start Simulation</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative bg-gray-50 dark:bg-gray-800">
        {/* Left Sidebar */}
        <div
          ref={leftPanelRef}
          style={{
            width: isLeftSidebarCollapsed ? "40px" : `${leftPanelWidth}px`,
            transition: "width 0.3s ease",
            position: "relative",
          }}
          className="h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800"
        >
          {!isLeftSidebarCollapsed && <LeftSidebar />}
          {isLeftSidebarCollapsed && (
            <div className="h-full flex items-center justify-center">
              <FaMicrochip className="text-gray-700 dark:text-gray-300" />
            </div>
          )}
          <button
            onClick={toggleLeftSidebar}
            className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md z-20 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isLeftSidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 h-full relative overflow-hidden">
          <Canvas />
        </div>

        {/* Right Sidebar */}
        <div
          ref={rightPanelRef}
          style={{
            width: isRightSidebarCollapsed ? "40px" : `${rightPanelWidth}px`,
            transition: "width 0.3s ease",
            position: "relative",
          }}
          className="h-full border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800"
        >
          {!isRightSidebarCollapsed ? (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button className="flex-1 py-2 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                  <FaFileCode />
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <RightSidebar />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <FaFileCode className="text-gray-700 dark:text-gray-300" />
            </div>
          )}
          <button
            onClick={toggleRightSidebar}
            className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md z-20 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isRightSidebarCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>
      </div>
    </div>
  );
}
