export interface ConstellationData {
  abbr: string;
  name: string;
  lines: number[][];
}

export interface PlanisphereConfig {
  latDeg: number;
  epochYear: number;
  magLimit: number;
  showConstellations: boolean;
  showNames: boolean;
  /** Gregorian date at 00:00 UTC; calibrates the printed annual scale. */
  date: Date;
  localHour: number;
}
