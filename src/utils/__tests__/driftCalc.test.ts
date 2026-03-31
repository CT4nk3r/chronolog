/**
 * driftCalc.test.ts
 *
 * 100% coverage target for src/utils/driftCalc.ts.
 *
 * Covers:
 *  - calcDriftPerDay: normal case, zero interval, negative interval
 *  - buildDriftEntries: single entry, multiple entries, out-of-order timestamps
 *  - latestDriftRate: < 2 entries, ≥ 2 entries
 *  - rollingSevenDayAverage: empty, no qualifying rates, qualifying rates
 *  - allTimeAverage: empty, single entry, multiple entries
 *  - recalculateEntries: equivalent to buildDriftEntries (verified through re-sort)
 *  - backdated insertion: inserting an earlier measurement keeps order correct
 *  - drift recalculation after an edit
 */

import {
  calcDriftPerDay,
  buildDriftEntries,
  latestDriftRate,
  rollingSevenDayAverage,
  allTimeAverage,
  recalculateEntries,
} from '../driftCalc';
import type {Measurement} from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function makeMeasurement(overrides: Partial<Measurement> & {timestamp: string; deviationSeconds: number}): Measurement {
  return {
    id: `m-${++idCounter}`,
    watchId: 'w1',
    referenceTimestamp: overrides.timestamp,
    note: '',
    ...overrides,
  };
}

// Reference epoch: 2024-01-01T00:00:00.000Z
const T0 = '2024-01-01T00:00:00.000Z';
// +24 h
const T24h = '2024-01-02T00:00:00.000Z';
// +48 h
const T48h = '2024-01-03T00:00:00.000Z';
// +12 h (between T0 and T24h — used for backdating tests)
const T12h = '2024-01-01T12:00:00.000Z';
// 8 days after T0 (outside the 7-day rolling window)
const T8d = '2024-01-09T00:00:00.000Z';

// ---------------------------------------------------------------------------
// calcDriftPerDay
// ---------------------------------------------------------------------------

describe('calcDriftPerDay', () => {
  it('calculates positive drift correctly (fast watch)', () => {
    const earlier = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    // intervalHours = 24, driftPerDay = (10 / 24) * 24 = 10
    expect(calcDriftPerDay(earlier, later)).toBeCloseTo(10, 5);
  });

  it('calculates negative drift correctly (slow watch)', () => {
    const earlier = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T24h, deviationSeconds: -5});
    expect(calcDriftPerDay(earlier, later)).toBeCloseTo(-5, 5);
  });

  it('scales correctly when interval is 12 hours', () => {
    // deviation 5 s over 12 h → 10 s/day
    const earlier = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T12h, deviationSeconds: 5});
    expect(calcDriftPerDay(earlier, later)).toBeCloseTo(10, 5);
  });

  it('scales correctly when interval is 48 hours', () => {
    // deviation 10 s over 48 h → 5 s/day
    const earlier = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T48h, deviationSeconds: 10});
    expect(calcDriftPerDay(earlier, later)).toBeCloseTo(5, 5);
  });

  it('returns 0 when interval is 0 (same timestamps)', () => {
    const m = makeMeasurement({timestamp: T0, deviationSeconds: 10});
    expect(calcDriftPerDay(m, m)).toBe(0);
  });

  it('returns 0 when later timestamp is before earlier (negative interval)', () => {
    const earlier = makeMeasurement({timestamp: T24h, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T0, deviationSeconds: 10});
    // intervalMs < 0 → treated as 0
    expect(calcDriftPerDay(earlier, later)).toBe(0);
  });

  it('handles fractional deviations', () => {
    const earlier = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const later = makeMeasurement({timestamp: T24h, deviationSeconds: -3.5});
    expect(calcDriftPerDay(earlier, later)).toBeCloseTo(-3.5, 5);
  });
});

// ---------------------------------------------------------------------------
// buildDriftEntries
// ---------------------------------------------------------------------------

