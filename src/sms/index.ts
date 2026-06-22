import type { IntegrationClient } from '../client';
import type {
  SendSmsParams,
  SendSmsResult,
  IntegrationResponse,
} from '../types';

export class SmsModule {
  private client: IntegrationClient;

  constructor(client: IntegrationClient) {
    this.client = client;
  }

  async send(
    params: SendSmsParams,
  ): Promise<IntegrationResponse<SendSmsResult>> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    if (recipients.length === 0 || recipients.some((r) => !r)) {
      return { success: false, error: 'At least one recipient (to) is required' };
    }

    if (!params.message) {
      return { success: false, error: 'Message is required' };
    }

    return this.client.request<SendSmsResult>('/v1/sms/send', {
      ...params,
      to: recipients,
    });
  }
}
