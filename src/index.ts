import { IntegrationClient } from './client';
import { EmailModule } from './email';
import { PaymentsModule } from './payments';
import type { NuclicoreIntegrationsConfig } from './types';

export class NuclicoreIntegrations {
  private client: IntegrationClient;

  public readonly email: EmailModule;
  public readonly payments: PaymentsModule;

  constructor(config: NuclicoreIntegrationsConfig = {}) {
    this.client = new IntegrationClient(config);
    this.email = new EmailModule(this.client);
    this.payments = new PaymentsModule(this.client);
  }

  getAppId(): string {
    return this.client.getAppId();
  }

  getEnvironment(): 'preview' | 'production' {
    return this.client.getEnvironment();
  }

  setEnvironment(environment: 'preview' | 'production'): void {
    this.client.setEnvironment(environment);
  }
}

export { IntegrationClient } from './client';
export { EmailModule } from './email';
export { PaymentsModule } from './payments';
export * from './types';