describe('buildDriftEntries', () => {
  it('returns an empty array for no measurements', () => {
    expect(buildDriftEntries([])).toEqual([]);
  });

  it('first entry always has driftPerDay === null', () => {
    const entries = buildDriftEntries([
      makeMeasurement({timestamp: T0, deviationSeconds: 5}),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].driftPerDay).toBeNull();
  });

  it('second entry has a calculated drift rate', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    const entries = buildDriftEntries([m1, m2]);
    expect(entries).toHaveLength(2);
    expect(entries[0].driftPerDay).toBeNull();
    expect(entries[1].driftPerDay).toBeCloseTo(10, 5);
  });

  it('sorts measurements by timestamp ascending before computing drift', () => {
    // m2 is provided before m1 in the input array — must still sort correctly
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    const entries = buildDriftEntries([m2, m1]); // deliberately reversed
    expect(entries[0].measurement.timestamp).toBe(T0);
    expect(entries[1].measurement.timestamp).toBe(T24h);
    expect(entries[1].driftPerDay).toBeCloseTo(10, 5);
  });

  it('computes drift for three consecutive entries', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    const m3 = makeMeasurement({timestamp: T48h, deviationSeconds: 5});
    const entries = buildDriftEntries([m1, m2, m3]);
    expect(entries[2].driftPerDay).toBeCloseTo(5, 5);
  });

  it('does not mutate the original measurements array', () => {
    const m1 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    const m2 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const original = [m1, m2];
    buildDriftEntries(original);
    // original must still be [m1, m2] in the same order
    expect(original[0]).toBe(m1);
    expect(original[1]).toBe(m2);
  });
});

// ---------------------------------------------------------------------------
// latestDriftRate
// ---------------------------------------------------------------------------

describe('latestDriftRate', () => {
  it('returns null for an empty entries array', () => {
    expect(latestDriftRate([])).toBeNull();
  });

  it('returns null for a single-entry array (no rate computed)', () => {
    const entries = buildDriftEntries([
      makeMeasurement({timestamp: T0, deviationSeconds: 5}),
    ]);
    expect(latestDriftRate(entries)).toBeNull();
  });

  it('returns the drift rate of the last entry when there are multiple entries', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    const m3 = makeMeasurement({timestamp: T48h, deviationSeconds: 5});
    const entries = buildDriftEntries([m1, m2, m3]);
    // latest rate is the one for m3
    expect(latestDriftRate(entries)).toBeCloseTo(entries[2].driftPerDay as number, 5);
  });
});

// ---------------------------------------------------------------------------
// rollingSevenDayAverage
// ---------------------------------------------------------------------------

describe('rollingSevenDayAverage', () => {
  it('returns null for an empty entries array', () => {
    expect(rollingSevenDayAverage([])).toBeNull();
  });

  it('returns null for a single-entry array', () => {
    const entries = buildDriftEntries([
      makeMeasurement({timestamp: T0, deviationSeconds: 5}),
    ]);
    expect(rollingSevenDayAverage(entries)).toBeNull();
  });

  it('returns the average of entries within the last 7 days', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10}); // 10 s/day
    const m3 = makeMeasurement({timestamp: T48h, deviationSeconds: 5});  // 5 s/day
    const entries = buildDriftEntries([m1, m2, m3]);
    // Both m2 and m3 are within 7 days of T48h; average = (10 + 5) / 2 = 7.5
    expect(rollingSevenDayAverage(entries)).toBeCloseTo(7.5, 5);
  });

  it('excludes entries older than 7 days', () => {
    // m1 at T0 → m2 at T8d: m2 is 8 days after m1.
    // Relative to T8d, T0 is 8 days ago → outside window.
    // m2 is the last entry; it has a drift rate — but it IS within the window (it IS at the cutoff edge).
    // m1 is only the base, so only m2 has a rate. m2 is ≤ 0 ms before cutoff, so it qualifies.
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    // Add an intermediate entry 1 day in so m2 can have a rate relative to that
    const mMid = makeMeasurement({timestamp: T24h, deviationSeconds: 10}); // 10 s/day, well within window
    const m2 = makeMeasurement({timestamp: T8d, deviationSeconds: 2});     // rate vs mMid
    const entries = buildDriftEntries([m1, mMid, m2]);
    // Latest timestamp is T8d.
    // cutoff = T8d - 7 days = T0 + 1 day = T24h exactly.
    // mMid (T24h) >= cutoff → qualifies: drift rate = 10 s/day
    // m2 (T8d) >= cutoff → qualifies: drift from mMid to T8d
    const avg = rollingSevenDayAverage(entries);
    expect(avg).not.toBeNull();
    // m1 has no rate; mMid and m2 both qualify.
    const midRate = entries[1].driftPerDay as number; // 10 s/day
    const m2Rate = entries[2].driftPerDay as number;
    expect(avg).toBeCloseTo((midRate + m2Rate) / 2, 5);
  });

  it('returns null when no entries within the 7-day window have a rate', () => {
    // Only one measurement → no rates at all
    const entries = buildDriftEntries([
      makeMeasurement({timestamp: T8d, deviationSeconds: 5}),
    ]);
    expect(rollingSevenDayAverage(entries)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// allTimeAverage
// ---------------------------------------------------------------------------

describe('allTimeAverage', () => {
  it('returns null for an empty entries array', () => {
    expect(allTimeAverage([])).toBeNull();
  });

  it('returns null for a single-entry array (no rate)', () => {
    const entries = buildDriftEntries([
      makeMeasurement({timestamp: T0, deviationSeconds: 5}),
    ]);
    expect(allTimeAverage(entries)).toBeNull();
  });

  it('returns the average of all rated entries', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10}); // 10 s/day
    const m3 = makeMeasurement({timestamp: T48h, deviationSeconds: 5});  // 5 s/day
    const entries = buildDriftEntries([m1, m2, m3]);
    expect(allTimeAverage(entries)).toBeCloseTo(7.5, 5);
  });

  it('handles a single pair correctly', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: -4}); // -4 s/day
    const entries = buildDriftEntries([m1, m2]);
    expect(allTimeAverage(entries)).toBeCloseTo(-4, 5);
  });
});

