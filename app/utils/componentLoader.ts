import { preloadImage } from "./imageLoader";
import type { DroppedComponent, Wire } from "~/types/circuit";

interface PinMapData {
  "digital-pins": {
    id: string[];
    reloc: { id: string; points: number[] }[];
  };
}

interface GroundSymbol extends DroppedComponent {
  pinMap: PinMapData;
  type: string;
  name: string;
  rotation: number;
}

export const wireColor = {
  blue: "#0000ff",
  orange: "#ffa500",
  green: "#00ff00",
  brown: "#8b4513",
  gray: "#808080",
  white: "#ffffff",
  yellow: "#ffff00",
  violet: "#8a2be2",
  rose: "#ff007f",
  aqua: "#00ffff",
  red: "#ff0000",
  black: "#000000",
} as const;

export function findPath(
  start: [number, number],
  end: [number, number],
  bounds: number[][]
): [number, number][] {
  // Check if path is blocked by any bounds
  function isBlocked(x: number, y: number): boolean {
    return bounds.some(([x1, y1, x2, y2]) => {
      return x >= x1 && x <= x2 && y >= y1 && y <= y2;
    });
  }

  // Check if line segment intersects with any bounds
  function intersectsBounds(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    if (x1 === x2) {
      // Vertical line
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      for (let y = minY; y <= maxY; y++) {
        if (isBlocked(x1, y)) return true;
      }
    } else {
      // Horizontal line
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      for (let x = minX; x <= maxX; x++) {
        if (isBlocked(x, y1)) return true;
      }
    }
    return false;
  }

  // Try direct path first (L shape)
  const [x1, y1] = start;
  const [x2, y2] = end;

  // Try horizontal first, then vertical
  if (!intersectsBounds(x1, y1, x2, y1) && !intersectsBounds(x2, y1, x2, y2)) {
    return [start, [x2, y1], end];
  }

  // Try vertical first, then horizontal
  if (!intersectsBounds(x1, y1, x1, y2) && !intersectsBounds(x1, y2, x2, y2)) {
    return [start, [x1, y2], end];
  }

  // If L-shape paths are blocked, try adding an additional segment (Z shape)
  const midX = (x1 + x2) / 2;
  if (
    !intersectsBounds(x1, y1, midX, y1) &&
    !intersectsBounds(midX, y1, midX, y2) &&
    !intersectsBounds(midX, y2, x2, y2)
  ) {
    return [start, [midX, y1], [midX, y2], end];
  }

  const midY = (y1 + y2) / 2;
  if (
    !intersectsBounds(x1, y1, x1, midY) &&
    !intersectsBounds(x1, midY, x2, midY) &&
    !intersectsBounds(x2, midY, x2, y2)
  ) {
    return [start, [x1, midY], [x2, midY], end];
  }

  // Try going around the device bounds
  for (const bound of bounds) {
    const [bx1, by1, bx2, by2] = bound;

    // Try going above the device
    const topY = by1 - 20;
    if (
      !intersectsBounds(x1, y1, x1, topY) &&
      !intersectsBounds(x1, topY, x2, topY) &&
      !intersectsBounds(x2, topY, x2, y2)
    ) {
      return [start, [x1, topY], [x2, topY], end];
    }

    // Try going below the device
    const bottomY = by2 + 20;
    if (
      !intersectsBounds(x1, y1, x1, bottomY) &&
      !intersectsBounds(x1, bottomY, x2, bottomY) &&
      !intersectsBounds(x2, bottomY, x2, y2)
    ) {
      return [start, [x1, bottomY], [x2, bottomY], end];
    }

    // Try going left of the device
    const leftX = bx1 - 20;
    if (
      !intersectsBounds(x1, y1, leftX, y1) &&
      !intersectsBounds(leftX, y1, leftX, y2) &&
      !intersectsBounds(leftX, y2, x2, y2)
    ) {
      return [start, [leftX, y1], [leftX, y2], end];
    }

    // Try going right of the device
    const rightX = bx2 + 20;
    if (
      !intersectsBounds(x1, y1, rightX, y1) &&
      !intersectsBounds(rightX, y1, rightX, y2) &&
      !intersectsBounds(rightX, y2, x2, y2)
    ) {
      return [start, [rightX, y1], [rightX, y2], end];
    }
  }

  // If no path found, return empty array
  return [];
}

