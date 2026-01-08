---
title: API Reference
nav_order: 2
---

# API Reference

## Base URL

All examples assume:

```
https://<your-worker-domain>
```

## Authentication and payment (x402)

Paid endpoints require the `x-payment` header. If the header is missing or invalid, the API responds with `402` and the payment requirements. Free endpoints (market data and pool/token lookups backed by free external APIs) do not require payment.

### Payment flow

1. Call a paid endpoint without `x-payment`.
2. Receive the `402` response describing the required payment.
3. Create and sign a Stacks transaction that pays `payTo` at least `maxAmountRequired`.
4. Submit the signed transaction bytes in the `x-payment` header.
5. The worker settles the payment via the facilitator and returns a normal `200` response (with settlement data).

### 402 response schema

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

Field definitions:

| Field | Description |
| --- | --- |
| `maxAmountRequired` | Amount in microSTX (or micro-sBTC) required to satisfy the request. |
| `resource` | Endpoint path that requires payment. |
| `payTo` | Stacks address that must receive the payment. |
| `network` | `mainnet` or `testnet`. |
| `nonce` | Unique identifier for the payment request. |
| `expiresAt` | RFC3339 timestamp after which the payment request expires. |
| `tokenType` | `STX` (default) or `sBTC`. |
| `facilitatorUrl` | Settlement service used to verify the transaction. |

### Response envelope

All successful responses wrap data in a standard envelope. Paid endpoints also include settlement metadata:

```json
{
  "success": true,
  "data": { "...": "..." },
  "settlement": { "tx_id": "...", "status": "confirmed" }
}
```

Free endpoints omit the `settlement` field.

Errors are returned as:

```json
{
  "success": false,
  "error": {
    "message": "...",
    "code": "PAYMENT_INVALID",
    "details": "..."
  }
}
```

## Free endpoints

{: .free }
> These endpoints never require payment.

### GET /

Service discovery. Returns the list of available endpoints and their prices (price `0` means free).

```bash
curl -s https://<your-worker-domain>/
```

### GET /health

Health check.

```bash
curl -s https://<your-worker-domain>/health
```

### Tenero market data

#### GET /api/market/stats

{: .free }
> Free (no payment required).

Returns Stacks DeFi market statistics.

```bash
curl -s https://<your-worker-domain>/api/market/stats
```

#### GET /api/market/gainers

{: .free }
> Free (no payment required).

Query parameters:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | number | `10` | Max results (capped at 50). |

```bash
curl -s "https://<your-worker-domain>/api/market/gainers?limit=10"
```

#### GET /api/market/losers

{: .free }
> Free (no payment required).

Query parameters:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | number | `10` | Max results (capped at 50). |

```bash
curl -s "https://<your-worker-domain>/api/market/losers?limit=10"
```

#### GET /api/market/whales

{: .free }
> Free (no payment required).

Query parameters:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | number | `20` | Max results (capped at 100). |

```bash
curl -s "https://<your-worker-domain>/api/market/whales?limit=20"
```

#### GET /api/market/netflow

{: .free }
> Free (no payment required).

Returns hourly net flows of funds in/out of the market.

```bash
curl -s https://<your-worker-domain>/api/market/netflow
```

### Tenero pools and tokens

#### GET /api/pools/trending

{: .free }
> Free (no payment required).

Query parameters:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `timeframe` | string | `1d` | One of `1h`, `4h`, `1d`, `24h`, `7d`. |

```bash
curl -s "https://<your-worker-domain>/api/pools/trending?timeframe=1d"
```

#### POST /api/pools/ohlc

{: .free }
> Free (no payment required).

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `poolId` | string | yes | Pool identifier. |
| `period` | string | no | `1m`, `5m`, `15m`, `1h`, `4h`, `1d`. |
| `limit` | number | no | Max results (capped at 1000). |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -d '{"poolId":"SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-leo-stx-v-1-1","period":"1h","limit":200}' \
  https://<your-worker-domain>/api/pools/ohlc
```

#### POST /api/tokens/summary

{: .free }
> Free (no payment required).

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tokenAddress` | string | yes | Token contract address. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -d '{"tokenAddress":"SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc"}' \
  https://<your-worker-domain>/api/tokens/summary
```

#### POST /api/tokens/details

{: .free }
> Free (no payment required).

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tokenAddress` | string | yes | Token contract address. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -d '{"tokenAddress":"SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc"}' \
  https://<your-worker-domain>/api/tokens/details
```

## Paid endpoints

{: .paid }
> Paid endpoints require a valid `x-payment` header.

### AI-powered analytics

#### GET /api/news

{: .paid }
> Price: `0.001 STX`

Returns a concise AI summary of Stacks and Bitcoin news.

```bash
curl -s \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  https://<your-worker-domain>/api/news
```

#### POST /api/audit

{: .paid }
> Price: `0.02 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contractIdentifier` | string | yes | `ADDRESS.CONTRACT_NAME` identifier for the Clarity contract. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"contractIdentifier":"SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc"}' \
  https://<your-worker-domain>/api/audit
```

#### POST /api/wallet/classify

{: .paid }
> Price: `0.005 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address to classify. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D"}' \
  https://<your-worker-domain>/api/wallet/classify
```

#### POST /api/research/user

{: .paid }
> Price: `0.005 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | yes | X/Twitter username (with or without `@`). |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"username":"stacks"}' \
  https://<your-worker-domain>/api/research/user
```

#### POST /api/sentiment

{: .paid }
> Price: `0.005 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `topic` | string | no | Topics or tokens to analyze. Defaults to Stacks/Bitcoin ecosystem if omitted. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"topic":"sBTC, STX"}' \
  https://<your-worker-domain>/api/sentiment
```

### Wallet analytics (AI-enhanced)

#### POST /api/wallet/trading

{: .paid }
> Price: `0.005 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address to analyze. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D"}' \
  https://<your-worker-domain>/api/wallet/trading
```

#### POST /api/wallet/pnl

{: .paid }
> Price: `0.005 STX`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address to analyze. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D"}' \
  https://<your-worker-domain>/api/wallet/pnl
```
