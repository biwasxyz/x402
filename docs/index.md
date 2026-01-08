---
title: Home
nav_order: 1
---

# x402-stacks API

A Cloudflare Worker that exposes paid, x402-protected AI analytics plus free market data endpoints for Stacks and Bitcoin. Free routes include service status, discovery, and Tenero market data, while paid routes enforce on-chain settlement in STX or sBTC.

{: .free }
> Free endpoints (`/`, `/health`, and Tenero market data routes under `/api/market`, `/api/pools`, `/api/tokens`) do not require a payment header.

{: .paid }
> Paid endpoints require an `x-payment` header with a signed Stacks transaction that satisfies the 402 payment request.

## Quick start

### 1) Health check

```bash
curl -s https://<your-worker-domain>/health
```

### 2) Request payment requirements (paid endpoints)

```bash
curl -i https://<your-worker-domain>/api/news
```

Expect a `402` response with the x402 payload:

```json
{
  "maxAmountRequired": "1000",
  "resource": "/api/news",
  "payTo": "SP...",
  "network": "testnet",
  "nonce": "...",
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "tokenType": "STX",
  "facilitatorUrl": "https://facilitator.x402stacks.xyz"
}
```

### 3) Pay and retry the request

Once you sign and broadcast the payment transaction, send the signed transaction bytes in the `x-payment` header.

```bash
curl -s \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  https://<your-worker-domain>/api/news
```

### 4) POST example

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"contractIdentifier":"SP3FBR2AGK...swap"}' \
  https://<your-worker-domain>/api/audit
```

## What you get

- AI-assisted analytics for Stacks wallets, contracts, and market activity.
- Free market data from the Tenero API (formerly STXTools).
- AI summaries and sentiment analysis powered by OpenRouter models.
- x402 payment enforcement with explicit settlement metadata in responses.

## Next steps

- Read the full API reference in [API Reference](api.md).
- Explore architecture and function references in [Source Documentation](src.md).
