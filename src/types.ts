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
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}