export function shiftOverlappingPaths(
  paths: Wire[],
  bounds: number[][]
): Wire[] {
  const modifiedPaths = [...paths];
  const MIN_SHIFT = 5;
  const MAX_SHIFT = 15;
  const BOUNDARY_MARGIN = 20; // Distance to shift outside boundaries

  // Track overlapping lines at each position
  const overlapCounts = new Map<string, number>();

  // Compare each path with every other path
  for (let i = 0; i < modifiedPaths.length; i++) {
    for (let j = i + 1; j < modifiedPaths.length; j++) {
      const path1 = modifiedPaths[i].points;
      const path2 = modifiedPaths[j].points;

      // Skip if both paths end at the same points (same pin connections)
      if (
        (path1[0] === path2[0] && path1[1] === path2[1]) ||
        (path1[path1.length - 2] === path2[path2.length - 2] &&
          path1[path1.length - 1] === path2[path2.length - 1])
      ) {
        continue;
      }

      // Check each line segment in path1 against each in path2
      for (let p1 = 0; p1 < path1.length - 2; p1 += 2) {
        for (let p2 = 0; p2 < path2.length - 2; p2 += 2) {
          const x1 = path1[p1];
          const y1 = path1[p1 + 1];
          const x2 = path1[p1 + 2];
          const y2 = path1[p1 + 3];

          const x3 = path2[p2];
          const y3 = path2[p2 + 1];
          const x4 = path2[p2 + 2];
          const y4 = path2[p2 + 3];

          // Calculate shift amount based on available space
          const getShiftAmount = (count: number, space: number) => {
            const baseShift = Math.min(
              Math.max(space / (count + 1), MIN_SHIFT),
              MAX_SHIFT
            );
            return baseShift * (count - 1);
          };

          // Check if points are overlapping
          if (x1 === x3 && y1 === y3) {
            const key = `${x1},${y1}`;
            const count = (overlapCounts.get(key) || 1) + 1;
            overlapCounts.set(key, count);
            // Calculate shift based on available space
            const shift = getShiftAmount(count, BOUNDARY_MARGIN);
            path1[p1] += shift;
            path1[p1 + 1] += shift;
          }

          // Check if lines are exactly vertical (x coordinates equal)
          if (x1 === x2 && x3 === x4 && x1 === x3) {
            // Vertical lines overlap
            const minY1 = Math.min(y1, y2);
            const maxY1 = Math.max(y1, y2);
            const minY2 = Math.min(y3, y4);
            const maxY2 = Math.max(y3, y4);

            if (!(maxY1 < minY2 || minY1 > maxY2)) {
              const key = `v${x1}`;
              const count = (overlapCounts.get(key) || 1) + 1;
              overlapCounts.set(key, count);

              // Find nearest boundary edge and determine if we should shift left or right
              let nearestBoundaryX = x1;
              let minDistance = Infinity;
              let shiftDirection = 1; // 1 for right, -1 for left
              let availableSpace = Infinity;

              for (const bound of bounds) {
                const [bx1, by1, bx2, by2] = bound;
                const distToLeft = Math.abs(x1 - (bx1 - BOUNDARY_MARGIN));
                const distToRight = Math.abs(x1 - (bx2 + BOUNDARY_MARGIN));

                if (distToLeft < minDistance) {
                  minDistance = distToLeft;
                  nearestBoundaryX = bx1 - BOUNDARY_MARGIN;
                  shiftDirection = -1; // Shift further left
                  availableSpace = distToLeft;
                }
                if (distToRight < minDistance) {
                  minDistance = distToRight;
                  nearestBoundaryX = bx2 + BOUNDARY_MARGIN;
                  shiftDirection = 1; // Shift further right
                  availableSpace = distToRight;
                }
              }

              // Calculate shift based on available space
              const shift =
                getShiftAmount(count, availableSpace) * shiftDirection;
              nearestBoundaryX += shift;

              // Shift path1 to nearest boundary while maintaining start/end x coordinates
              for (let k = p1; k <= p1 + 2; k += 2) {
                // Only shift intermediate points, preserve endpoints
                if (k > 0 && k < path1.length - 2) {
                  path1[k] = nearestBoundaryX;
                }
              }
            }
          }
          // Check if lines are exactly horizontal (y coordinates equal)
          else if (y1 === y2 && y3 === y4 && y1 === y3) {
            // Horizontal lines overlap
            const minX1 = Math.min(x1, x2);
            const maxX1 = Math.max(x1, x2);
            const minX2 = Math.min(x3, x4);
            const maxX2 = Math.max(x3, x4);

            if (!(maxX1 < minX2 || minX1 > maxX2)) {
              const key = `h${y1}`;
              const count = (overlapCounts.get(key) || 1) + 1;
              overlapCounts.set(key, count);

              // Find nearest boundary edge and determine if we should shift up or down
              let nearestBoundaryY = y1;
              let minDistance = Infinity;
              let shiftDirection = 1; // 1 for down, -1 for up
              let availableSpace = Infinity;

              for (const bound of bounds) {
                const [bx1, by1, bx2, by2] = bound;
                const distToTop = Math.abs(y1 - (by1 - BOUNDARY_MARGIN));
                const distToBottom = Math.abs(y1 - (by2 + BOUNDARY_MARGIN));

                if (distToTop < minDistance) {
                  minDistance = distToTop;
                  nearestBoundaryY = by1 - BOUNDARY_MARGIN;
                  shiftDirection = -1; // Shift further up
                  availableSpace = distToTop;
                }
                if (distToBottom < minDistance) {
                  minDistance = distToBottom;
                  nearestBoundaryY = by2 + BOUNDARY_MARGIN;
                  shiftDirection = 1; // Shift further down
                  availableSpace = distToBottom;
                }
              }

              // Calculate shift based on available space
              const shift =
                getShiftAmount(count, availableSpace) * shiftDirection;
              nearestBoundaryY += shift;

              // Shift path1 to nearest boundary while maintaining start/end y coordinates
              for (let k = p1 + 1; k <= p1 + 3; k += 2) {
                // Only shift intermediate points, preserve endpoints
                if (k > 1 && k < path1.length - 1) {
                  path1[k] = nearestBoundaryY;
                }
              }
            }
          }
        }
      }
    }
  }

  return modifiedPaths;
}

