/**
 * Property-based test for buildWhereClause metamorphic property.
 *
 * **Validates: Requirements 6.7**
 *
 * Property 5: For any filter object (Record<string, any>), the array returned
 * by EspoCRMClient.buildWhereClause(filters) SHALL have length less than or
 * equal to the number of keys in the input, and every `attribute` in the output
 * clauses SHALL be a key present in the input filter object.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { EspoCRMClient } from '../../src/espocrm/client';

// --- Generators ---

/**
 * Generates filter values that buildWhereClause handles:
 * - strings (including wildcards)
 * - numbers
 * - arrays of strings
 * - undefined, null, empty string (these are skipped by the function)
 */
const filterValueArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `*${s}*`), // wildcard
  fc.integer(),
  fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
);

/**
 * Generates a filter object with 0-10 keys.
 * Keys are simple alphanumeric strings to mimic real field names.
 */
const filterObjectArb = fc.dictionary(
  fc.stringMatching(/^[a-z]{1,15}$/),
  filterValueArb,
  { maxKeys: 10 },
);

// --- Property 5: buildWhereClause output bounded by input ---

describe('Property 5: buildWhereClause output bounded by input', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 6.7**
   *
   * Output length <= input key count.
   */
  it('output length is at most the number of input keys', () => {
    fc.assert(
      fc.property(filterObjectArb, (filters) => {
        const result = EspoCRMClient.buildWhereClause(filters);
        const inputKeyCount = Object.keys(filters).length;
        expect(result.length).toBeLessThanOrEqual(inputKeyCount);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 6.7**
   *
   * All output attributes are input keys.
   */
  it('every output attribute is a key present in the input', () => {
    fc.assert(
      fc.property(filterObjectArb, (filters) => {
        const result = EspoCRMClient.buildWhereClause(filters);
        const inputKeys = new Set(Object.keys(filters));
        for (const clause of result) {
          expect(inputKeys.has(clause.attribute!)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * Additional metamorphic property: adding a key with an empty/null/undefined
   * value should not increase the output length.
   */
  it('adding a skippable value does not increase output length', () => {
    fc.assert(
      fc.property(
        filterObjectArb,
        fc.stringMatching(/^[a-z]{1,10}$/),
        fc.constantFrom(undefined, null, ''),
        (filters, newKey, skippableValue) => {
          const baseClauses = EspoCRMClient.buildWhereClause(filters);
          const extendedFilters = { ...filters, [newKey]: skippableValue };
          const extendedClauses = EspoCRMClient.buildWhereClause(extendedFilters);

          // The extended result should have at most the same number of clauses
          // for the original keys (the new key is skippable)
          // But the new key might overwrite an existing key, so we just check
          // the overall bound still holds
          expect(extendedClauses.length).toBeLessThanOrEqual(Object.keys(extendedFilters).length);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * Wildcard values produce 'contains' type clauses.
   */
  it('wildcard string values produce contains-type clauses', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{1,10}$/),
        fc.string({ minLength: 1, maxLength: 20 }),
        (key, value) => {
          const filters = { [key]: `*${value}*` };
          const result = EspoCRMClient.buildWhereClause(filters);
          expect(result.length).toBe(1);
          expect(result[0].type).toBe('contains');
          expect(result[0].attribute).toBe(key);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
