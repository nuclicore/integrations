import type { NuclicoreIntegrationsConfig, IntegrationResponse } from './types';

const DEFAULT_GATEWAY_URL = 'https://integrations.nuclicore.com';

export class IntegrationClient {
  private config: NuclicoreIntegrationsConfig;
  private initialized = false;
  private appId!: string;
  private apiKey?: string;
  private gatewayUrl!: string;
  private environment!: 'preview' | 'production';

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
      (process.env.NODE_ENV === 'production' ? 'production' : 'preview');
    this.initialized = true;
  }

  async request<T>(
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        (result.message as string) ||
        (result.error as string) ||
        'Request failed';
      return {
        success: false,
        error: errorMessage,
      };
    }

    return result as unknown as IntegrationResponse<T>;
  }

  getAppId(): string {
    this.ensureInitialized();
    return this.appId;
  }

  getEnvironment(): 'preview' | 'production' {
    this.ensureInitialized();
    return this.environment;
  }

  setEnvironment(environment: 'preview' | 'production'): void {
    this.ensureInitialized();
    this.environment = environment;
  }
}