function matchComponents(
  components: { id: string }[],
  configComponents: { id: string }[]
): boolean {
  const componentArray: {}[] = [];
  components.forEach((component) => componentArray.push(component.id));

  // Check if arrays have equal lengths
  if (componentArray.length !== configComponents.length) {
    return false;
  }

  // Ensure each element in configComponents exists in componentArray
  return configComponents.every((item) => componentArray.includes(item));
}

export class ComponentLoader {
  public static colorIndex = 0;
  private static allPinWires: Wire[] = []; // Class variable to store all pin wires
  private static finalWiring: Wire[] = []; // Class variable to store final wiring

  static getDeviceBounds(components: DroppedComponent[]): number[][] {
    const bounds: number[][] = [];
    components.forEach((component: DroppedComponent) => {
      // Check if the component has an image property
      if (component.image) {
        const componentBounds = [
          component.x,
          component.y,
          component.x + component.image.width,
          component.y + component.image.height,
        ];
        bounds.push(componentBounds);
      } else {
        console.warn(
          `Component ${component.id} does not have an image property.`
        );
      }
    });
    return bounds;
  }

  static locatePins(component: any): Wire[] {
    const pinPoints: Wire[] = [];

    if (!component["pin-map"]?.src) return pinPoints;

    try {
      const pinMapData: PinMapData = component.pinMap;

      pinMapData["digital-pins"].id.forEach((pinId: string, index: number) => {
        const pinData = pinMapData["digital-pins"].reloc.find(
          (pin: { id: string; points: number[] }) => pin.id === pinId
        );

        if (pinData) {
          const x = pinData.points[0] + component.x;
          const y = pinData.points[1] + component.y;
          pinPoints.push({
            id: `${component.id}-${pinId}`,
            points: [x, y, x, y],
            color: "#00ff00",
          });
        }
      });
    } catch (error) {
      document.dispatchEvent(
        new CustomEvent("console-output", {
          detail: {
            type: "error",
            message: `Failed to generate pin wires: ${error}`,
          },
        })
      );
    }

    return pinPoints;
  }

