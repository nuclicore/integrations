export interface NuclicoreIntegrationsConfig {
  appId?: string;
  apiKey?: string;
  gatewayUrl?: string;
  environment?: 'preview' | 'test' | 'production';
  label?: string;
}

export type IntegrationErrorCode = 'request_too_large' | 'timeout' | 'content_filtered' | 'provider_unreachable' | 'provider_error' | 'unsupported_content' | 'budget_exceeded' | 'model_not_enabled' | 'not_priced' | 'not_configured' | 'gateway_error' | 'validation';

export interface IntegrationResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: IntegrationErrorCode | string;
  status?: number;
  providerStatus?: number;
  details?: Record<string, unknown>;
}

export interface RequestOptions {
  timeoutMs?: number;
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

export interface TransferUrlResult extends SignedUrlResult {
  blobUrl: string;
  path: string;
}

export const CHAT_REQUEST_LIMIT_BYTES = 134217728;

export type ChatContentPart = { type: 'text'; text: string } | { type: 'file'; mimeType: string; data: string };

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string | ChatContentPart[] }

export const AI_PROVIDERS = ['anthropic', 'openai', 'google', 'deepseek', 'kimi', 'azure-openai', 'azure-anthropic', 'azure-kimi', 'azure-deepseek'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface ChatParams { messages: ChatMessage[]; model?: string; provider?: AiProvider | (string & {}); maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number }

export interface ChatResult { content: string; model: string; usage: { inputTokens: number; outputTokens: number }; finishReason?: string | null; raw?: unknown }

export interface StreamParams extends ChatParams {
  onChunk: (chunk: string) => void;
}

export interface EmbedParams {
  input: string | string[];
  model?: string;
  provider?: AiProvider | (string & {});
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}
