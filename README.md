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

## Environment Variables

Set these in your `.env` file:

```env
NUCLICORE_APP_ID=your-app-id
NUCLICORE_INTEGRATION_KEY=your-integration-key
NUCLICORE_GATEWAY_URL=https://integrations.nuclicore.com
```

## License

MIT
