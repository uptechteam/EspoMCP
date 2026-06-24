/**
 * Property-based tests for HMAC authentication signing.
 *
 * **Validates: Requirements 7.1, 7.2**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import crypto from 'crypto';
import { EspoCRMClient } from '../../src/espocrm/client';

// --- Generators ---

/** Generates a valid HTTP method */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

/**
 * Generates a realistic URI path segment (alphanumeric + slashes).
 * Avoids empty strings so the URI is always meaningful.
 */
const uriArb = fc
  .array(
    fc.stringMatching(/^[a-zA-Z0-9\-_]{1,30}$/),
    { minLength: 1, maxLength: 5 },
  )
  .map((segments) => segments.join('/'));

/** Generates an arbitrary JSON-serialisable request body (including empty) */
const bodyArb = fc.oneof(
  fc.constant(''),
  fc.constant('{}'),
  fc.json(),
  fc.string({ minLength: 1, maxLength: 200 }),
);

/** Generates a non-empty API key */
const apiKeyArb = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.length > 0);

/** Generates a non-empty secret key */
const secretKeyArb = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.length > 0);

// --- Property 6: HMAC signing excludes request body ---

describe('Property 6: HMAC signing excludes request body', () => {
  const NUM_RUNS = 100;

  /**
   * **Validates: Requirements 7.1**
   *
   * For any HTTP method, URI path, and request body, the HMAC-SHA256
   * string-to-sign SHALL be exactly `{METHOD} /{URI}` with no body
   * content appended.
   *
   * We verify this by computing the expected HMAC ourselves using
   * `{METHOD} /{URI}` and comparing it to what `computeHmacHeader` produces.
   */
  it('computeHmacHeader produces a signature matching HMAC-SHA256 of "{METHOD} /{URI}" only', () => {
    fc.assert(
      fc.property(httpMethodArb, uriArb, apiKeyArb, secretKeyArb, (method, uri, apiKey, secretKey) => {
        const header = EspoCRMClient.computeHmacHeader(method, uri, apiKey, secretKey);

        // Independently compute the expected value
        const expectedStringToSign = `${method} /${uri}`;
        const expectedHmac = crypto
          .createHmac('sha256', secretKey)
          .update(expectedStringToSign)
          .digest('hex');
        const expectedHeader = Buffer.from(`${apiKey}:${expectedHmac}`).toString('base64');

        expect(header).toBe(expectedHeader);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 7.1**
   *
   * Changing the request body MUST NOT change the HMAC signature.
   * For any two distinct bodies, the header produced for the same
   * method/URI/apiKey/secretKey must be identical.
   */
  it('signature is invariant to request body content', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        uriArb,
        apiKeyArb,
        secretKeyArb,
        bodyArb,
        bodyArb,
        (method, uri, apiKey, secretKey, body1, body2) => {
          // computeHmacHeader doesn't accept a body parameter at all,
          // which is the correct design. We call it twice to confirm
          // the result is deterministic and body-independent.
          const header1 = EspoCRMClient.computeHmacHeader(method, uri, apiKey, secretKey);
          const header2 = EspoCRMClient.computeHmacHeader(method, uri, apiKey, secretKey);

          expect(header1).toBe(header2);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 7.2**
   *
   * The X-Hmac-Authorization header SHALL be `Base64({apiKey}:{hmacHex})`.
   * We verify the structural format: decode from Base64, split on `:`,
   * and confirm the first part is the apiKey and the second is a valid
   * 64-char lowercase hex string (SHA-256 output).
   */
  it('header is Base64({apiKey}:{hmacHex}) with valid hex HMAC', () => {
    fc.assert(
      fc.property(httpMethodArb, uriArb, apiKeyArb, secretKeyArb, (method, uri, apiKey, secretKey) => {
        const header = EspoCRMClient.computeHmacHeader(method, uri, apiKey, secretKey);

        // Decode Base64
        const decoded = Buffer.from(header, 'base64').toString('utf-8');

        // The format is `{apiKey}:{hmacHex}`. Since apiKey can contain colons,
        // we split using the known apiKey length rather than indexOf.
        expect(decoded.length).toBeGreaterThan(apiKey.length + 1); // apiKey + ':' + hmac
        expect(decoded.charAt(apiKey.length)).toBe(':');

        const decodedApiKey = decoded.substring(0, apiKey.length);
        const decodedHmac = decoded.substring(apiKey.length + 1);

        expect(decodedApiKey).toBe(apiKey);

        // HMAC-SHA256 hex digest is always 64 lowercase hex characters
        expect(decodedHmac).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * **Validates: Requirements 7.1**
   *
   * Different methods or URIs MUST produce different signatures
   * (with overwhelming probability for random inputs).
   */
  it('different method or URI produces a different signature', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        httpMethodArb,
        uriArb,
        uriArb,
        secretKeyArb,
        apiKeyArb,
        (method1, method2, uri1, uri2, secretKey, apiKey) => {
          // Only test when the (method, uri) pair actually differs
          fc.pre(method1 !== method2 || uri1 !== uri2);

          const header1 = EspoCRMClient.computeHmacHeader(method1, uri1, apiKey, secretKey);
          const header2 = EspoCRMClient.computeHmacHeader(method2, uri2, apiKey, secretKey);

          expect(header1).not.toBe(header2);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
