import type { IntegrationResponse } from './types';

const SNAKE_TOKEN = /^[a-z][a-z0-9_]*$/;
const DEADLINE_TOKEN = 'REQUEST_DEADLINE_EXCEEDED';
const DETAIL_KEYS = ['bytes', 'limitBytes', 'mimeType', 'deadlineMs', 'providerStatus'];
const ABORT_NAMES = ['AbortError', 'TimeoutError'];

type Body = Record<string, unknown>;

const codeFor = (status: number, body: Body): string => {
  if (typeof body.error === 'string' && SNAKE_TOKEN.test(body.error)) return body.error;
  if (body.error === DEADLINE_TOKEN || status === 504) return 'timeout';
  if (status === 413) return 'request_too_large';
  if (status === 400 && Array.isArray(body.message)) return 'validation';
  return 'gateway_error';
};

const messageFor = (body: Body): string => {
  if (Array.isArray(body.message)) return body.message.map(String).join('; ');
  if (typeof body.message === 'string' && body.message) return body.message;
  if (typeof body.error === 'string' && body.error) return body.error;
  return 'Request failed';
};

const detailsFor = (body: Body): Record<string, unknown> | undefined => {
  const present = DETAIL_KEYS.filter((key) => body[key] !== undefined);
  if (present.length === 0) return undefined;
  return Object.fromEntries(present.map((key) => [key, body[key]]));
};

export const failureFromBody = <T>(status: number, body: Body): IntegrationResponse<T> => {
  const details = detailsFor(body);
  const failure: IntegrationResponse<T> = { success: false, error: messageFor(body), code: codeFor(status, body), status };
  return details ? { ...failure, details } : failure;
};

export const failureFromText = <T>(status: number): IntegrationResponse<T> => ({
  success: false,
  error: `HTTP ${status}`,
  code: codeFor(status, {}),
  status,
});

export const failureFromRejection = <T>(error: unknown, timeoutMs?: number): IntegrationResponse<T> => {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  if (ABORT_NAMES.includes(name)) {
    return { success: false, code: 'timeout', error: `Request exceeded ${timeoutMs ?? 0} ms` };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { success: false, code: 'provider_unreachable', error: message, details: { target: 'gateway' } };
};
