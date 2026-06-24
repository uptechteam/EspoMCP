/**
 * Unit tests for EspoCRMClient methods (get, post, patch, delete).
 *
 * **Validates: Requirement 6.3**
 *
 * We test the client by creating a real instance with a mock base URL,
 * then intercepting the Axios instance's methods via the prototype chain.
 * For static methods (buildWhereClause, computeHmacHeader) we test directly.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EspoCRMClient } from '../../src/espocrm/client';
import type { EspoCRMConfig } from '../../src/types';

const defaultConfig: EspoCRMConfig = {
  baseUrl: 'https://crm.example.com',
  apiKey: 'test-api-key',
  authMethod: 'apikey',
};

describe('EspoCRMClient', () => {
  let client: EspoCRMClient;
  let axiosInstance: any;

  beforeEach(() => {
    client = new EspoCRMClient(defaultConfig);
    // Access the private axios instance for mocking
    axiosInstance = (client as any).client;
  });

  describe('get', () => {
    it('calls axios.get with the entity path and returns response data', async () => {
      const responseData = { list: [{ id: '1', name: 'Test' }], total: 1 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.get('Contact');

      expect(axiosInstance.get).toHaveBeenCalledWith('Contact', { params: undefined });
      expect(result).toEqual(responseData);
    });

    it('passes query params to axios.get', async () => {
      const responseData = { list: [], total: 0 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      const params = { maxSize: 10, offset: 0 };
      await client.get('Account', params);

      expect(axiosInstance.get).toHaveBeenCalledWith('Account', { params });
    });

    it('throws on network error', async () => {
      const error = new Error('Network Error');
      (error as any).code = 'ECONNREFUSED';
      axiosInstance.get = jest.fn<any>().mockRejectedValue(error);

      await expect(client.get('Contact')).rejects.toThrow('EspoCRM server unavailable');
    });
  });

  describe('post', () => {
    it('calls axios.post with entity path and data, returns response data', async () => {
      const inputData = { firstName: 'John', lastName: 'Doe' };
      const responseData = { id: 'abc123', ...inputData };
      axiosInstance.post = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.post('Contact', inputData);

      expect(axiosInstance.post).toHaveBeenCalledWith('Contact', inputData);
      expect(result).toEqual(responseData);
    });

    it('throws on 400 error', async () => {
      const error = {
        response: { status: 400, data: { message: 'Bad request' } },
        message: 'Request failed',
      };
      axiosInstance.post = jest.fn<any>().mockRejectedValue(error);

      await expect(client.post('Contact', {})).rejects.toThrow('Bad request');
    });
  });

  describe('patch', () => {
    it('calls axios.patch with entity/id path and data, returns response data', async () => {
      const inputData = { firstName: 'Jane' };
      const responseData = { id: 'abc123', firstName: 'Jane', lastName: 'Doe' };
      axiosInstance.patch = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.patch('Contact', 'abc123', inputData);

      expect(axiosInstance.patch).toHaveBeenCalledWith('Contact/abc123', inputData);
      expect(result).toEqual(responseData);
    });

    it('throws on 404 error', async () => {
      const error = {
        response: { status: 404, data: {} },
        message: 'Not found',
      };
      axiosInstance.patch = jest.fn<any>().mockRejectedValue(error);

      await expect(client.patch('Contact', 'nonexistent', {})).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('calls axios.delete with entity/id path and returns true', async () => {
      axiosInstance.delete = jest.fn<any>().mockResolvedValue({ data: true });

      const result = await client.delete('Contact', 'abc123');

      expect(axiosInstance.delete).toHaveBeenCalledWith('Contact/abc123');
      expect(result).toBe(true);
    });

    it('throws on 403 error', async () => {
      const error = {
        response: { status: 403, data: {} },
        message: 'Forbidden',
      };
      axiosInstance.delete = jest.fn<any>().mockRejectedValue(error);

      await expect(client.delete('Contact', 'abc123')).rejects.toThrow('forbidden');
    });
  });

  describe('put', () => {
    it('calls axios.put with entity/id path and data', async () => {
      const inputData = { firstName: 'Jane', lastName: 'Doe', emailAddress: 'jane@example.com' };
      const responseData = { id: 'abc123', ...inputData };
      axiosInstance.put = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.put('Contact', 'abc123', inputData);

      expect(axiosInstance.put).toHaveBeenCalledWith('Contact/abc123', inputData);
      expect(result).toEqual(responseData);
    });
  });

  describe('getById', () => {
    it('calls axios.get with entity/id path', async () => {
      const responseData = { id: 'abc123', firstName: 'John', lastName: 'Doe' };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.getById('Contact', 'abc123');

      expect(axiosInstance.get).toHaveBeenCalledWith('Contact/abc123', { params: {} });
      expect(result).toEqual(responseData);
    });

    it('passes select fields as comma-separated param', async () => {
      const responseData = { id: 'abc123', firstName: 'John' };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      await client.getById('Contact', 'abc123', ['firstName', 'lastName']);

      expect(axiosInstance.get).toHaveBeenCalledWith('Contact/abc123', {
        params: { select: 'firstName,lastName' },
      });
    });
  });

  describe('buildWhereClause (static)', () => {
    it('builds equals clause for simple string values', () => {
      const result = EspoCRMClient.buildWhereClause({ name: 'Test' });
      expect(result).toEqual([{ type: 'equals', attribute: 'name', value: 'Test' }]);
    });

    it('builds contains clause for wildcard values', () => {
      const result = EspoCRMClient.buildWhereClause({ name: '*Test*' });
      expect(result).toEqual([{ type: 'contains', attribute: 'name', value: 'Test' }]);
    });

    it('builds in clause for array values', () => {
      const result = EspoCRMClient.buildWhereClause({ status: ['Active', 'Pending'] });
      expect(result).toEqual([{ type: 'in', attribute: 'status', value: ['Active', 'Pending'] }]);
    });

    it('skips undefined, null, and empty string values', () => {
      const result = EspoCRMClient.buildWhereClause({
        a: undefined,
        b: null,
        c: '',
        d: 'valid',
      });
      expect(result).toEqual([{ type: 'equals', attribute: 'd', value: 'valid' }]);
    });

    it('returns empty array for empty input', () => {
      expect(EspoCRMClient.buildWhereClause({})).toEqual([]);
    });
  });

  describe('getRelated', () => {
    it('calls axios.get with entity/id/link path', async () => {
      const responseData = { list: [{ id: 'r1' }], total: 1 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.getRelated('Account', 'acc1', 'contacts');

      expect(axiosInstance.get).toHaveBeenCalledWith('Account/acc1/contacts', { params: undefined });
      expect(result).toEqual(responseData);
    });

    it('passes params to the request', async () => {
      const responseData = { list: [], total: 0 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      await client.getRelated('Account', 'acc1', 'contacts', { maxSize: 5 });

      expect(axiosInstance.get).toHaveBeenCalledWith('Account/acc1/contacts', { params: { maxSize: 5 } });
    });

    it('throws on error', async () => {
      const error = { response: { status: 404, data: {} }, message: 'Not found' };
      axiosInstance.get = jest.fn<any>().mockRejectedValue(error);

      await expect(client.getRelated('Account', 'bad', 'contacts')).rejects.toThrow('not found');
    });
  });

  describe('linkRecords', () => {
    it('posts each foreign ID to the link endpoint', async () => {
      axiosInstance.post = jest.fn<any>().mockResolvedValue({ data: true });

      const result = await client.linkRecords('Account', 'acc1', 'contacts', ['c1', 'c2']);

      expect(axiosInstance.post).toHaveBeenCalledTimes(2);
      expect(axiosInstance.post).toHaveBeenCalledWith('Account/acc1/contacts', { id: 'c1' });
      expect(axiosInstance.post).toHaveBeenCalledWith('Account/acc1/contacts', { id: 'c2' });
      expect(result).toBe(true);
    });

    it('handles single string foreignId', async () => {
      axiosInstance.post = jest.fn<any>().mockResolvedValue({ data: true });

      const result = await client.linkRecords('Account', 'acc1', 'contacts', 'c1');

      expect(axiosInstance.post).toHaveBeenCalledTimes(1);
      expect(axiosInstance.post).toHaveBeenCalledWith('Account/acc1/contacts', { id: 'c1' });
      expect(result).toBe(true);
    });

    it('throws on error', async () => {
      const error = { response: { status: 403, data: {} }, message: 'Forbidden' };
      axiosInstance.post = jest.fn<any>().mockRejectedValue(error);

      await expect(client.linkRecords('Account', 'acc1', 'contacts', ['c1'])).rejects.toThrow('forbidden');
    });
  });

  describe('unlinkRecords', () => {
    it('deletes each foreign ID from the link endpoint', async () => {
      axiosInstance.delete = jest.fn<any>().mockResolvedValue({ data: true });

      const result = await client.unlinkRecords('Account', 'acc1', 'contacts', ['c1', 'c2']);

      expect(axiosInstance.delete).toHaveBeenCalledTimes(2);
      expect(axiosInstance.delete).toHaveBeenCalledWith('Account/acc1/contacts', { data: { id: 'c1' } });
      expect(axiosInstance.delete).toHaveBeenCalledWith('Account/acc1/contacts', { data: { id: 'c2' } });
      expect(result).toBe(true);
    });

    it('handles single string foreignId', async () => {
      axiosInstance.delete = jest.fn<any>().mockResolvedValue({ data: true });

      const result = await client.unlinkRecords('Account', 'acc1', 'contacts', 'c1');

      expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('throws on error', async () => {
      const error = { response: { status: 403, data: {} }, message: 'Forbidden' };
      axiosInstance.delete = jest.fn<any>().mockRejectedValue(error);

      await expect(client.unlinkRecords('Account', 'acc1', 'contacts', ['c1'])).rejects.toThrow('forbidden');
    });
  });

  describe('search', () => {
    it('builds params from searchParams and calls get', async () => {
      const responseData = { list: [{ id: '1' }], total: 1 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      const result = await client.search('Contact', {
        where: [{ type: 'equals', attribute: 'firstName', value: 'John' }],
        select: ['firstName', 'lastName'],
        orderBy: 'firstName',
        order: 'desc',
        maxSize: 10,
        offset: 5,
      });

      expect(axiosInstance.get).toHaveBeenCalledWith('Contact', {
        params: {
          'where[0][type]': 'equals',
          'where[0][attribute]': 'firstName',
          'where[0][value]': 'John',
          select: 'firstName,lastName',
          orderBy: 'firstName',
          order: 'desc',
          maxSize: 10,
          offset: 5,
        },
      });
      expect(result).toEqual(responseData);
    });

    it('omits undefined search params', async () => {
      const responseData = { list: [], total: 0 };
      axiosInstance.get = jest.fn<any>().mockResolvedValue({ data: responseData });

      await client.search('Contact', {});

      expect(axiosInstance.get).toHaveBeenCalledWith('Contact', { params: {} });
    });

    it('throws on error', async () => {
      const error = new Error('Network Error');
      (error as any).code = 'ECONNREFUSED';
      axiosInstance.get = jest.fn<any>().mockRejectedValue(error);

      await expect(client.search('Contact', {})).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('returns success with user and version on successful connection', async () => {
      axiosInstance.get = jest.fn<any>().mockResolvedValue({
        data: {
          user: { id: 'u1', userName: 'admin' },
          settings: { version: '9.3.4' },
        },
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: 'u1', userName: 'admin' });
      expect(result.version).toBe('9.3.4');
    });

    it('returns success with Unknown version when settings missing', async () => {
      axiosInstance.get = jest.fn<any>().mockResolvedValue({
        data: { user: { id: 'u1' } },
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.version).toBe('Unknown');
    });

    it('returns failure on connection error', async () => {
      axiosInstance.get = jest.fn<any>().mockRejectedValue(new Error('Connection refused'));

      const result = await client.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('computeHmacHeader (static)', () => {
    it('computes correct HMAC header', () => {
      const result = EspoCRMClient.computeHmacHeader('GET', 'Contact', 'mykey', 'mysecret');
      expect(typeof result).toBe('string');
      // Should be base64 encoded
      const decoded = Buffer.from(result, 'base64').toString();
      expect(decoded).toMatch(/^mykey:[a-f0-9]{64}$/);
    });
  });

  describe('interceptors', () => {
    it('apikey auth interceptor sets X-Api-Key header', async () => {
      // Create client with apikey auth
      const apikeyClient = new EspoCRMClient(defaultConfig);
      const instance = (apikeyClient as any).client;

      // Access the request interceptors and run them manually
      const interceptors = instance.interceptors.request.handlers;
      // The second interceptor is the auth interceptor (index 1)
      const authInterceptor = interceptors[1];
      const mockConfig = { headers: {} as any, method: 'get', url: 'Contact' };
      const result = authInterceptor.fulfilled(mockConfig);
      expect(result.headers['X-Api-Key']).toBe('test-api-key');
    });

    it('hmac auth interceptor sets X-Hmac-Authorization header', async () => {
      const hmacConfig: EspoCRMConfig = {
        baseUrl: 'https://crm.example.com',
        apiKey: 'test-api-key',
        authMethod: 'hmac',
        secretKey: 'test-secret',
      };
      const hmacClient = new EspoCRMClient(hmacConfig);
      const instance = (hmacClient as any).client;

      const interceptors = instance.interceptors.request.handlers;
      const authInterceptor = interceptors[1];
      const mockConfig = { headers: {} as any, method: 'get', url: 'Contact' };
      const result = authInterceptor.fulfilled(mockConfig);
      expect(result.headers['X-Hmac-Authorization']).toBeDefined();
      expect(typeof result.headers['X-Hmac-Authorization']).toBe('string');
    });

    it('response interceptor passes through successful responses', async () => {
      const instance = (client as any).client;
      const interceptors = instance.interceptors.response.handlers;
      const responseInterceptor = interceptors[0];
      const mockResponse = { config: { url: 'Contact' }, status: 200, data: { id: '1' } };
      const result = responseInterceptor.fulfilled(mockResponse);
      expect(result).toEqual(mockResponse);
    });

    it('response interceptor rejects errors', async () => {
      const instance = (client as any).client;
      const interceptors = instance.interceptors.response.handlers;
      const responseInterceptor = interceptors[0];
      const mockError = { config: { url: 'Contact', method: 'get' }, response: { status: 500 }, message: 'Server error' };
      await expect(responseInterceptor.rejected(mockError)).rejects.toEqual(mockError);
    });

    it('rate limiter interceptor records timestamps', async () => {
      const rateLimitedClient = new EspoCRMClient(defaultConfig, 100);
      const instance = (rateLimitedClient as any).client;
      const rateLimiter = (rateLimitedClient as any).rateLimiter;

      const interceptors = instance.interceptors.request.handlers;
      const rateLimiterInterceptor = interceptors[0];

      // Simulate a request going through the rate limiter
      const mockConfig = { headers: {} as any, method: 'get', url: 'Contact' };
      await rateLimiterInterceptor.fulfilled(mockConfig);

      expect(rateLimiter.timestamps.length).toBe(1);
    });

    it('rate limiter prunes old timestamps', async () => {
      const rateLimitedClient = new EspoCRMClient(defaultConfig, 100);
      const rateLimiter = (rateLimitedClient as any).rateLimiter;
      const instance = (rateLimitedClient as any).client;

      // Add an old timestamp (older than 60s window)
      rateLimiter.timestamps.push(Date.now() - 120000);

      const interceptors = instance.interceptors.request.handlers;
      const rateLimiterInterceptor = interceptors[0];
      const mockConfig = { headers: {} as any, method: 'get', url: 'Contact' };
      await rateLimiterInterceptor.fulfilled(mockConfig);

      // Old timestamp should be pruned, only the new one remains
      expect(rateLimiter.timestamps.length).toBe(1);
    });
  });
});