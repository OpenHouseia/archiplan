export interface Room {
  id: string;
  name: string;
  points: [number, number][]; // 2D points for the floor polygon
  height: number;
  area: number;
  volume: number;
}

export interface FloorPlan3D {
  rooms: Room[];
  walls: {
    start: [number, number];
    end: [number, number];
    height: number;
    thickness: number;
  }[];
}

export interface CalculationResult {
  hvac: {
    btuRequired: number;
    recommendation: string;
  };
  thermal: {
    insulationAdvice: string;
    comfortScore: number;
  };
  acoustic: {
    reverberationTime: number;
    acousticAdvice: string;
  };
}
