import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { EspoCRMConfig } from "../types.js";
import { EspoCRMResponse, WhereClause } from "./types.js";
import { MCPErrorHandler } from "../utils/errors.js";
import logger from "../utils/logger.js";

export class EspoCRMClient {
  private client: AxiosInstance;
  private rateLimiter: {
    timestamps: number[];
    limit: number;
    windowMs: number;
  };
  
  constructor(private config: EspoCRMConfig, rateLimit?: number) {
    this.client = axios.create({
      baseURL: `${config.baseUrl.replace(/\/$/, '')}/api/v1/`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.rateLimiter = {
      timestamps: [],
      limit: rateLimit || 100,
      windowMs: 60000, // 60 seconds
    };
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Rate limiter interceptor (runs before auth)
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      // Prune timestamps older than the window
      this.rateLimiter.timestamps = this.rateLimiter.timestamps.filter(
        (t) => now - t < this.rateLimiter.windowMs
      );

      // If at limit, delay until oldest timestamp exits the window
      if (this.rateLimiter.timestamps.length >= this.rateLimiter.limit) {
        const oldestTimestamp = this.rateLimiter.timestamps[0];
        const delay = this.rateLimiter.windowMs - (now - oldestTimestamp);
        if (delay > 0 && delay <= this.rateLimiter.windowMs) {
          logger.warn(`Rate limit reached, delaying request by ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Re-prune after delay
          const afterDelay = Date.now();
          this.rateLimiter.timestamps = this.rateLimiter.timestamps.filter(
            (t) => afterDelay - t < this.rateLimiter.windowMs
          );
        }
      }

      // Record this request
      this.rateLimiter.timestamps.push(Date.now());
      return config;
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.config.authMethod === 'apikey') {
        config.headers['X-Api-Key'] = this.config.apiKey;
        logger.debug('Using API key authentication');
      } else if (this.config.authMethod === 'hmac' && this.config.secretKey) {
        const method = config.method?.toUpperCase() || 'GET';
        const uri = config.url || '';
        
        const headerValue = EspoCRMClient.computeHmacHeader(
          method, uri, this.config.apiKey, this.config.secretKey
        );
        config.headers['X-Hmac-Authorization'] = headerValue;
        logger.debug('Using HMAC authentication');
      }
      
      logger.debug(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
      return config;
    });
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Successful response from ${response.config.url}`, {
          status: response.status,
          dataLength: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        logger.error('Request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }
  
  async get<T = any>(entity: string, params?: any): Promise<EspoCRMResponse<T>> {
    try {
      const response = await this.client.get(entity, { params });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `GET ${entity}`);
    }
  }
  
  async post<T = any>(entity: string, data: any): Promise<T> {
    try {
      const response = await this.client.post(entity, data);
      logger.info(`Created ${entity}`, { id: response.data.id });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `POST ${entity}`);
    }
  }
  
  async put<T = any>(entity: string, id: string, data: any): Promise<T> {
    try {
      const response = await this.client.put(`${entity}/${id}`, data);
      logger.info(`Updated ${entity}`, { id });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `PUT ${entity}/${id}`);
    }
  }
  
  async patch<T = any>(entity: string, id: string, data: any): Promise<T> {
    try {
      const response = await this.client.patch(`${entity}/${id}`, data);
      logger.info(`Patched ${entity}`, { id });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `PATCH ${entity}/${id}`);
    }
  }
  
  async delete(entity: string, id: string): Promise<boolean> {
    try {
      await this.client.delete(`${entity}/${id}`);
      logger.info(`Deleted ${entity}`, { id });
      return true;
    } catch (error) {
      MCPErrorHandler.handleError(error, `DELETE ${entity}/${id}`);
    }
  }
  
  async getById<T = any>(entity: string, id: string, select?: string[]): Promise<T> {
    try {
      const params = select ? { select: select.join(',') } : {};
      const response = await this.client.get(`${entity}/${id}`, { params });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `GET ${entity}/${id}`);
    }
  }
  
  async getRelated<T = any>(entity: string, id: string, link: string, params?: any): Promise<EspoCRMResponse<T>> {
    try {
      const response = await this.client.get(`${entity}/${id}/${link}`, { params });
      return response.data;
    } catch (error) {
      MCPErrorHandler.handleError(error, `GET ${entity}/${id}/${link}`);
    }
  }
  
  async linkRecords(entity: string, id: string, link: string, foreignIds: string | string[]): Promise<boolean> {
    try {
      const ids = Array.isArray(foreignIds) ? foreignIds : [foreignIds];
      for (const foreignId of ids) {
        await this.client.post(`${entity}/${id}/${link}`, { id: foreignId });
      }
      logger.info(`Linked ${entity}/${id} to ${link}`, { foreignIds });
      return true;
    } catch (error) {
      MCPErrorHandler.handleError(error, `LINK ${entity}/${id}/${link}`);
    }
  }
  
  async unlinkRecords(entity: string, id: string, link: string, foreignIds: string | string[]): Promise<boolean> {
    try {
      const ids = Array.isArray(foreignIds) ? foreignIds : [foreignIds];
      for (const foreignId of ids) {
        await this.client.delete(`${entity}/${id}/${link}`, { data: { id: foreignId } });
      }
      logger.info(`Unlinked ${entity}/${id} from ${link}`, { foreignIds });
      return true;
    } catch (error) {
      MCPErrorHandler.handleError(error, `UNLINK ${entity}/${id}/${link}`);
    }
  }
  
  async search<T = any>(entity: string, searchParams: {
    where?: WhereClause[];
    select?: string[];
    orderBy?: string;
    order?: 'asc' | 'desc';
    maxSize?: number;
    offset?: number;
  }): Promise<EspoCRMResponse<T>> {
    try {
      const params: any = {};
      
      if (searchParams.where) {
        // EspoCRM expects indexed query params: where[0][type], where[0][attribute], where[0][value]
        // Passing a JSON string is silently ignored — the API returns all records unfiltered.
        searchParams.where.forEach((clause, index) => {
          params[`where[${index}][type]`] = clause.type;
          if (clause.attribute !== undefined) {
            params[`where[${index}][attribute]`] = clause.attribute;
          }
          if (clause.value !== undefined) {
            params[`where[${index}][value]`] = clause.value;
          }
        });
      }
      if (searchParams.select) {
        params.select = searchParams.select.join(',');
      }
      if (searchParams.orderBy) {
        params.orderBy = searchParams.orderBy;
        params.order = searchParams.order || 'asc';
      }
      if (searchParams.maxSize) {
        params.maxSize = searchParams.maxSize;
      }
      if (searchParams.offset) {
        params.offset = searchParams.offset;
      }
      
      return await this.get<T>(entity, params);
    } catch (error) {
      MCPErrorHandler.handleError(error, `SEARCH ${entity}`);
    }
  }
  
  async testConnection(): Promise<{ success: boolean; user?: any; version?: string }> {
    try {
      const userResponse = await this.client.get('App/user');
      
      return {
        success: true,
        user: userResponse.data.user,
        version: userResponse.data.settings?.version || 'Unknown'
      };
    } catch (error: any) {
      logger.error('Connection test failed', { error: error.message });
      return { success: false };
    }
  }

  
  /**
   * Compute the HMAC-SHA256 signature and return the full X-Hmac-Authorization header value.
   *
   * Per the EspoCRM API spec the string-to-sign is `{METHOD} /{URI}` only —
   * the request body is NOT included.
   */
  static computeHmacHeader(method: string, uri: string, apiKey: string, secretKey: string): string {
    const stringToSign = `${method} /${uri}`;

    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('hex');

    return Buffer.from(`${apiKey}:${hmac}`).toString('base64');
  }

  // Helper method to build where clauses
  static buildWhereClause(filters: Record<string, any>): WhereClause[] {
    const where: WhereClause[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          where.push({
            type: 'contains',
            attribute: key,
            value: value.replace(/\*/g, '')
          });
        } else if (Array.isArray(value)) {
          // Array values use 'in' operator
          where.push({
            type: 'in',
            attribute: key,
            value: value
          });
        } else {
          // Exact match
          where.push({
            type: 'equals',
            attribute: key,
            value: value
          });
        }
      }
    });
    
    return where;
  }
}