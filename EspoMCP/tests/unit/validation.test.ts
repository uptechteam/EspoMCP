/**
 * Unit tests for validation schemas and utility functions.
 *
 * **Validates: Requirement 6.4**
 *
 * Tests FlexibleDateTimeSchema, NameSchema, EmailSchema, PhoneSchema,
 * IdSchema, DateSchema, UrlSchema, normalizeDateTime, sanitizeInput,
 * validateEntityId, validateDateRange, validateAmount, validateProbability.
 */

import { describe, it, expect } from '@jest/globals';
import {
  FlexibleDateTimeSchema,
  NameSchema,
  EmailSchema,
  PhoneSchema,
  IdSchema,
  DateSchema,
  UrlSchema,
  normalizeDateTime,
  sanitizeInput,
  validateEntityId,
  validateDateRange,
  validateAmount,
  validateProbability,
  normalizeTaskDates,
} from '../../src/utils/validation';

describe('FlexibleDateTimeSchema', () => {
  it('accepts ISO format YYYY-MM-DDTHH:mm:ss', () => {
    expect(FlexibleDateTimeSchema.safeParse('2024-01-15T10:30:00').success).toBe(true);
  });

  it('accepts space-separated format YYYY-MM-DD HH:mm:ss', () => {
    expect(FlexibleDateTimeSchema.safeParse('2024-01-15 10:30:00').success).toBe(true);
  });

  it('rejects datetime with timezone suffix', () => {
    expect(FlexibleDateTimeSchema.safeParse('2024-01-15T10:30:00Z').success).toBe(false);
  });

  it('rejects datetime with milliseconds', () => {
    expect(FlexibleDateTimeSchema.safeParse('2024-01-15T10:30:00.000').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(FlexibleDateTimeSchema.safeParse('').success).toBe(false);
  });

  it('rejects date-only string', () => {
    expect(FlexibleDateTimeSchema.safeParse('2024-01-15').success).toBe(false);
  });
});

describe('NameSchema', () => {
  it('accepts simple names', () => {
    expect(NameSchema.safeParse('John').success).toBe(true);
  });

  it('accepts names with spaces', () => {
    expect(NameSchema.safeParse('John Doe').success).toBe(true);
  });

  it('accepts names with hyphens and apostrophes', () => {
    expect(NameSchema.safeParse("O'Brien-Smith").success).toBe(true);
  });

  it('accepts names with dots', () => {
    expect(NameSchema.safeParse('Dr. Smith').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(NameSchema.safeParse('').success).toBe(false);
  });

  it('rejects names with numbers', () => {
    expect(NameSchema.safeParse('John123').success).toBe(false);
  });

  it('rejects names exceeding 100 characters', () => {
    expect(NameSchema.safeParse('A'.repeat(101)).success).toBe(false);
  });
});

describe('EmailSchema', () => {
  it('accepts valid email', () => {
    expect(EmailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(EmailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(EmailSchema.safeParse('').success).toBe(false);
  });
});

describe('PhoneSchema', () => {
  it('accepts valid phone number', () => {
    expect(PhoneSchema.safeParse('+12025551234').success).toBe(true);
  });

  it('accepts phone without plus prefix', () => {
    expect(PhoneSchema.safeParse('12025551234').success).toBe(true);
  });

  it('rejects phone with letters', () => {
    expect(PhoneSchema.safeParse('123-abc-4567').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(PhoneSchema.safeParse('').success).toBe(false);
  });
});

describe('IdSchema', () => {
  it('accepts non-empty string', () => {
    expect(IdSchema.safeParse('abc123').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(IdSchema.safeParse('').success).toBe(false);
  });
});

describe('DateSchema', () => {
  it('accepts YYYY-MM-DD format', () => {
    expect(DateSchema.safeParse('2024-01-15').success).toBe(true);
  });

  it('rejects datetime format', () => {
    expect(DateSchema.safeParse('2024-01-15T10:30:00').success).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(DateSchema.safeParse('01/15/2024').success).toBe(false);
  });
});

describe('UrlSchema', () => {
  it('accepts valid URL', () => {
    expect(UrlSchema.safeParse('https://example.com').success).toBe(true);
  });

  it('rejects non-URL string', () => {
    expect(UrlSchema.safeParse('not-a-url').success).toBe(false);
  });
});

describe('normalizeDateTime', () => {
  it('converts T separator to space', () => {
    expect(normalizeDateTime('2024-01-15T10:30:00')).toBe('2024-01-15 10:30:00');
  });

  it('leaves space-separated format unchanged', () => {
    expect(normalizeDateTime('2024-01-15 10:30:00')).toBe('2024-01-15 10:30:00');
  });

  it('is idempotent', () => {
    const input = '2024-01-15T10:30:00';
    expect(normalizeDateTime(normalizeDateTime(input))).toBe(normalizeDateTime(input));
  });
});

describe('sanitizeInput', () => {
  it('trims whitespace from strings', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('recursively sanitizes arrays', () => {
    expect(sanitizeInput(['  a  ', '  b  '])).toEqual(['a', 'b']);
  });

  it('recursively sanitizes objects', () => {
    expect(sanitizeInput({ name: '  John  ', age: 30 })).toEqual({ name: 'John', age: 30 });
  });

  it('passes through numbers unchanged', () => {
    expect(sanitizeInput(42)).toBe(42);
  });

  it('passes through booleans unchanged', () => {
    expect(sanitizeInput(true)).toBe(true);
  });

  it('passes through null unchanged', () => {
    expect(sanitizeInput(null)).toBe(null);
  });

  it('passes through undefined unchanged', () => {
    expect(sanitizeInput(undefined)).toBe(undefined);
  });

  it('handles nested objects and arrays', () => {
    const input = { items: [{ name: '  test  ' }] };
    expect(sanitizeInput(input)).toEqual({ items: [{ name: 'test' }] });
  });
});

describe('validateEntityId', () => {
  it('accepts valid alphanumeric ID', () => {
    expect(() => validateEntityId('abc123', 'Contact')).not.toThrow();
  });

  it('throws on empty string', () => {
    expect(() => validateEntityId('', 'Contact')).toThrow('ID cannot be empty');
  });

  it('throws on ID with special characters', () => {
    expect(() => validateEntityId('abc-123', 'Contact')).toThrow('invalid characters');
  });

  it('throws on ID exceeding 50 characters', () => {
    expect(() => validateEntityId('a'.repeat(51), 'Contact')).toThrow('ID too long');
  });
});

describe('validateDateRange', () => {
  it('does not throw for valid range', () => {
    expect(() => validateDateRange('2024-01-01', '2024-12-31')).not.toThrow();
  });

  it('throws when start is after end', () => {
    expect(() => validateDateRange('2024-12-31', '2024-01-01')).toThrow('Start date cannot be after end date');
  });

  it('does not throw when only start is provided', () => {
    expect(() => validateDateRange('2024-01-01', undefined)).not.toThrow();
  });

  it('does not throw when neither is provided', () => {
    expect(() => validateDateRange(undefined, undefined)).not.toThrow();
  });
});

describe('validateAmount', () => {
  it('accepts zero', () => {
    expect(() => validateAmount(0)).not.toThrow();
  });

  it('accepts positive amount', () => {
    expect(() => validateAmount(1000.50)).not.toThrow();
  });

  it('throws on negative amount', () => {
    expect(() => validateAmount(-1)).toThrow('cannot be negative');
  });

  it('throws on amount exceeding max', () => {
    expect(() => validateAmount(1000000000)).toThrow('exceeds maximum');
  });
});

describe('validateProbability', () => {
  it('accepts 0', () => {
    expect(() => validateProbability(0)).not.toThrow();
  });

  it('accepts 100', () => {
    expect(() => validateProbability(100)).not.toThrow();
  });

  it('accepts 50', () => {
    expect(() => validateProbability(50)).not.toThrow();
  });

  it('throws on negative', () => {
    expect(() => validateProbability(-1)).toThrow('between 0 and 100');
  });

  it('throws on over 100', () => {
    expect(() => validateProbability(101)).toThrow('between 0 and 100');
  });
});

describe('normalizeTaskDates', () => {
  it('returns data unchanged for non-Task entity types', () => {
    const data = { dateEnd: '2026-06-15' };
    expect(normalizeTaskDates('Contact', data)).toEqual(data);
    expect(normalizeTaskDates('Account', data)).toEqual(data);
  });

  it('moves date-only dateEnd to dateEndDate and removes dateEnd', () => {
    const data = { name: 'My Task', dateEnd: '2026-06-15', status: 'Not Started' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateEndDate).toBe('2026-06-15');
    expect(result.dateEnd).toBeUndefined();
    expect(result.name).toBe('My Task');
    expect(result.status).toBe('Not Started');
  });

  it('moves date-only dateStart to dateStartDate and removes dateStart', () => {
    const data = { name: 'My Task', dateStart: '2026-06-10' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateStartDate).toBe('2026-06-10');
    expect(result.dateStart).toBeUndefined();
  });

  it('keeps full datetime in dateEnd and normalizes T to space', () => {
    const data = { name: 'My Task', dateEnd: '2026-06-15T14:30:00' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateEnd).toBe('2026-06-15 14:30:00');
    expect(result.dateEndDate).toBeUndefined();
  });

  it('keeps space-separated datetime in dateEnd unchanged', () => {
    const data = { name: 'My Task', dateEnd: '2026-06-15 14:30:00' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateEnd).toBe('2026-06-15 14:30:00');
    expect(result.dateEndDate).toBeUndefined();
  });

  it('handles both dateEnd and dateStart together', () => {
    const data = { name: 'My Task', dateStart: '2026-06-10', dateEnd: '2026-06-15T09:00:00' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateStartDate).toBe('2026-06-10');
    expect(result.dateStart).toBeUndefined();
    expect(result.dateEnd).toBe('2026-06-15 09:00:00');
    expect(result.dateEndDate).toBeUndefined();
  });

  it('normalizes dateEndDate if provided directly', () => {
    const data = { name: 'My Task', dateEndDate: '2026-06-15T10:00:00' };
    const result = normalizeTaskDates('Task', data);
    expect(result.dateEndDate).toBe('2026-06-15');
  });

  it('does not mutate the original data object', () => {
    const data = { name: 'My Task', dateEnd: '2026-06-15' };
    const original = { ...data };
    normalizeTaskDates('Task', data);
    expect(data).toEqual(original);
  });

  it('handles missing date fields gracefully', () => {
    const data = { name: 'My Task', status: 'Started' };
    const result = normalizeTaskDates('Task', data);
    expect(result).toEqual(data);
  });
});
