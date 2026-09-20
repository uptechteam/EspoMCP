import { describe, it, expect } from '@jest/globals';
import { MCPErrorHandler } from '../../src/utils/errors.js';

// Builds an axios-shaped error like the one EspoCRM returns for a 400.
function badRequest(body: any, headers: Record<string, string> = {}) {
  return { response: { status: 400, data: body, headers } };
}

describe('MCPErrorHandler 400 handling', () => {
  it('uses the X-Status-Reason header when present', () => {
    const error = badRequest(
      { messageTranslation: { label: 'validationFailure', data: { field: 'assignedUser', type: 'required' } } },
      { 'x-status-reason': 'Field validation failure; entityType: Task, field: assignedUser, type: required' }
    );

    expect(() => MCPErrorHandler.handleError(error, 'POST Task')).toThrow(
      'Bad request in POST Task: Field validation failure; entityType: Task, field: assignedUser, type: required'
    );
  });

  it('unpacks messageTranslation instead of rendering [object Object]', () => {
    const error = badRequest({
      messageTranslation: { label: 'validationFailure', data: { field: 'assignedUser', type: 'required' } },
    });

    let message = '';
    try {
      MCPErrorHandler.handleError(error, 'POST Task');
    } catch (e: any) {
      message = e.message;
    }

    expect(message).not.toContain('[object Object]');
    expect(message).toContain('validationFailure');
    expect(message).toContain('field: assignedUser');
    expect(message).toContain('type: required');
  });

  it('prefers a plain string message when there is no header', () => {
    const error = badRequest({ message: 'Bad value for field name' });
    expect(() => MCPErrorHandler.handleError(error, 'POST Task')).toThrow(
      'Bad request in POST Task: Bad value for field name'
    );
  });

  it('falls back to a generic message for an empty body', () => {
    const error = badRequest({});
    expect(() => MCPErrorHandler.handleError(error, 'POST Task')).toThrow(
      'Bad request in POST Task: Invalid request data'
    );
  });

  it('reads the header via a Headers-like getter', () => {
    const error = {
      response: {
        status: 400,
        data: {},
        headers: { get: (k: string) => (k === 'x-status-reason' ? 'Field validation failure; field: dateEnd' : undefined) },
      },
    };
    expect(() => MCPErrorHandler.handleError(error, 'POST Task')).toThrow(
      'Bad request in POST Task: Field validation failure; field: dateEnd'
    );
  });
});
