import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_PROVIDERS, NuclicoreIntegrations } from '../src/index';
import type { AiProvider, ChatParams } from '../src/index';

type Call = { url: string; init: RequestInit };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

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

const chatOk = {
  success: true,
  data: { content: 'hi', model: 'm', usage: { inputTokens: 1, outputTokens: 2 }, finishReason: 'stop', raw: { id: 'r' } },
};

const ask: ChatParams = { messages: [{ role: 'user', content: 'hi' }] };

describe('SDK 3.1 ai.chat (content parts, local checks, timeout, error codes)', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('SDK3-AI-1: parts, topP and timeoutMs are sent verbatim and finishReason/raw come back', async () => {
    const calls = script([() => jsonResponse(200, chatOk)]);
    const params: ChatParams = {
      messages: [
        { role: 'system', content: 'be brief' },
        { role: 'user', content: [{ type: 'text', text: 'summarise' }, { type: 'file', mimeType: 'application/pdf', data: 'JVBERi0xLjc=' }] },
      ],
      model: 'gemini',
      topP: 0.9,
      timeoutMs: 60000,
    };
    const result = await sdk().ai.chat(params);
    expect(calls[0].url).toBe('http://gateway/v1/ai/chat');
    expect(JSON.parse(String(calls[0].init.body))).toEqual(params);
    expect(calls[0].init.signal).toBeDefined();
    expect(result.data?.finishReason).toBe('stop');
    expect(result.data?.raw).toEqual({ id: 'r' });
  });

  it('SDK3-AI-2: oversized requests are refused locally with bytes and limit', async () => {
    const calls = script([]);
    const result = await sdk().ai.chat({
      messages: [{ role: 'user', content: [{ type: 'file', mimeType: 'application/pdf', data: 'A'.repeat(180_000_000) }] }],
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('request_too_large');
    expect(Number(result.details?.bytes)).toBeGreaterThanOrEqual(180_000_000);
    expect(result.details?.limitBytes).toBe(134217728);
    expect(calls).toHaveLength(0);
  });

  it('SDK3-AI-3: gateway codes, proxy html replies and aborts map to codes', async () => {
    script([() => jsonResponse(200, { success: false, error: 'Google error: x', code: 'content_filtered' })]);
    expect(await sdk().ai.chat(ask)).toEqual({ success: false, error: 'Google error: x', code: 'content_filtered' });

    script([() => jsonResponse(200, { success: false, error: 'Openai error: x', code: 'content_filtered', providerStatus: 400 })]);
    const filtered = await sdk().ai.chat(ask);
    expect(filtered).toEqual({ success: false, error: 'Openai error: x', code: 'content_filtered', providerStatus: 400 });
    const providerStatus: number | undefined = filtered.providerStatus;
    expect(providerStatus).toBe(400);

    script([() => jsonResponse(413, { error: 'request_too_large', bytes: 1, limitBytes: 2 })]);
    const tooLarge = await sdk().ai.chat(ask);
    expect(tooLarge).toMatchObject({ success: false, code: 'request_too_large', status: 413 });
    expect(tooLarge.details?.bytes).toBe(1);

    script([() => new Response('<h1>Gateway Timeout</h1>', { status: 504, headers: { 'content-type': 'text/html' } })]);
    expect(await sdk().ai.chat(ask)).toMatchObject({ success: false, code: 'timeout', status: 504, error: 'HTTP 504' });

    script([() => { throw new DOMException('x', 'AbortError'); }]);
    expect(await sdk().ai.chat(ask)).toMatchObject({ success: false, code: 'timeout', error: 'Request exceeded 190000 ms' });

    script([() => { throw new TypeError('fetch failed'); }]);
    expect(await sdk().ai.chat(ask)).toMatchObject({ success: false, code: 'provider_unreachable', error: 'fetch failed', details: { target: 'gateway' } });
  });

  it('SDK3-AI-4: string content keeps the 3.0 request shape', async () => {
    const calls = script([() => jsonResponse(200, chatOk)]);
    const params: ChatParams = { messages: [{ role: 'user', content: 'hello' }], model: 'm', maxTokens: 10, temperature: 0.2 };
    await sdk().ai.chat(params);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ messages: [{ role: 'user', content: 'hello' }], model: 'm', maxTokens: 10, temperature: 0.2 });
  });

  it('SDK3-AI-5: empty messages and malformed file parts are refused locally', async () => {
    const calls = script([]);
    expect(await sdk().ai.chat({ messages: [] })).toEqual({ success: false, code: 'validation', error: 'At least one message is required' });
    const bad = await sdk().ai.chat({ messages: [{ role: 'user', content: [{ type: 'text', text: 'a' }, { type: 'file', mimeType: 'image/png', data: 'not base64!' }] }] });
    expect(bad).toMatchObject({ success: false, code: 'validation', error: 'messages[0].content[1] has invalid file data' });
    expect(calls).toHaveLength(0);
  });

  it('SDK3-AI-6: nest-style validation errors and gateway tokens carry status and code', async () => {
    script([() => jsonResponse(400, { message: ['messages must be an array', 'model must be a string'], error: 'Bad Request', statusCode: 400 })]);
    expect(await sdk().ai.chat(ask)).toEqual({ success: false, code: 'validation', status: 400, error: 'messages must be an array; model must be a string' });

    script([() => jsonResponse(504, { success: false, error: 'REQUEST_DEADLINE_EXCEEDED', deadlineMs: 5 })]);
    expect(await sdk().ai.chat(ask)).toEqual({ success: false, code: 'timeout', status: 504, error: 'REQUEST_DEADLINE_EXCEEDED', details: { deadlineMs: 5 } });

    script([() => jsonResponse(402, { error: 'budget_exceeded' })]);
    expect(await sdk().ai.chat(ask)).toEqual({ success: false, code: 'budget_exceeded', status: 402, error: 'budget_exceeded' });

    script([() => jsonResponse(500, { message: 'boom', error: 'Internal Server Error', statusCode: 500 })]);
    expect(await sdk().ai.chat(ask)).toEqual({ success: false, code: 'gateway_error', status: 500, error: 'boom' });
  });

  it('SDK3-AI-7: malformed content is refused locally without throwing', async () => {
    const calls = script([]);
    const malformed = [
      { messages: [{ role: 'user', content: undefined }] },
      { messages: [{ role: 'user', content: [null] }] },
      { messages: [{ role: 'user', content: [{ type: 'text' }] }] },
      { messages: [{ role: 'user', content: [{ type: 'image' }] }] },
    ] as unknown as ChatParams[];
    const expected = [
      'messages[0].content must be a string or an array of parts',
      'messages[0].content[0] is not a valid content part',
      'messages[0].content[0] has invalid text',
      'messages[0].content[0] is not a valid content part',
    ];
    for (const [i, params] of malformed.entries()) {
      expect(await sdk().ai.chat(params)).toEqual({ success: false, code: 'validation', error: expected[i] });
    }
    expect(calls).toHaveLength(0);
  });

  it('SDK3-AI-8: non-AI modules keep the 3.0 failure behaviour', async () => {
    const email = { from: 'a@b.co', to: 'c@d.co', subject: 's', text: 't' };
    script([() => { throw new TypeError('fetch failed'); }]);
    await expect(sdk().email.send(email)).rejects.toThrow('fetch failed');

    script([() => new Response('<h1>Bad Gateway</h1>', { status: 502, headers: { 'content-type': 'text/html' } })]);
    await expect(sdk().email.send(email)).rejects.toThrow();

    script([() => jsonResponse(413, { error: 'request_too_large', message: 'too big', bytes: 1, limitBytes: 2 })]);
    expect(await sdk().email.send(email)).toEqual({ success: false, error: 'too big' });

    const calls = script([() => jsonResponse(200, { success: true, data: { id: 'm' } })]);
    expect(await sdk().email.send(email)).toEqual({ success: true, data: { id: 'm' } });
    expect(calls[0].init.signal).toBeUndefined();
  });
});

describe('ai.chat provider and model', () => {
  it('sends provider and model verbatim and types the known providers', async () => {
    const calls = script([() => jsonResponse(200, { success: true, data: { content: 'ok', model: 'gpt-6-luna', usage: { inputTokens: 1, outputTokens: 1 } } })]);
    const provider: AiProvider = 'azure-openai';
    const params: ChatParams = { messages: [{ role: 'user', content: 'hello' }], provider, model: 'gpt-6-luna' };
    const result = await sdk().ai.chat(params);
    expect(result.success).toBe(true);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ messages: [{ role: 'user', content: 'hello' }], provider: 'azure-openai', model: 'gpt-6-luna' });
    expect(AI_PROVIDERS).toEqual(['anthropic', 'openai', 'google', 'deepseek', 'kimi', 'azure-openai', 'azure-anthropic', 'azure-kimi', 'azure-deepseek']);
  });
});
