# @nuclicore/integrations

Official integration SDK for NUCLICORE generated applications. Provides seamless access to email (Mailgun) and payment (Stripe) services through the NUCLICORE Integration Gateway.

## Installation

```bash
yarn add @nuclicore/integrations
# or
npm install @nuclicore/integrations
```

## Quick Start

```typescript
import { NuclicoreIntegrations } from '@nuclicore/integrations';

const integrations = new NuclicoreIntegrations({
  appId: process.env.NUCLICORE_APP_ID,
  apiKey: process.env.NUCLICORE_INTEGRATION_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'preview',
});

// Send email
const emailResult = await integrations.email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello World</h1>',
});

// Create payment checkout
const checkoutResult = await integrations.payments.createCheckout({
  lineItems: [{ name: 'Product', amount: 2000, quantity: 1 }],
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cancel',
});

if (checkoutResult.success) {
  // Redirect user to checkoutResult.data.checkoutUrl
}
```

## Configuration

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `appId` | Yes | - | Your NUCLICORE application ID |
| `apiKey` | No | - | Integration API key (optional for preview) |
| `gatewayUrl` | No | `https://integrations.nuclicore.com` | Integration gateway URL |
| `environment` | No | `preview` | `'preview'` or `'production'` |

## Email API

### `integrations.email.send(params)`

Send an email via Mailgun.

```typescript
interface SendEmailParams {
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
```

## Payments API

### `integrations.payments.createCheckout(params)`

Create a Stripe checkout session.

```typescript
interface CreateCheckoutParams {
  lineItems: Array<{
    name: string;
    description?: string;
    amount: number; // in cents
    quantity: number;
    currency?: string; // default: 'usd'
  }>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
}
```

## AI API

### `integrations.ai.chat(params)`

Every call goes through the gateway to the AI provider configured for your app. The two fields that decide where a call lands:

- `provider` (optional): one of `anthropic`, `openai`, `google`, `deepseek`, `kimi`, `azure-openai`, `azure-anthropic`, `azure-kimi`, `azure-deepseek` (exported as `AI_PROVIDERS` / `AiProvider`). Without it the gateway uses the app's default AI provider: the one marked primary (set by the platform when the AI integration was enabled), else the enabled provider that has models enabled under Integrations → AI, else the oldest enabled one, else `openai`. An app that has models enabled on one provider and nothing on another always lands on the one with models.
- `model` (optional): the model name exactly as it appears in Integrations → AI for that provider. For `azure-*` providers this is the Azure deployment name (for example `gpt-6-luna`), not the upstream model id. Without it the provider's default model is used (`gpt-5.5` for `openai` / `azure-openai`, `claude-haiku-4-5` for `anthropic` / `azure-anthropic`, `gemini-3.5-flash` for `google`).

Name both whenever a call depends on a specific model. Every model you name must be enabled for the app under Integrations → AI; a model that is not enabled answers `code: 'model_not_enabled'` with `error` naming the model and provider, and never reaches the provider.

```typescript
const result = await integrations.ai.chat({
  provider: 'azure-openai',
  model: 'gpt-6-luna',
  messages: [
    { role: 'system', content: 'You extract invoice totals.' },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is the total of this invoice?' },
        { type: 'file', mimeType: 'application/pdf', data: pdfBuffer.toString('base64') },
      ],
    },
  ],
  maxTokens: 1024,
  timeoutMs: 120000,
});

if (result.success) {
  console.log(result.data?.content, result.data?.finishReason);
} else {
  console.error(result.code, result.error, result.status, result.details);
}
```

Message `content` is either a string or an array of parts. File parts carry base64 data with a MIME type, so PDFs and images go straight to the model.

#### Sampling parameters per provider

| Parameter | `openai`, `azure-openai`, `deepseek`, `kimi`, `azure-*` on the OpenAI wire | `anthropic`, `azure-anthropic` | `google` |
|---|---|---|---|
| `maxTokens` | Sent as `max_completion_tokens` for reasoning models (`gpt-5` and later, o-series) and `max_tokens` otherwise | `max_tokens` (a per-model default applies when omitted) | `maxOutputTokens` |
| `temperature` (0..2) | Forwarded; reasoning models reject it | Forwarded | Forwarded |
| `topP` (0..1) | Forwarded; reasoning models reject it | Forwarded | Forwarded |

Reasoning models (OpenAI `gpt-5` and later, the o-series, and Azure deployments of them under any deployment name) accept only their default sampling and reject `temperature` and `topP`. When a provider rejects a parameter (`unsupported_parameter` / `unsupported_value`), the gateway re-sends the call once without that parameter (or with `max_tokens` renamed to `max_completion_tokens`), so the call still succeeds, at the cost of one extra provider round trip within the same `timeoutMs`. Leave `temperature` and `topP` out for those models and rely on `maxTokens` plus the prompt.

- `timeoutMs` (`15000`..`280000`, default `180000`) is the model deadline, measured by the gateway from the moment it receives the request; the SDK aborts the HTTP call 10 s after it and returns `code: 'timeout'`. Above `280000` the gateway answers a `validation` error (the ceiling keeps the SDK's abort under Node's 300 s default body timeout).
- File part `data` must be standard base64 without line breaks or a `data:` prefix.
- Requests larger than `CHAT_REQUEST_LIMIT_BYTES` (128 MiB) and malformed file parts are refused locally without a network call.
- `finishReason` (`null` when the provider sent none) and the provider's `raw` response come back next to `content`.

`ai.chat` failures never throw; they return `success: false` with a `code`. The other modules keep the 3.0 behaviour: a network failure or a non-JSON reply rejects, and a JSON error returns `{ success: false, error }`.

| `code` | Meaning |
|--------|---------|
| `validation` | Invalid parameters (local check or gateway validation) |
| `request_too_large` | Request exceeds the size limit (`details.bytes`, `details.limitBytes`) |
| `unsupported_content` | The model does not accept this file type (`details.mimeType`) |
| `timeout` | The model or the gateway ran out of time |
| `content_filtered` | The provider blocked the prompt or answer |
| `provider_unreachable` | The provider or the gateway could not be reached |
| `provider_error` | The provider returned an error; `error` carries the provider's own message (for example an unsupported parameter it still rejected) and `result.providerStatus` its HTTP status when it answered with one |
| `budget_exceeded` | The app's AI budget for this month is used up |
| `model_not_enabled` | The model is not enabled for this app under Integrations → AI (`error` names the model and provider) |
| `not_priced` | The model has no price configured |
| `not_configured` | No credentials for the selected provider on this app: a `provider` nobody configured, or a default provider whose credentials were never set |
| `gateway_error` | Any other gateway failure (`status` holds the HTTP status) |

## Environment Variables

Set these in your `.env` file:

```env
NUCLICORE_APP_ID=your-app-id
NUCLICORE_INTEGRATION_KEY=your-integration-key
NUCLICORE_GATEWAY_URL=https://integrations.nuclicore.com
```

## License

MIT

## Storage transfers in v3

`storage.upload` and `storage.download` move file bytes directly between your app and the storage account: the SDK asks the gateway for a short-lived signed URL (`POST /v1/storage/upload-url` / `download-url`, charged like the classic upload/download) and then transfers the bytes itself, so large files never pass through the gateway. Both methods keep the v2 return shapes and fall back to the classic gateway routes automatically when talking to an older gateway or when a file lives in a legacy layout.
