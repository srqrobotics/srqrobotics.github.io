import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Line, Group, Image, Text } from "react-konva";
import Konva from "konva";
import { useFile } from "~/contexts/FileContext";
import type { Wire, DroppedComponent } from "~/types/circuit";
import { handleWireDrawing } from "~/utils/wireManager";
import {
  ComponentLoader,
  findPath,
  shiftOverlappingPaths,
} from "~/utils/componentLoader";
import { preloadImage } from "~/utils/imageLoader";
import { useCoordinates } from "~/contexts/CoordinateContext";
import { useAutoRouting } from "~/contexts/AutoRoutingContext";
import { useCanvasRefresh } from "~/contexts/CanvasRefreshContext";

export default function Canvas() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [components, setComponents] = useState<DroppedComponent[]>([]);
  const [loadedImages, setLoadedImages] = useState<{
    [key: string]: HTMLImageElement;
  }>({});
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [wires, setWires] = useState<Wire[]>([]);
  const [isDrawingWire, setIsDrawingWire] = useState(false);
  const [currentWire, setCurrentWire] = useState<number[]>([]);
  const [wireColor, setWireColor] = useState("#ff0000");
  const stageRef = useRef<any>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { setCoordinates } = useCoordinates();
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const { autoRoutingEnabled } = useAutoRouting();
  const [config, setConfig] = useState<any>(null);
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(
    null
  );
  const [hoveredComponentName, setHoveredComponentName] = useState<
    string | null
  >(null);
  const [isDraggingWires, setIsDraggingWires] = useState(false);
  const routingInProgress = useRef(false);
  const componentsRef = useRef<DroppedComponent[]>([]);
  const { refreshTrigger } = useCanvasRefresh();

  // Keep componentsRef in sync with components state
  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  // Initialize canvas and load components
  useEffect(() => {
    setIsMounted(true);
    const updateDimensions = () => {
      const container = document.querySelector(
        ".flex-1.h-full.relative.overflow-hidden"
      );
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    const container = document.querySelector(
      ".flex-1.h-full.relative.overflow-hidden"
    );
    if (container) {
      resizeObserver.observe(container);
    }

    // Load initial components
    const initializeCanvas = async () => {
      try {
        const loadedConfig = await ComponentLoader.loadInitialComponents(
          setLoadedImages,
          setComponents,
          setWires
        );
        setConfig(loadedConfig);
      } catch (error) {
        console.error("Error initializing canvas:", error);
      }
    };

    initializeCanvas();

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Reload configuration when refreshTrigger changes
  useEffect(() => {
    const reloadConfiguration = async () => {
      try {
        console.log("Reloading configuration due to refresh trigger");
        const loadedConfig = await ComponentLoader.loadInitialComponents(
          setLoadedImages,
          setComponents,
          setWires
        );
        setConfig(loadedConfig);

        // If auto-routing is enabled, start routing with the new configuration
        if (autoRoutingEnabled) {
          startRouting();
        }
      } catch (error) {
        console.error("Error reloading configuration:", error);
      }
    };

    if (refreshTrigger > 0) {
      reloadConfiguration();
    }
  }, [refreshTrigger, autoRoutingEnabled]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPosition(newPos);
  };

  const handleDragStart = (e: any) => {
    setIsDraggingComponent(true);
    setIsDraggingWires(true);
    setWires([]);
    const componentId = hoveredComponentName;
    setDraggedComponentId(componentId);
  };

  const handleDragEnd = async (e: any) => {
    if (isDraggingComponent) {
      const pos = {
        x: Math.round(e.target.x()),
        y: Math.round(e.target.y()),
      };

      const draggedComponent = components.find(
        (c) => c.name === hoveredComponentName
      );

      if (draggedComponent) {
        // Update the component's position in state
        const updatedComponents = components.map((c) =>
          c.id === draggedComponent.id ? { ...c, x: pos.x, y: pos.y } : c
        );
        setComponents(updatedComponents);

        // Update the component position in the configuration
        await ComponentLoader.updateComponentPosition(
          draggedComponent.id,
          pos.x,
          pos.y
        );

        // Only recalculate routing if auto-routing is enabled
        if (autoRoutingEnabled) {
          // Wait for the component state to be updated
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Force a complete re-routing of all components
          await startRouting();
        }
      }
    }

    setIsDraggingComponent(false);
    setDraggedComponentId(null);
    setIsDraggingWires(false);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const position = stage.getPointerPosition();
    if (!position) return;

    const scaledPosition = {
      x: Math.round((position.x - stage.x()) / scale),
      y: Math.round((position.y - stage.y()) / scale),
    };
    setMousePosition(scaledPosition);
    setCoordinates(scaledPosition);

    const hoveredComponent = components.find(
      (component) =>
        scaledPosition.x >= component.x &&
        scaledPosition.x <= component.x + component.image.width &&
        scaledPosition.y >= component.y &&
        scaledPosition.y <= component.y + component.image.height
    );

    setHoveredComponentName(hoveredComponent ? hoveredComponent.name : null);
  };

  const startRouting = async () => {
    // Prevent multiple routing operations from running simultaneously
    if (routingInProgress.current) {
      console.log("Routing already in progress, skipping...");
      return;
    }

    if (!config) {
      console.error("Config is not loaded yet.");
      return;
    }

    routingInProgress.current = true;
    setIsRouting(true);
    ComponentLoader.colorIndex = 0;

    try {
      // Get the current component positions from the ref
      const currentComponents = componentsRef.current;
      console.log(
        "Starting routing with current components:",
        currentComponents
      );

      // Clear any existing wires
      setWires([]);

      // Create a new array for wire connections
      const compWiring: Wire[] = [];

      // Get device bounds for path finding using current component positions
      const bounds = ComponentLoader.getDeviceBounds(currentComponents);

      // Process wire connections with the current component positions
      await ComponentLoader.processWireConnections(
        config,
        currentComponents,
        compWiring,
        setComponents
      );

      // Process each wire to find valid paths around components
      compWiring.forEach((wire) => {
        if (wire.points.length >= 6) {
          const [startX, startY] = [wire.points[2], wire.points[3]];
          const [endX, endY] = [wire.points[4], wire.points[5]];
          const path = findPath([startX, startY], [endX, endY], bounds);
          if (path.length > 0) {
            const wirePath = path.flat();
            wire.points.splice(wire.points.length - 4, 0, ...wirePath);
          }
        }
      });

      // Shift overlapping paths
      const newWiring = shiftOverlappingPaths(compWiring, bounds);
      const finalWires = shiftOverlappingPaths(newWiring, bounds);

      console.log("Routing complete, setting wires:", finalWires);
      setWires(finalWires);
    } catch (error) {
      console.error("Error during routing:", error);
    } finally {
      setIsRouting(false);
      routingInProgress.current = false;
    }
  };

  // Add a useEffect to handle auto-routing state changes
  useEffect(() => {
    if (autoRoutingEnabled) {
      console.log("Auto-routing enabled, starting routing...");
      startRouting();
    } else {
      console.log("Auto-routing disabled, clearing wires...");
      setWires([]);
    }
  }, [autoRoutingEnabled]);

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-800">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        draggable={!isDraggingComponent}
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        ref={stageRef}
      >
        <Layer>
          {/* Render components */}
          {components.map((component) => (
            <Group
              key={component.id}
              x={component.x}
              y={component.y}
              draggable={isCtrlPressed}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Image
                image={loadedImages[component.image.src]}
                width={component.image.width}
                height={component.image.height}
              />
            </Group>
          ))}

          {/* Render wires - using straight lines instead of curved ones */}
          {!isDraggingWires &&
            wires.map((wire, i) => (
              <Line
                key={i}
                points={wire.points}
                stroke={wire.color}
                strokeWidth={2}
                tension={0} // Set tension to 0 for straight lines
              />
            ))}
        </Layer>
      </Stage>
    </div>
  );
}
