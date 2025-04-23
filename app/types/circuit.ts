export interface Wire {
  id: string;
  points: number[];
  color: string;
}

export interface DroppedComponent {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  image: {
    src: string;
    width: number;
    height: number;
  };
} 