// ---------------------------------------------------------------------------
// recalculateEntries
// ---------------------------------------------------------------------------

describe('recalculateEntries', () => {
  it('is equivalent to buildDriftEntries', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10});
    expect(recalculateEntries([m1, m2])).toEqual(buildDriftEntries([m1, m2]));
  });
});

// ---------------------------------------------------------------------------
// Backdated entry insertion
// ---------------------------------------------------------------------------

describe('backdated entry insertion', () => {
  it('correctly inserts a backdated measurement and recalculates all rates', () => {
    // Original sequence: m1 (T0, 0s) → m2 (T48h, 10s)
    // Backdated insertion: mBack (T24h, 6s) — inserted between m1 and m2
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T48h, deviationSeconds: 10});
    const mBack = makeMeasurement({timestamp: T12h, deviationSeconds: 3});

    // Simulate what the store does: add the measurement, re-sort, recalculate
    const all = [m1, m2, mBack]; // mBack added last
    const entries = recalculateEntries(all);

    // After sort: m1 (T0) → mBack (T12h) → m2 (T48h)
    expect(entries[0].measurement.timestamp).toBe(T0);
    expect(entries[1].measurement.timestamp).toBe(T12h);
    expect(entries[2].measurement.timestamp).toBe(T48h);

    expect(entries[0].driftPerDay).toBeNull();

    // mBack: 3 s deviation over 12 h → 6 s/day
    expect(entries[1].driftPerDay).toBeCloseTo(6, 5);

    // m2: 10 s deviation over 36 h → (10/36)*24 ≈ 6.667 s/day
    expect(entries[2].driftPerDay).toBeCloseTo((10 / 36) * 24, 3);
  });
});

// ---------------------------------------------------------------------------
// Drift recalculation after an edit
// ---------------------------------------------------------------------------

describe('drift recalculation after an edit', () => {
  it('updates affected drift rates when a deviation is changed', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    const m2 = makeMeasurement({timestamp: T24h, deviationSeconds: 10}); // original 10 s/day
    const m3 = makeMeasurement({timestamp: T48h, deviationSeconds: 10});

    // Simulate editing m2's deviation from 10 to 5
    const m2Edited: Measurement = {...m2, deviationSeconds: 5};

    const entries = recalculateEntries([m1, m2Edited, m3]);

    // m2 now has deviation 5 over 24 h → 5 s/day
    expect(entries[1].driftPerDay).toBeCloseTo(5, 5);

    // m3: deviation 10 s relative to m2Edited's 5 s? No — drift formula uses
    // the raw deviationSeconds of the LATER entry and the interval:
    // m3.deviationSeconds = 10, interval = 24 h → still 10 s/day
    expect(entries[2].driftPerDay).toBeCloseTo(10, 5);
  });

  it('updates correctly when a timestamp is edited (backdating)', () => {
    const m1 = makeMeasurement({timestamp: T0, deviationSeconds: 0});
    // m2 was originally at T48h
    const m2 = makeMeasurement({timestamp: T48h, deviationSeconds: 10}); // 5 s/day

    // Edit m2 to be at T24h instead
    const m2Edited: Measurement = {...m2, timestamp: T24h};

    const entries = recalculateEntries([m1, m2Edited]);

    // m2 now at T24h: 10 s over 24 h → 10 s/day
    expect(entries[1].driftPerDay).toBeCloseTo(10, 5);
  });
});