  static getWireColor(wireType: string): string {
    let color: string;
    switch (wireType) {
      case "5V":
        color = wireColor.red;
        break;
      case "GND":
        color = wireColor.black;
        break;
      default:
        const availableColors = Object.entries(wireColor)
          .filter(([key]) => key !== "red" && key !== "black")
          .map(([_, value]) => value);
        color = availableColors[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % availableColors.length;
    }

    return `${color}`;
  }

  static getShortPathDir(
    pinLoc: number[],
    compSize: number[],
    compLoc: number[]
  ): number[] {
    const x_origin = compLoc[0];
    const x_limit = compSize[0] + x_origin;
    const x_pin = pinLoc[0];
    const y_origin = compLoc[1];
    const y_limit = compSize[1] + y_origin;
    const y_pin = pinLoc[1];

    let shortest_x = 0;
    let shortest_y = 0;

    // Pin is between bounds, find shorter distance to either edge
    const dist_to_left = Math.abs(x_pin - x_origin);
    const dist_to_right = Math.abs(x_limit - x_pin);
    shortest_x = dist_to_left <= dist_to_right ? -dist_to_left : dist_to_right;

    // Pin is between bounds, find shorter distance to either edge
    const dist_to_top = Math.abs(y_pin - y_origin);
    const dist_to_bottom = Math.abs(y_limit - y_pin);
    shortest_y = dist_to_top <= dist_to_bottom ? -dist_to_top : dist_to_bottom;

    const short_logic = Math.abs(shortest_x) <= Math.abs(shortest_y);
    const dirX = shortest_x / Math.abs(shortest_x);
    const dirY = shortest_y / Math.abs(shortest_y);
    shortest_x = short_logic ? shortest_x + 10 * dirX : 0;
    shortest_y = !short_logic ? shortest_y + 10 * dirY : 0;

    return [shortest_x, shortest_y];
  }

  static async createGroundSymbol(x: number, y: number): Promise<GroundSymbol> {
    const response = await fetch("/packages/Power/GND.json");
    const groundData = await response.json();

    const img = await preloadImage("/packages/Power/GND.png");

    return {
      id: `ground-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      name: "GND",
      rotation: 0,
      image: {
        src: "/packages/Power/GND.png",
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
      pinMap: groundData,
      type: "ground",
    };
  }

  static processDeviceConnections = (
    device: string,
    connection: any,
    components: any,
    key: string,
    wireRoute: number[],
    wireNameMap: { [key: string]: string }
  ) => {
    const pin = connection[device];

    // Find the component in the config
    const component = components.find(
      (comp: DroppedComponent) => comp.id === device
    );

    // Check if the component exists and has a pinMap
    if (!component || !component.pinMap) {
      console.error(`Component ${device} not found or missing pinMap.`);
      return; // Exit if the component is not found or pinMap is missing
    }

    const pinMap = component.pinMap["digital-pins"]["reloc"];
    const componentSize = [component.image.width, component.image.height];
    const matchingPin = pinMap.find((p: any) => p.id === pin);

    if (matchingPin) {
      wireNameMap[key] = pin;
      const x = matchingPin.points[0] + component.x;
      const y = matchingPin.points[1] + component.y;
      wireRoute.push(x);
      wireRoute.push(y);
      const shortPath = ComponentLoader.getShortPathDir([x, y], componentSize, [
        component.x,
        component.y,
      ]);

      if (wireRoute.length >= 4) {
        wireRoute.splice(
          wireRoute.length - 2,
          0,
          x + shortPath[0],
          y + shortPath[1]
        );
      } else {
        wireRoute.push(x + shortPath[0]);
        wireRoute.push(y + shortPath[1]);
      }
    }
  };

  static processWireConnections = async (
    config: any,
    components: any,
    compWiring: Wire[],
    setComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>
  ) => {
    // First pass: Process non-power wires
    for (const key of Object.keys(config.wire)) {
      const connection = config.wire[key];
      const powerPins = Object.values(connection).filter(
        (pin: unknown) =>
          typeof pin === "string" && (pin.includes("GND") || pin.includes("5V"))
      );
      const isPowerConnection = powerPins.length > 0;

      if (!isPowerConnection) {
        // Process normal connections as before
        const wireRoute: number[] = [];
        const wireNameMap: { [key: string]: string } = {};

        for (const device of Object.keys(connection)) {
          ComponentLoader.processDeviceConnections(
            device,
            connection,
            components,
            key,
            wireRoute,
            wireNameMap
          );
        }

        compWiring.push({
          id: `wire-${key}`,
          points: wireRoute,
          color: ComponentLoader.getWireColor(wireNameMap[key]),
        });
      }
    }

    // Second pass: Process power pins
    const processedPowerPins = new Map<string, Set<string>>();
    // Get device bounds for path finding
    const deviceBounds = ComponentLoader.getDeviceBounds(components);

    for (const key of Object.keys(config.wire)) {
      const connection = config.wire[key];

      for (const device of Object.keys(connection)) {
        const pinName = connection[device];

        if (pinName.includes("GND") || pinName.includes("5V")) {
          if (!processedPowerPins.has(device)) {
            processedPowerPins.set(device, new Set());
          }
          const devicePins = processedPowerPins.get(device)!;
          const baseName = pinName.includes("GND") ? "GND" : "5V";

          if (!devicePins.has(baseName)) {
            devicePins.add(baseName);
            const wireRoute: number[] = [];
            const wireNameMap: { [key: string]: string } = {};

            // Get component info
            const component = components.find(
              (comp: DroppedComponent) => comp.id === device
            );

            ComponentLoader.processDeviceConnections(
              device,
              { [device]: pinName },
              components,
              key,
              wireRoute,
              wireNameMap
            );

            if (wireRoute.length >= 2) {
              const lastX = wireRoute[wireRoute.length - 2];
              const lastY = wireRoute[wireRoute.length - 1];

              // Get path to edge of component
              const shortPath = ComponentLoader.getShortPathDir(
                [lastX, lastY],
                [component.image.width, component.image.height],
                [component.x, component.y]
              );

              // Add path to edge
              const edgeX = lastX + shortPath[0];
              const edgeY = lastY + shortPath[1];

              if (pinName.includes("GND")) {
                // Ground extends downward
                const targetY = edgeY + 30;
                const path = findPath(
                  [edgeX, edgeY],
                  [edgeX, targetY],
                  deviceBounds
                );
                if (path.length > 0) {
                  wireRoute.push(...path.flat());
                } else {
                  wireRoute.push(edgeX, edgeY, edgeX, targetY);
                }
              } else {
                // 5V extends to closest top corner
                const topEdge = component.y;
                const leftEdge = component.x;
                const rightEdge = component.x + component.image.width;

                // Determine closest top corner
                const distToLeftCorner = Math.abs(lastX - leftEdge);
                const distToRightCorner = Math.abs(lastX - rightEdge);
                const targetX =
                  distToLeftCorner < distToRightCorner
                    ? leftEdge - 10
                    : rightEdge + 10;
                const targetY = topEdge - 20;

                // Find path to target point
                const path = findPath(
                  [edgeX, edgeY],
                  [targetX, targetY],
                  deviceBounds
                );

                if (path.length > 0) {
                  wireRoute.push(...path.flat());
                } else {
                  // Fallback to L-shaped route if no path found
                  wireRoute.push(targetX, edgeY, targetX, targetY);
                }
              }

              compWiring.push({
                id: `wire-${key}-${device}`,
                points: wireRoute,
                color: ComponentLoader.getWireColor(baseName),
              });
            }
          }
        }
      }
    }
  };

  static async loadInitialComponents(
    setLoadedImages: React.Dispatch<
      React.SetStateAction<{ [key: string]: HTMLImageElement }>
    >,
    setComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>,
    setWires: React.Dispatch<React.SetStateAction<Wire[]>>
  ): Promise<any> {
    try {
      let response = await fetch("/configs/demo.json");
      const config = await response.json();

      response = await fetch("/configs/demo.editor.json");
      const components = await response.json();

      if (!matchComponents(components, config.components)) {
        console.log("new config loading...");

        response = await fetch("/packages/devBible.json");
        const dev_boards = await response.json();

        response = await fetch("/packages/sensorBible.json");
        const sensors = await response.json();

        const components_list = [
          ...dev_boards.components,
          ...sensors.components,
        ];
        console.log("components", components_list);
        console.log("components", config.components);

        const components = components_list.filter((component: any) =>
          config.components.includes(component.id)
        );
        console.log("Selected components:", components);

        backupComponentsToJson(components, "/configs/demo.editor.json"); // Specify the file name for backup
      }

      // Load images
      const imageLoadPromises = components.map(
        async (component: DroppedComponent) => {
          console.log(component.image.src);
          const img = await preloadImage(component.image.src);
          component.image.width = img.naturalWidth;
          component.image.height = img.naturalHeight;
          return { src: component.image.src, img };
        }
      );

      // Load pin mappings
      const pinWirePromises = components.map(async (component: any) => {
        if (component["pin-map"]?.src) {
          const pinMapResponse = await fetch(component["pin-map"].src);
          component.pinMap = await pinMapResponse.json();
          return ComponentLoader.locatePins(component);
        }
        return [];
      });

      // Wait for all promises to resolve
      const [pinWires, loadedImgs] = await Promise.all([
        Promise.all(pinWirePromises),
        Promise.all(imageLoadPromises),
      ]);

      // Update states
      setLoadedImages((prev) => {
        const newImages = { ...prev };
        loadedImgs.forEach(({ src, img }) => {
          newImages[src] = img;
        });
        return newImages;
      });

      setComponents(components);

      // Process wire configurations from config
      console.log("loading wireConnections");
      const compWiring: Wire[] = [];

      if (config.wire) {
        await ComponentLoader.processWireConnections(
          config,
          components,
          compWiring,
          setComponents
        );
        console.log("compWiring: ", compWiring);
      }

      // Store all pin wires in the class variable
      this.allPinWires = [...pinWires.flat(), ...compWiring];

      if (components) {
        const deviceBounds = ComponentLoader.getDeviceBounds(components);
        // console.log("deviceBounds: ", deviceBounds);

        // Process each wire to find valid paths around components
        compWiring.forEach((wire) => {
          const [startX, startY] = [wire.points[2], wire.points[3]];
          const [endX, endY] = [wire.points[4], wire.points[5]];
          const path = findPath([startX, startY], [endX, endY], deviceBounds);
          if (path.length > 0) {
            const wirePath = path.flat();
            wire.points.splice(wire.points.length - 4, 0, ...wirePath);
          }
          console.log(wire.points);
        });

        const newWiring = shiftOverlappingPaths(compWiring, deviceBounds);
        const finalWiring = shiftOverlappingPaths(newWiring, deviceBounds);

        // Store final wiring in the class variable
        this.finalWiring = finalWiring;
        const fullWiring = [...pinWires.flat(), ...finalWiring];

        // Set wires state
        // setWires(fullWiring);
      }

      return config; // Return the loaded config
    } catch (error) {
      console.error("Failed to load initial components:", error);
      throw error; // Rethrow the error for handling in the calling function
    }
  }

  // Method to access all pin wires
  static getAllPinWires(): Wire[] {
    return this.allPinWires;
  }

  // Method to access final wiring
  static getFinalWiring(): Wire[] {
    return this.finalWiring;
  }

  static async updateComponentPosition(
    componentId: string,
    x: number,
    y: number
  ) {
    try {
      // Get the current configuration file path
      const configFiles = ["/configs/demo.editor.json"];

      // Search through config files to find the component
      for (const configFile of configFiles) {
        console.log(`Checking file: ${configFile}`);

        try {
          const response = await fetch(configFile);
          if (!response.ok) {
            console.log(
              `Skipping ${configFile} - not found or not accessible (${response.status})`
            );
            continue;
          }

          const config = await response.json();
          console.log(`Loaded config from ${configFile}:`, config);

          // Find the component in the current config
          const componentIndex = config.findIndex(
            (c: any) => c.id === componentId
          );

          if (componentIndex !== -1) {
            console.log(
              `Found component ${componentId} in ${configFile} at index ${componentIndex}`
            );
            console.log("Original position:", {
              x: config[componentIndex].x,
              y: config[componentIndex].y,
            });

            // Update the component's position
            config[componentIndex].x = x;
            config[componentIndex].y = y;

            console.log("New position:", { x, y });

            // Save the updated config back to the file
            const saveResponse = await fetch(`/api/save-config`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                file: configFile,
                content: config,
              }),
            });

            const responseText = await saveResponse.text();
            console.log(`Save response for ${configFile}:`, {
              status: saveResponse.status,
              ok: saveResponse.ok,
              text: responseText,
            });

            if (!saveResponse.ok) {
              throw new Error(
                `Failed to save config: ${saveResponse.statusText}. Details: ${responseText}`
              );
            }

            try {
              const result = JSON.parse(responseText);
              console.log("Save response parsed:", result);
            } catch (e) {
              console.log(
                "Could not parse save response as JSON:",
                responseText
              );
            }

            break; // Exit loop once component is found and updated
          } else {
            console.log(`Component ${componentId} not found in ${configFile}`);
          }
        } catch (error) {
          console.error(`Error processing ${configFile}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating component position:", error);
      throw error;
    }
  }
}

// Function to back up components to a JSON file
async function backupComponentsToJson(
  components: any[],
  filePath: string
): Promise<void> {
  console.log(`Checking file: ${filePath}`);

  const response = await fetch(filePath);
  if (!response.ok) {
    console.log(
      `Skipping ${filePath} - not found or not accessible (${response.status})`
    );
  }

  const config = await response.json();
  console.log(`Loaded config from ${filePath}:`, config);

  // if (!(config.length === 0)) {
  //   return;
  // }

  // Save the updated config back to the file
  const saveResponse = await fetch(`/api/save-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: filePath,
      content: components,
    }),
  });

  const responseText = await saveResponse.text();
  console.log(`Save response for ${filePath}:`, {
    status: saveResponse.status,
    ok: saveResponse.ok,
    text: responseText,
  });

  if (!saveResponse.ok) {
    throw new Error(
      `Failed to save config: ${saveResponse.statusText}. Details: ${responseText}`
    );
  }

  try {
    const result = JSON.parse(responseText);
    console.log("Save response parsed:", result);
  } catch (e) {
    console.log("Could not parse save response as JSON:", responseText);
  }
}
