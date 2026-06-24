/**
 * Property-based test for sanitizeInput idempotence.
 *
 * **Validates: Requirements 6.6**
 *
 * Property 4: For any input value (string, number, boolean, null, array,
 * or nested object), sanitizeInput(sanitizeInput(x)) SHALL be deeply equal
 * to sanitizeInput(x).
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { sanitizeInput } from '../../src/utils/validation';

// --- Generators ---

/**
 * Generates arbitrary JSON-like values that sanitizeInput handles:
 * strings, numbers, booleans, null, arrays, and nested objects.
 * We use fc.letrec to build recursive structures safely.
 */
const jsonValueArb: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  tree: fc.oneof(
    { depthSize: 'small' },
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true }),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined),
    fc.array(tie('tree'), { maxLength: 5 }),
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('__proto__')),
      tie('tree'),
      { maxKeys: 5 }
    ),
  ),
})).tree;

// --- Property 4: sanitizeInput idempotence ---

describe('Property 4: sanitizeInput idempotence', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 6.6**
   *
   * sanitizeInput(sanitizeInput(x)) === sanitizeInput(x) for all inputs.
   */
  it('sanitizeInput applied twice equals sanitizeInput applied once', () => {
    fc.assert(
      fc.property(jsonValueArb, (input) => {
        const once = sanitizeInput(input);
        const twice = sanitizeInput(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * Additional property: sanitizeInput preserves the type of the input.
   * Strings stay strings, numbers stay numbers, etc.
   */
  it('sanitizeInput preserves the type of primitive values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.double({ noNaN: true }),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
        ),
        (input) => {
          const result = sanitizeInput(input);
          if (input === null || input === undefined) {
            expect(result).toBe(input);
          } else {
            expect(typeof result).toBe(typeof input);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * For string inputs specifically, sanitizeInput should trim whitespace.
   * After one application, the result should have no leading/trailing whitespace.
   */
  it('sanitizeInput trims all string values', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input);
        expect(result).toBe(input.trim());
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
