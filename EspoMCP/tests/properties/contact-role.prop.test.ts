/**
 * Property-based test for formatContactDetails custom field inclusion.
 *
 * **Validates: Requirements 3.4**
 *
 * Property 3: For any Contact object with extra (custom) fields,
 * the output of formatContactDetails SHALL contain those fields
 * via the generic formatExtraFields pass-through.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { formatContactDetails } from '../../src/utils/formatting';
import type { Contact } from '../../src/espocrm/types';

// --- Generators ---

/** Generates a non-empty string for a custom field value */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

/** Generates a valid Contact with required fields and a custom field (cRole) */
const contactWithCustomFieldArb: fc.Arbitrary<Contact> = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  cRole: nonEmptyStringArb,
  emailAddress: fc.option(fc.emailAddress(), { nil: undefined }),
  phoneNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  accountName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  department: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

/** Generates a Contact without any custom fields */
const contactWithoutCustomFieldArb: fc.Arbitrary<Contact> = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  emailAddress: fc.option(fc.emailAddress(), { nil: undefined }),
  phoneNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

// --- Property 3: formatContactDetails includes custom fields ---

describe('Property 3: formatContactDetails custom field inclusion', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 3.4**
   *
   * For any Contact with a custom field (cRole), the output contains
   * the field value via the generic extra fields formatter.
   */
  it('output contains custom field label when present', () => {
    fc.assert(
      fc.property(contactWithCustomFieldArb, (contact) => {
        const result = formatContactDetails(contact);
        // The formatExtraFields helper renders cRole with label "C Role"
        expect(result).toContain('C Role:');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * When no custom fields are present, the output should not contain
   * any extra field labels beyond the known standard fields.
   */
  it('output does not contain extra fields when none are present', () => {
    fc.assert(
      fc.property(contactWithoutCustomFieldArb, (contact) => {
        const result = formatContactDetails(contact);
        expect(result).not.toContain('C Role:');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * The output always starts with "Contact Details:" header.
   */
  it('output always starts with "Contact Details:" header', () => {
    fc.assert(
      fc.property(contactWithCustomFieldArb, (contact) => {
        const result = formatContactDetails(contact);
        expect(result).toMatch(/^Contact Details:/);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * The output always contains the contact's full name.
   */
  it('output always contains the contact name', () => {
    fc.assert(
      fc.property(contactWithCustomFieldArb, (contact) => {
        const result = formatContactDetails(contact);
        expect(result).toContain(`Name: ${contact.firstName} ${contact.lastName}`);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
