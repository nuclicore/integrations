import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NuclicoreIntegrations } from '../src/index';

type Call = { url: string; init: RequestInit };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const bytesResponse = (status: number, bytes: Uint8Array, contentType = 'text/plain') =>
  new Response(bytes, { status, headers: { 'content-type': contentType } });

const script = (handlers: Array<(call: Call) => Response | Promise<Response>>) => {
  const calls: Call[] = [];
  let index = 0;
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    const handler = handlers[index++];
    if (!handler) throw new Error(`unexpected fetch #${index}: ${call.url}`);
    return handler(call);
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

const sdk = () =>
  new NuclicoreIntegrations({
    appId: '11111111-1111-4111-8111-111111111111',
    apiKey: 'nclc_test',
    gatewayUrl: 'http://gateway',
    environment: 'test',
  });

describe('SDK v3 storage (direct-to-blob with gateway fallback)', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('SDK3-STORE-1: upload asks for an upload URL, PUTs the bytes to blob storage and echoes the classic envelope', async () => {
    const calls = script([
      () => jsonResponse(200, { success: true, data: { url: 'https://acct.blob.core.windows.net/c/sub/invoices/a.txt?sv=1&sp=cw&sig=x', expiresAt: '2026-09-15T10:15:00.000Z', blobUrl: 'https://acct.blob.core.windows.net/c/sub/invoices/a.txt', path: 'invoices/a.txt' } }),
      () => new Response(null, { status: 201 }),
    ]);
    const result = await sdk().storage.upload({ path: 'invoices/a.txt', file: Buffer.from('hello'), contentType: 'text/plain' });
    expect(result).toEqual({ success: true, data: { url: 'https://acct.blob.core.windows.net/c/sub/invoices/a.txt', size: 5, path: 'invoices/a.txt' } });
    expect(calls[0].url).toBe('http://gateway/v1/storage/upload-url');
    expect((calls[0].init.headers as Record<string, string>)['X-Environment']).toBe('test');
    expect((calls[0].init.headers as Record<string, string>)['Authorization']).toBe('Bearer nclc_test');
    expect(calls[1].init.method).toBe('PUT');
    expect((calls[1].init.headers as Record<string, string>)['x-ms-blob-type']).toBe('BlockBlob');
    expect((calls[1].init.headers as Record<string, string>)['x-ms-blob-content-type']).toBe('text/plain');
  });

  it('SDK3-STORE-2: an older gateway without the upload-url route falls back to the binary upload route', async () => {
    const calls = script([
      () => jsonResponse(404, { statusCode: 404, message: 'Cannot POST /v1/storage/upload-url' }),
      () => jsonResponse(200, { success: true, data: { url: 'https://acct/x', size: 5, path: 'invoices/a.txt' } }),
    ]);
    const result = await sdk().storage.upload({ path: 'invoices/a.txt', file: Buffer.from('hello'), contentType: 'text/plain' });
    expect(result.success).toBe(true);
    expect(calls[1].url).toBe('http://gateway/v1/storage/upload-binary');
    expect((calls[1].init.headers as Record<string, string>)['X-Storage-Path']).toBe('invoices%2Fa.txt');
  });

  it('SDK3-STORE-3: gateway refusals and blob PUT failures surface as envelope errors', async () => {
    script([() => jsonResponse(403, { message: 'Insufficient credits. You have 0 credits remaining.', error: 'Forbidden', statusCode: 403 })]);
    const refused = await sdk().storage.upload({ path: 'a', file: Buffer.from('x'), contentType: 'text/plain' });
    expect(refused).toEqual({ success: false, error: 'Insufficient credits. You have 0 credits remaining.' });
    script([
      () => jsonResponse(200, { success: true, data: { url: 'https://blob/a?sig=1', expiresAt: '', blobUrl: 'https://blob/a', path: 'a' } }),
      () => new Response('AuthenticationFailed', { status: 403 }),
    ]);
    const failed = await sdk().storage.upload({ path: 'a', file: Buffer.from('x'), contentType: 'text/plain' });
    expect(failed).toEqual({ success: false, error: 'Azure Blob upload error: HTTP 403' });
  });

  it('SDK3-STORE-4: download fetches the signed read URL directly and falls back to the gateway for legacy layouts', async () => {
    let calls = script([
      () => jsonResponse(200, { success: true, data: { url: 'https://blob/sub/a.pdf?sig=1', expiresAt: '', blobUrl: 'https://blob/sub/a.pdf', path: 'a.pdf' } }),
      () => bytesResponse(200, new TextEncoder().encode('%PDF-1.7'), 'application/pdf'),
    ]);
    const direct = await sdk().storage.download({ path: 'a.pdf' });
    expect(direct.success).toBe(true);
    expect(direct.data?.buffer.toString()).toBe('%PDF-1.7');
    expect(direct.data?.contentType).toBe('application/pdf');
    expect(calls[1].init.method).toBe('GET');
    calls = script([
      () => jsonResponse(200, { success: true, data: { url: 'https://blob/sub/old.pdf?sig=1', expiresAt: '', blobUrl: 'https://blob/sub/old.pdf', path: 'old.pdf' } }),
      () => new Response('BlobNotFound', { status: 404 }),
      () => bytesResponse(200, new TextEncoder().encode('legacy'), 'application/octet-stream'),
    ]);
    const legacy = await sdk().storage.download({ path: 'old.pdf' });
    expect(legacy.success).toBe(true);
    expect(legacy.data?.buffer.toString()).toBe('legacy');
    expect(calls[2].url).toBe('http://gateway/v1/storage/download');
    expect((calls[2].init.headers as Record<string, string>)['Accept']).toBe('application/octet-stream');
  });
});
