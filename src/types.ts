export interface NuclicoreIntegrationsConfig {
  appId?: string;
  apiKey?: string;
  gatewayUrl?: string;
  environment?: 'preview' | 'test' | 'production';
  label?: string;
}

export interface IntegrationResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  data: string;
  /** MIME type, e.g. 'application/pdf'. Optional but recommended. */
  contentType?: string;
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
  /** Optional file attachments (each `data` must be base64-encoded). */
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  messageId: string;
}

export interface SendSmsParams {
  /** One or more recipient numbers in E.164 format, e.g. '+4915123456789'. */
  to: string | string[];
  message: string;
  /**
   * Sender ID — an alphanumeric sender (e.g. 'LTA') or a provisioned phone
   * number. Optional if a default sender is configured for the app.
   * Alphanumeric senders are one-way only and must be enabled per-country
   * in the Azure Communication Services resource.
   */
  from?: string;
  /** Request an async delivery report from the provider. */
  enableDeliveryReport?: boolean;
  /** Optional caller-defined tag echoed back on delivery reports. */
  tag?: string;
}

export interface SmsRecipientResult {
  to: string;
  messageId?: string;
  successful: boolean;
  httpStatusCode?: number;
  errorMessage?: string;
}

export interface SendSmsResult {
  /** Per-recipient send outcome. Inspect `successful` for each number. */
  results: SmsRecipientResult[];
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

export interface UploadParams {
  path: string;
  file: Buffer | Blob | ArrayBuffer;
  contentType: string;
}

export interface UploadResult {
  url: string;
  size: number;
  path: string;
}

export interface DownloadParams {
  path: string;
}

export interface StorageDownloadResult {
  buffer: Buffer;
  contentType?: string;
}

export interface DeleteParams {
  path: string;
}

export interface ListParams {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface FileEntry {
  path: string;
  size: number;
  contentType: string;
  lastModified: string;
}

export interface ListResult {
  files: FileEntry[];
  nextCursor?: string;
}

export interface SignedUrlParams {
  path: string;
  permission?: 'read' | 'write';
  expiresIn?: number;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  model?: string;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamParams extends ChatParams {
  onChunk: (chunk: string) => void;
}

export interface EmbedParams {
  input: string | string[];
  model?: string;
  provider?: string;
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}
