import type { IntegrationClient } from '../client';
import type {
  CreateCheckoutParams,
  CreateCheckoutResult,
  IntegrationResponse,
} from '../types';

export class PaymentsModule {
  private client: IntegrationClient;

  constructor(client: IntegrationClient) {
    this.client = client;
  }

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<IntegrationResponse<CreateCheckoutResult>> {
    if (!params.lineItems || params.lineItems.length === 0) {
      return { success: false, error: 'At least one line item is required' };
    }

    if (!params.successUrl) {
      return { success: false, error: 'Success URL is required' };
    }

    if (!params.cancelUrl) {
      return { success: false, error: 'Cancel URL is required' };
    }

    for (const item of params.lineItems) {
      if (!item.name) {
        return { success: false, error: 'Line item name is required' };
      }
      if (item.amount <= 0) {
        return { success: false, error: 'Line item amount must be positive' };
      }
      if (item.quantity <= 0) {
        return { success: false, error: 'Line item quantity must be positive' };
      }
    }

    return this.client.request<CreateCheckoutResult>(
      '/v1/payments/create-checkout',
      params,
    );
  }
}
