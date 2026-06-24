import { z } from "zod";

// Common validation schemas
export const EmailSchema = z.string().email("Invalid email address");
export const PhoneSchema = z.string().regex(/^[\+]?[\d][\d\s\-\.\(\)]{0,25}$/, "Invalid phone number format");
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
export const DateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "DateTime must be in YYYY-MM-DD HH:MM:SS format");

// Flexible datetime schema: accepts both ISO "YYYY-MM-DDTHH:mm:ss" and space-separated "YYYY-MM-DD HH:mm:ss"
export const FlexibleDateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/,
  "DateTime must be in YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss format"
);

// Normalizes a datetime string by replacing the T separator with a space.
// EspoCRM expects space-separated format: "YYYY-MM-DD HH:mm:ss"
export function normalizeDateTime(value: string): string {
  return value.replace('T', ' ');
}

// Normalizes a date string by stripping any time component.
// Accepts: "2026-05-22", "2026-05-22T10:00:00", "2026-05-22 10:00:00", "2026-05-22T10:00:00Z", "2026-05-22T10:00:00+02:00"
// Returns: "2026-05-22"
export function normalizeDate(value: string): string {
  // Strip everything after the date portion (T, space, or any time/timezone info)
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : value;
}

// Flexible date schema that accepts date-only or datetime strings and normalizes to YYYY-MM-DD.
// Use .transform() in Zod pipelines for automatic normalization.
export const FlexibleDateSchema = z.string()
  .regex(
    /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/,
    "Date must start with YYYY-MM-DD (time component will be stripped if provided)"
  )
  .transform(normalizeDate);

export const UrlSchema = z.string().url("Invalid URL format");
export const IdSchema = z.string().min(1, "ID cannot be empty");

// Name validation (allows letters, spaces, hyphens, apostrophes)
export const NameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .regex(/^[a-zA-Z\s'\-\.]+$/, "Name contains invalid characters");

// Sanitization functions
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

export function validateEntityId(id: string, entityType: string): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`Invalid ${entityType} ID: ID cannot be empty`);
  }
  
  if (id.length > 50) {
    throw new Error(`Invalid ${entityType} ID: ID too long`);
  }
  
  // Basic format validation for EspoCRM IDs
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    throw new Error(`Invalid ${entityType} ID: ID contains invalid characters`);
  }
}

export function validateDateRange(startDate?: string, endDate?: string): void {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new Error("Start date cannot be after end date");
    }
  }
}

export function validateAmount(amount: number): void {
  if (amount < 0) {
    throw new Error("Amount cannot be negative");
  }
  
  if (amount > 999999999.99) {
    throw new Error("Amount exceeds maximum allowed value");
  }
}

export function validateProbability(probability: number): void {
  if (probability < 0 || probability > 100) {
    throw new Error("Probability must be between 0 and 100");
  }
}

// EspoCRM Task date handling:
// - `dateEnd` is type "datetimeOptional" → expects full datetime "YYYY-MM-DD HH:mm:ss"
// - `dateEndDate` is type "date" → expects date-only "YYYY-MM-DD"
// When a date-only value is provided for dateEnd/dateStart, we must send it via
// the corresponding *Date field instead, otherwise EspoCRM's DateTime::fromString()
// rejects it with a 400 validation error.
const TASK_DATETIME_TO_DATE_MAP: Record<string, string> = {
  dateEnd: 'dateEndDate',
  dateStart: 'dateStartDate',
};

// Checks if a string is date-only (no time component).
function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Normalizes date fields in entity data when the entity type is Task.
// If dateEnd or dateStart contain a date-only value, moves them to dateEndDate/dateStartDate
// respectively (which EspoCRM accepts as date-only). If they contain a full datetime,
// normalizes to space-separated format "YYYY-MM-DD HH:mm:ss".
export function normalizeTaskDates(entityType: string, data: Record<string, any>): Record<string, any> {
  if (entityType !== 'Task') return data;
  
  const normalized = { ...data };
  
  for (const [datetimeField, dateField] of Object.entries(TASK_DATETIME_TO_DATE_MAP)) {
    if (normalized[datetimeField] && typeof normalized[datetimeField] === 'string') {
      const rawValue = normalized[datetimeField];
      
      if (isDateOnly(rawValue)) {
        // Date-only value → send via the *Date field, remove the datetime field
        normalized[dateField] = rawValue;
        delete normalized[datetimeField];
      } else {
        // Full datetime → normalize to space-separated format
        normalized[datetimeField] = rawValue.replace('T', ' ');
      }
    }
  }
  
  // Also normalize dateEndDate/dateStartDate if they were provided directly
  for (const dateField of ['dateEndDate', 'dateStartDate']) {
    if (normalized[dateField] && typeof normalized[dateField] === 'string') {
      normalized[dateField] = normalizeDate(normalized[dateField]);
    }
  }
  
  return normalized;
}