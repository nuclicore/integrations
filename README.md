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

Message `content` is either a string or an array of parts. File parts carry base64 data with a MIME type, so PDFs and images go straight to the model.

```typescript
const result = await integrations.ai.chat({
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
  temperature: 0.2,
  topP: 0.9,
  maxTokens: 1024,
  timeoutMs: 120000,
});

if (result.success) {
  console.log(result.data.content, result.data.finishReason);
} else {
  console.error(result.code, result.error, result.status, result.details);
}
```

- `topP` sets nucleus sampling.
- `timeoutMs` (default `180000`) is the model deadline; the SDK aborts the HTTP call 10 s after it and returns `code: 'timeout'`.
- Requests larger than `CHAT_REQUEST_LIMIT_BYTES` (128 MiB) and malformed file parts are refused locally without a network call.
- `finishReason` and the provider's `raw` response come back next to `content`.

Failures never throw; they return `success: false` with a `code`:

| `code` | Meaning |
|--------|---------|
| `validation` | Invalid parameters (local check or gateway validation) |
| `request_too_large` | Request exceeds the size limit (`details.bytes`, `details.limitBytes`) |
| `unsupported_content` | The model does not accept this file type (`details.mimeType`) |
| `timeout` | The model or the gateway ran out of time |
| `content_filtered` | The provider blocked the prompt or answer |
| `provider_unreachable` | The provider or the gateway could not be reached |
| `provider_error` | The provider returned an error (the reply also carries `providerStatus`) |
| `budget_exceeded` | The app's AI budget for this month is used up |
| `model_not_enabled` | The model is not enabled for this app |
| `not_priced` | The model has no price configured |
| `not_configured` | The integration is not configured |
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
