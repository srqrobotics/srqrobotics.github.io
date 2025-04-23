import type { Wire } from '~/types/circuit';

export function handleWireDrawing(
  isDrawingWire: boolean,
  currentWire: number[],
  wireColor: string,
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>,
  setIsDrawingWire: React.Dispatch<React.SetStateAction<boolean>>,
  setCurrentWire: React.Dispatch<React.SetStateAction<number[]>>,
  getPointerPosition: () => { x: number; y: number }
) {
  const startDrawing = (_e?: any) => {
    if (!isDrawingWire) {
      setIsDrawingWire(true);
      const pos = getPointerPosition();
      setCurrentWire([pos.x, pos.y]);
    }
  };

  const continueDrawing = () => {
    if (!isDrawingWire) return;
    const pos = getPointerPosition();
    setCurrentWire((prev) => [...prev.slice(0, -2), pos.x, pos.y]);
  };

  const finishDrawing = () => {
    if (isDrawingWire) {
      setWires((prev) => [
        ...prev,
        {
          id: `wire-${Date.now()}`,
          points: currentWire,
          color: wireColor,
        },
      ]);
      setIsDrawingWire(false);
      setCurrentWire([]);
    }
  };

  return {
    startDrawing,
    continueDrawing,
    finishDrawing,
  };
} 