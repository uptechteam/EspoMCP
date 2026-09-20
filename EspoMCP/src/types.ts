export interface EspoCRMConfig {
  baseUrl: string;
  apiKey: string;
  authMethod: 'apikey' | 'hmac';
  secretKey?: string;
  // Optional fallback owner for records whose assignedUser field is marked
  // required in the EspoCRM instance (Task, Call, Meeting can all be configured
  // this way). Set via ESPOCRM_DEFAULT_ASSIGNED_USER_ID.
  defaultAssignedUserId?: string;
}

export interface ServerConfig {
  rateLimit: number;
  timeout: number;
  logLevel: string;
}

export interface Config {
  espocrm: EspoCRMConfig;
  server: ServerConfig;
}

export interface MCPError {
  code: string;
  message: string;
  context?: string;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
  limit: number;
}