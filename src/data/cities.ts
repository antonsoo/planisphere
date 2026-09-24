export interface City {
  id: string;
  name: string;
  /** Latitude in degrees, north positive. */
  lat: number;
  /** Longitude in degrees, east positive (shown for reference; the planisphere geometry only depends on latitude -- see docs/geometry.md). */
  lon: number;
  /** A representative historical epoch year for this site, astronomical year numbering. */
  suggestedEpoch: number;
  note: string;
}

export const CITIES: City[] = [
  {
    id: 'babylon',
    name: 'Babylon',
    lat: 32.54,
    lon: 44.42,
    suggestedEpoch: -700,
    note: 'Neo-Babylonian astronomers, MUL.APIN era',
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    lat: 31.2,
    lon: 29.92,
    suggestedEpoch: 150,
    note: "Ptolemy's Almagest",
  },
  {
    id: 'athens',
    name: 'Athens',
    lat: 37.98,
    lon: 23.73,
    suggestedEpoch: -350,
    note: 'Aristotle, Eudoxus',
  },
  {
    id: 'rome',
    name: 'Rome',
    lat: 41.9,
    lon: 12.5,
    suggestedEpoch: 1,
    note: 'Julian calendar reform',
  },
  {
    id: 'chichen-itza',
    name: 'Chichén Itzá',
    lat: 20.68,
    lon: -88.57,
    suggestedEpoch: 900,
    note: 'Terminal Classic Maya',
  },
  {
    id: 'tikal',
    name: 'Tikal',
    lat: 17.22,
    lon: -89.62,
    suggestedEpoch: 700,
    note: 'Classic Maya',
  },
  {
    id: 'changan',
    name: "Chang'an",
    lat: 34.27,
    lon: 108.94,
    suggestedEpoch: 700,
    note: 'Tang-dynasty imperial astronomy',
  },
  {
    id: 'ujjain',
    name: 'Ujjain',
    lat: 23.18,
    lon: 75.78,
    suggestedEpoch: 500,
    note: 'Āryabhaṭa, Indian prime meridian',
  },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13, suggestedEpoch: 2026, note: 'today' },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    lat: 37.77,
    lon: -122.42,
    suggestedEpoch: 2026,
    note: 'today',
  },
];

export const DEFAULT_CITY_ID = 'babylon';
