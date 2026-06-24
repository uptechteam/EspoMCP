/**
 * Unit tests for config validation.
 *
 * **Validates: Requirement 6.4**
 *
 * Tests valid config, missing required fields, HMAC without secretKey.
 * We test the validateConfiguration function and the loadConfig function
 * by manipulating environment variables.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validateConfiguration, loadConfig } from '../../src/config/index';

describe('validateConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env to a clean state for each test
    process.env = { ...originalEnv };
    // Ensure SCHEMA_ONLY is not set
    delete process.env.SCHEMA_ONLY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns no errors for valid config', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';

    const errors = validateConfiguration();
    expect(errors).toEqual([]);
  });

  it('returns error when ESPOCRM_URL is missing', () => {
    delete process.env.ESPOCRM_URL;
    process.env.ESPOCRM_API_KEY = 'test-key';

    const errors = validateConfiguration();
    expect(errors).toContain('ESPOCRM_URL environment variable is required');
  });

  it('returns error when ESPOCRM_API_KEY is missing', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    delete process.env.ESPOCRM_API_KEY;

    const errors = validateConfiguration();
    expect(errors.some(e => e.includes('ESPOCRM_API_KEY'))).toBe(true);
  });

  it('returns error when ESPOCRM_URL is not a valid URL', () => {
    process.env.ESPOCRM_URL = 'not-a-url';
    process.env.ESPOCRM_API_KEY = 'test-key';

    const errors = validateConfiguration();
    expect(errors.some(e => e.includes('valid URL'))).toBe(true);
  });

  it('returns error when HMAC auth is set without secret key', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';
    process.env.ESPOCRM_AUTH_METHOD = 'hmac';
    delete process.env.ESPOCRM_SECRET_KEY;

    const errors = validateConfiguration();
    expect(errors.some(e => e.includes('ESPOCRM_SECRET_KEY'))).toBe(true);
  });

  it('returns no errors when HMAC auth has secret key', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';
    process.env.ESPOCRM_AUTH_METHOD = 'hmac';
    process.env.ESPOCRM_SECRET_KEY = 'my-secret';

    const errors = validateConfiguration();
    expect(errors).toEqual([]);
  });
});

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SCHEMA_ONLY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid config from environment', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';
    process.env.ESPOCRM_AUTH_METHOD = 'apikey';

    const config = loadConfig();
    expect(config.espocrm.baseUrl).toBe('https://crm.example.com');
    expect(config.espocrm.apiKey).toBe('test-key');
    expect(config.espocrm.authMethod).toBe('apikey');
  });

  it('uses default values for server config', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';

    const config = loadConfig();
    expect(config.server.rateLimit).toBe(100);
    expect(config.server.timeout).toBe(30000);
    expect(config.server.logLevel).toBe('info');
  });

  it('throws on missing required fields', () => {
    delete process.env.ESPOCRM_URL;
    delete process.env.ESPOCRM_API_KEY;

    expect(() => loadConfig()).toThrow('Configuration validation failed');
  });

  it('throws when HMAC auth is set without secret key', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';
    process.env.ESPOCRM_AUTH_METHOD = 'hmac';
    delete process.env.ESPOCRM_SECRET_KEY;

    expect(() => loadConfig()).toThrow();
  });

  it('loads HMAC config when secret key is provided', () => {
    process.env.ESPOCRM_URL = 'https://crm.example.com';
    process.env.ESPOCRM_API_KEY = 'test-key';
    process.env.ESPOCRM_AUTH_METHOD = 'hmac';
    process.env.ESPOCRM_SECRET_KEY = 'my-secret';

    const config = loadConfig();
    expect(config.espocrm.authMethod).toBe('hmac');
    expect(config.espocrm.secretKey).toBe('my-secret');
  });
});
