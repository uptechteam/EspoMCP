/**
 * Property-based tests for datetime normalization and validation.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 10.1**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { FlexibleDateTimeSchema, normalizeDateTime } from '../../src/utils/validation';

// --- Generators ---

/** Generates a valid date component: YYYY-MM-DD with realistic ranges */
const datePartArb = fc.tuple(
  fc.integer({ min: 1970, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }) // 28 to avoid invalid day-of-month edge cases
).map(([y, m, d]) =>
  `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

/** Generates a valid time component: HH:mm:ss */
const timePartArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m, s]) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
);

/** Generates a valid datetime in ISO format (T separator) */
const isoDateTimeArb = fc.tuple(datePartArb, timePartArb).map(([d, t]) => `${d}T${t}`);

/** Generates a valid datetime in space-separated format */
const spaceDateTimeArb = fc.tuple(datePartArb, timePartArb).map(([d, t]) => `${d} ${t}`);

/** Generates a valid datetime in either format */
const validDateTimeArb = fc.oneof(isoDateTimeArb, spaceDateTimeArb);

// --- Property 1: Datetime normalization round-trip ---

describe('Property 1: Datetime normalization round-trip', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 10.1**
   *
   * For any valid datetime string in either ISO format or space-separated format,
   * calling normalizeDateTime SHALL produce a space-separated string that, when
   * parsed as a Date, represents the same point in time as the original input.
   */
  it('normalizeDateTime produces space-separated output that parses to the same time as the original', () => {
    fc.assert(
      fc.property(validDateTimeArb, (dt) => {
        const normalized = normalizeDateTime(dt);

        // Output must be space-separated (no T)
        expect(normalized).not.toContain('T');
        expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

        // Round-trip: both parse to the same Date
        const originalDate = new Date(dt.replace(' ', 'T'));
        const normalizedDate = new Date(normalized.replace(' ', 'T'));
        expect(normalizedDate.getTime()).toBe(originalDate.getTime());
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('normalizeDateTime is idempotent: normalizing twice equals normalizing once', () => {
    fc.assert(
      fc.property(validDateTimeArb, (dt) => {
        const once = normalizeDateTime(dt);
        const twice = normalizeDateTime(once);
        expect(twice).toBe(once);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('FlexibleDateTimeSchema accepts all valid datetime strings in both formats', () => {
    fc.assert(
      fc.property(validDateTimeArb, (dt) => {
        const result = FlexibleDateTimeSchema.safeParse(dt);
        expect(result.success).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('normalized output is always accepted by FlexibleDateTimeSchema', () => {
    fc.assert(
      fc.property(validDateTimeArb, (dt) => {
        const normalized = normalizeDateTime(dt);
        const result = FlexibleDateTimeSchema.safeParse(normalized);
        expect(result.success).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

// --- Property 2: Invalid datetime rejection ---

describe('Property 2: Invalid datetime rejection', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 2.4**
   *
   * For any string that does not match the pattern YYYY-MM-DD[T ]HH:mm:ss,
   * the FlexibleDateTimeSchema SHALL reject the input with a validation error.
   */

  /** Generates strings that definitely don't match the datetime pattern */
  const invalidDateTimeArb = fc.oneof(
    // Random strings
    fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(s)),
    // Wrong separators (not T or space)
    fc.tuple(datePartArb, timePartArb, fc.stringMatching(/^[^\sT]$/).filter((c) => c !== 'T' && c !== ' '))
      .map(([d, t, sep]) => `${d}${sep}${t}`),
    // Missing time component
    datePartArb,
    // Missing date component
    timePartArb,
    // Extra characters appended
    fc.tuple(datePartArb, timePartArb).map(([d, t]) => `${d}T${t}Z`),
    // Extra characters prepended
    fc.tuple(datePartArb, timePartArb).map(([d, t]) => ` ${d}T${t}`),
    // Empty string
    fc.constant(''),
    // Numbers only
    fc.stringMatching(/^\d{1,20}$/)
      .filter((s) => !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(s)),
    // ISO with timezone offset
    fc.tuple(datePartArb, timePartArb).map(([d, t]) => `${d}T${t}+00:00`),
    // ISO with milliseconds
    fc.tuple(datePartArb, timePartArb).map(([d, t]) => `${d}T${t}.000`),
  );

  it('FlexibleDateTimeSchema rejects all strings not matching YYYY-MM-DD[T ]HH:mm:ss', () => {
    fc.assert(
      fc.property(invalidDateTimeArb, (dt) => {
        const result = FlexibleDateTimeSchema.safeParse(dt);
        expect(result.success).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('FlexibleDateTimeSchema rejects non-string types', () => {
    const nonStringArb = fc.oneof(
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything()),
      fc.dictionary(fc.string(), fc.anything()),
    );

    fc.assert(
      fc.property(nonStringArb, (value) => {
        const result = FlexibleDateTimeSchema.safeParse(value);
        expect(result.success).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
