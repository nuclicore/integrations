import type { NuclicoreIntegrationsConfig, IntegrationResponse, RequestOptions } from './types';
import { failureFromBody, failureFromRejection, failureFromText } from './failure';

const DEFAULT_GATEWAY_URL = 'https://integrations.nuclicore.com';

type Environment = 'preview' | 'test' | 'production';

const normalizeEnv = (value?: string): Environment | undefined => {
  if (value === 'preview' || value === 'test' || value === 'production') {
    return value;
  }
  return undefined;
};

export class IntegrationClient {
  private config: NuclicoreIntegrationsConfig;
  private initialized = false;
  private appId!: string;
  private apiKey?: string;
  private gatewayUrl!: string;
  private environment!: Environment;
  private label?: string;

  constructor(config: NuclicoreIntegrationsConfig = {}) {
    this.config = config;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    const appId = this.config.appId || process.env.NUCLICORE_APP_ID;
    if (!appId) {
      throw new Error(
        'appId is required. Set NUCLICORE_APP_ID environment variable or pass appId in config.',
      );
    }

    this.appId = appId;
    this.apiKey = this.config.apiKey || process.env.NUCLICORE_INTEGRATION_KEY;
    this.gatewayUrl =
      this.config.gatewayUrl ||
      process.env.NUCLICORE_GATEWAY_URL ||
      DEFAULT_GATEWAY_URL;
    this.environment =
      this.config.environment ||
      normalizeEnv(process.env.NUCLICORE_ENVIRONMENT) ||
      (process.env.NODE_ENV === 'production' ? 'production' : 'preview');
    this.label = this.config.label || process.env.NUCLICORE_LABEL || undefined;
    this.initialized = true;
  }

  async request<T>(
    endpoint: string,
    data: unknown,
    options?: RequestOptions,
  ): Promise<IntegrationResponse<T>> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    const init: RequestInit = { method: 'POST', headers, body: JSON.stringify(data) };
    if (options === undefined) return this.plainRequest<T>(url, init);
    const timeoutMs = options.timeoutMs;
    try {
      const response = await fetch(url, {
        ...init,
        ...(timeoutMs === undefined ? {} : { signal: AbortSignal.timeout(timeoutMs) }),
      });
      const text = await response.text();
      return this.outcome<T>(response.status, response.ok, text);
    } catch (error) {
      return failureFromRejection<T>(error, timeoutMs);
    }
  }

  private async plainRequest<T>(url: string, init: RequestInit): Promise<IntegrationResponse<T>> {
    const response = await fetch(url, init);
    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return { success: false, error: errorMessage };
    }
    return result as unknown as IntegrationResponse<T>;
  }

  private outcome<T>(status: number, ok: boolean, text: string): IntegrationResponse<T> {
    const body = this.parseObject(text);
    if (!body) return failureFromText<T>(status);
    if (ok) return body as unknown as IntegrationResponse<T>;
    return this.failure<T>(status, body);
  }

  private failure<T>(status: number, body: Record<string, unknown>): IntegrationResponse<T> {
    return failureFromBody<T>(status, body);
  }

  private parseObject(text: string): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  async requestEnvelope<T>(
    endpoint: string,
    data: unknown,
  ): Promise<{ status: number; result: IntegrationResponse<T> }> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return { status: response.status, result: { success: false, error: errorMessage } };
    }
    return { status: response.status, result: result as unknown as IntegrationResponse<T> };
  }

  async requestGet<T>(endpoint: string): Promise<IntegrationResponse<T>> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    const response = await fetch(url, { method: 'GET', headers });
    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return { success: false, error: errorMessage };
    }

    return result as unknown as IntegrationResponse<T>;
  }

  async requestDelete<T>(
    endpoint: string,
    data: unknown,
  ): Promise<IntegrationResponse<T>> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return { success: false, error: errorMessage };
    }

    return result as unknown as IntegrationResponse<T>;
  }

  async requestMultipart<T>(
    endpoint: string,
    params: { path: string; file: Buffer | Blob | ArrayBuffer; contentType: string },
  ): Promise<IntegrationResponse<T>> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    const formData = new FormData();
    const blob =
      params.file instanceof Blob
        ? params.file
        : new Blob([params.file], { type: params.contentType });
    formData.append('file', blob);
    formData.append('path', params.path);
    formData.append('contentType', params.contentType);

    const response = await fetch(url, { method: 'POST', headers, body: formData });
    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return { success: false, error: errorMessage };
    }

    return result as unknown as IntegrationResponse<T>;
  }

  async requestBinary(endpoint: string, data: unknown): Promise<globalThis.Response> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/octet-stream',
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  async requestBinaryUpload(
    endpoint: string,
    params: { path: string; file: Buffer; contentType: string; provider?: string },
  ): Promise<globalThis.Response> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': params.contentType,
      'X-Storage-Path': encodeURIComponent(params.path),
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (params.provider) {
      headers['X-Storage-Provider'] = params.provider;
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: new Uint8Array(params.file.buffer, params.file.byteOffset, params.file.byteLength),
    });
  }

  async requestStream(endpoint: string, data: unknown): Promise<globalThis.Response> {
    this.ensureInitialized();
    const url = `${this.gatewayUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': this.appId,
      'X-Environment': this.environment,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.label) {
      headers['X-Nuclicore-Label'] = this.label;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  getAppId(): string {
    this.ensureInitialized();
    return this.appId;
  }

  getEnvironment(): Environment {
    this.ensureInitialized();
    return this.environment;
  }

  setEnvironment(environment: Environment): void {
    this.ensureInitialized();
    this.environment = environment;
  }
}
