/**
 * driftCalc.ts
 *
 * Pure-function drift-rate maths for ChronoLog.
 * No imports except local types — no side effects.
 *
 * Terminology
 * -----------
 * deviationSeconds   – how many seconds the watch is ahead (+) or behind (–) of
 *                      true time as measured at `timestamp`.
 * intervalMs         – wall-clock milliseconds between two consecutive readings.
 * driftPerDay        – signed seconds per day: positive = running fast.
 */

import type {Measurement, DriftEntry} from '../types';

/**
 * Given two consecutive measurements (earlier → later) calculate the drift
 * rate in seconds per day.
 *
 * Formula:
 *   intervalHours = intervalMs / 3_600_000
 *   driftPerDay   = (later.deviationSeconds / intervalHours) * 24
 */
export function calcDriftPerDay(earlier: Measurement, later: Measurement): number {
  const intervalMs =
    Date.parse(later.timestamp) - Date.parse(earlier.timestamp);
  if (intervalMs <= 0) {
    return 0;
  }
  const intervalHours = intervalMs / 3_600_000;
  return (later.deviationSeconds / intervalHours) * 24;
}

/**
 * Build a sorted array of DriftEntry objects for all measurements belonging to
 * a single watch.  Measurements are sorted chronologically (ascending) before
 * processing so that back-dated or re-ordered entries are always handled
 * correctly.
 *
 * The first entry always has driftPerDay === null (no preceding reading).
 */
export function buildDriftEntries(measurements: Measurement[]): DriftEntry[] {
  const sorted = [...measurements].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );

  return sorted.map((m, i) => ({
    measurement: m,
    driftPerDay: i === 0 ? null : calcDriftPerDay(sorted[i - 1], m),
  }));
}

/**
 * Latest drift rate (the last entry that has a calculated rate).
 * Returns null if there are fewer than 2 entries.
 */
export function latestDriftRate(entries: DriftEntry[]): number | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].driftPerDay !== null) {
      return entries[i].driftPerDay as number;
    }
  }
  return null;
}

/**
 * Rolling 7-day average drift rate.
 *
 * Considers only entries whose timestamp falls within the last 7 days relative
 * to the most recent measurement timestamp.  Returns null if no qualifying
 * entry has a calculated rate.
 */
export function rollingSevenDayAverage(entries: DriftEntry[]): number | null {
  if (entries.length === 0) {
    return null;
  }

  const latest = Date.parse(
    entries[entries.length - 1].measurement.timestamp,
  );
  const sevenDaysMs = 7 * 24 * 3_600_000;
  const cutoff = latest - sevenDaysMs;

  const qualifying = entries.filter(
    e =>
      e.driftPerDay !== null &&
      Date.parse(e.measurement.timestamp) >= cutoff,
  );

  if (qualifying.length === 0) {
    return null;
  }

  const sum = qualifying.reduce(
    (acc, e) => acc + (e.driftPerDay as number),
    0,
  );
  return sum / qualifying.length;
}

/**
 * All-time average drift rate across all entries that have a rate.
 * Returns null if there are fewer than 2 entries.
 */
export function allTimeAverage(entries: DriftEntry[]): number | null {
  const rated = entries.filter(e => e.driftPerDay !== null);
  if (rated.length === 0) {
    return null;
  }
  const sum = rated.reduce((acc, e) => acc + (e.driftPerDay as number), 0);
  return sum / rated.length;
}

/**
 * Re-sort a list of measurements by timestamp ascending and recalculate all
 * drift entries.  This is the single mutation helper that should be called
 * after any create / edit / delete operation to keep the store consistent.
 */
export function recalculateEntries(measurements: Measurement[]): DriftEntry[] {
  return buildDriftEntries(measurements);
}
