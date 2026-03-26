export interface NuclicoreIntegrationsConfig {
  appId?: string;
  apiKey?: string;
  gatewayUrl?: string;
  environment?: 'preview' | 'production';
}

export interface IntegrationResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  template?: string;
  variables?: Record<string, string>;
}

export interface SendEmailResult {
  messageId: string;
}

export interface LineItem {
  name: string;
  description?: string;
  amount: number;
  quantity: number;
  currency?: string;
}

export interface CreateCheckoutParams {
  lineItems: LineItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}
