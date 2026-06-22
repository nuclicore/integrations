import { IntegrationClient } from './client';
import { EmailModule } from './email';
import { PaymentsModule } from './payments';
import { StorageModule } from './storage';
import { AiModule } from './ai';
import { SmsModule } from './sms';
import type { NuclicoreIntegrationsConfig } from './types';

export class NuclicoreIntegrations {
  private client: IntegrationClient;

  public readonly email: EmailModule;
  public readonly payments: PaymentsModule;
  public readonly storage: StorageModule;
  public readonly ai: AiModule;
  public readonly sms: SmsModule;

  constructor(config: NuclicoreIntegrationsConfig = {}) {
    this.client = new IntegrationClient(config);
    this.email = new EmailModule(this.client);
    this.payments = new PaymentsModule(this.client);
    this.storage = new StorageModule(this.client);
    this.ai = new AiModule(this.client);
    this.sms = new SmsModule(this.client);
  }

  getAppId(): string {
    return this.client.getAppId();
  }

  getEnvironment(): 'preview' | 'test' | 'production' {
    return this.client.getEnvironment();
  }

  setEnvironment(environment: 'preview' | 'test' | 'production'): void {
    this.client.setEnvironment(environment);
  }
}

export { IntegrationClient } from './client';
export { EmailModule } from './email';
export { PaymentsModule } from './payments';
export { StorageModule } from './storage';
export { AiModule } from './ai';
export { SmsModule } from './sms';
export * from './types';
