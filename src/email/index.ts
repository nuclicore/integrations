import type { IntegrationClient } from '../client';
import type {
  SendEmailParams,
  SendEmailResult,
  IntegrationResponse,
} from '../types';

export class EmailModule {
  private client: IntegrationClient;

  constructor(client: IntegrationClient) {
    this.client = client;
  }

  async send(params: SendEmailParams): Promise<IntegrationResponse<SendEmailResult>> {
    if (!params.to) {
      return { success: false, error: 'Recipient (to) is required' };
    }

    if (!params.subject) {
      return { success: false, error: 'Subject is required' };
    }

    if (!params.text && !params.html && !params.template) {
      return { success: false, error: 'Either text, html, or template is required' };
    }

    return this.client.request<SendEmailResult>('/v1/email/send', params);
  }
}
