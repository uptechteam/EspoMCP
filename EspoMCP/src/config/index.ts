import { z } from "zod";
import { Config } from "../types.js";

/**
 * Whether the server is running in schema-only mode.
 * In this mode, the server starts and responds to tools/list
 * but does not require a valid ESPOCRM_API_KEY since it won't
 * make any actual CRM API calls.
 *
 * Set SCHEMA_ONLY=true to enable.
 */
export const isSchemaOnlyMode = process.env.SCHEMA_ONLY === 'true';

const ConfigSchema = z.object({
  espocrm: z.object({
    baseUrl: z.string().url("ESPOCRM_URL must be a valid URL"),
    apiKey: z.string().min(1, "ESPOCRM_API_KEY is required"),
    authMethod: z.enum(['apikey', 'hmac']).default('apikey'),
    secretKey: z.string().optional(),
  }).refine(
    (data) => data.authMethod !== 'hmac' || (data.secretKey && data.secretKey.length > 0),
    { message: "secretKey is required when authMethod is 'hmac'" }
  ),
  server: z.object({
    rateLimit: z.number().min(1).default(100),
    timeout: z.number().min(1000).default(30000),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

/**
 * Relaxed schema for schema-only mode — API key and URL are optional
 * since the server won't make any CRM API calls.
 */
const SchemaOnlyConfigSchema = z.object({
  espocrm: z.object({
    baseUrl: z.string().default('http://localhost:8080'),
    apiKey: z.string().default('schema-only'),
    authMethod: z.enum(['apikey', 'hmac']).default('apikey'),
    secretKey: z.string().optional(),
  }),
  server: z.object({
    rateLimit: z.number().min(1).default(100),
    timeout: z.number().min(1000).default(30000),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export function loadConfig(): Config {
  const config = {
    espocrm: {
      baseUrl: process.env.ESPOCRM_URL || (isSchemaOnlyMode ? 'http://localhost:8080' : undefined),
      apiKey: process.env.ESPOCRM_API_KEY || (isSchemaOnlyMode ? 'schema-only' : undefined),
      authMethod: process.env.ESPOCRM_AUTH_METHOD || 'apikey',
      secretKey: process.env.ESPOCRM_SECRET_KEY,
    },
    server: {
      rateLimit: parseInt(process.env.RATE_LIMIT || '100'),
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  };

  const schema = isSchemaOnlyMode ? SchemaOnlyConfigSchema : ConfigSchema;

  try {
    return schema.parse(config) as Config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

export function validateConfiguration(): string[] {
  // In schema-only mode, no CRM credentials are needed
  if (isSchemaOnlyMode) {
    return [];
  }

  const errors: string[] = [];
  
  if (!process.env.ESPOCRM_URL) {
    errors.push("ESPOCRM_URL environment variable is required");
  }
  
  if (!process.env.ESPOCRM_API_KEY) {
    errors.push("ESPOCRM_API_KEY environment variable is required");
  }
  
  if (process.env.ESPOCRM_URL) {
    try {
      new URL(process.env.ESPOCRM_URL);
    } catch {
      errors.push("ESPOCRM_URL must be a valid URL");
    }
  }
  
  if (process.env.ESPOCRM_AUTH_METHOD === 'hmac' && !process.env.ESPOCRM_SECRET_KEY) {
    errors.push("ESPOCRM_SECRET_KEY is required when using HMAC authentication");
  }
  
  return errors;
}