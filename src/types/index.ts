export interface Watch {
  id: string;
  name: string;
  movementType: string;
  targetAccuracySeconds: number; // e.g. 10 means ±10 s/day
}

export interface Measurement {
  id: string;
  watchId: string;
  timestamp: string; // ISO 8601
  deviationSeconds: number; // signed: positive = fast, negative = slow
  referenceTimestamp: string; // ISO 8601 — defaults to previous entry's timestamp
  note: string;
}

export interface DriftEntry {
  measurement: Measurement;
  driftPerDay: number | null; // null when there is no previous entry to compare to
}

export interface AppStore {
  watches: Watch[];
  measurements: Measurement[];
}
