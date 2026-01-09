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

Service discovery. Returns the list of available endpoints with `paymentRequired` and `price` (null when free).

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

### Alex Lab DEX analytics (AI-enhanced)

#### POST /api/alex/swap-optimizer

{: .paid }
> Price: `0.005 STX`

AI-powered swap route optimization. Analyzes all possible routes, calculates slippage and fees, and recommends optimal execution strategy.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tokenIn` | string | yes | Input token symbol (e.g., `STX`, `ALEX`). |
| `tokenOut` | string | yes | Output token symbol. |
| `amountIn` | number | yes | Amount of input token to swap. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"tokenIn":"STX","tokenOut":"ALEX","amountIn":100}' \
  https://<your-worker-domain>/api/alex/swap-optimizer
```

#### POST /api/alex/pool-risk

{: .paid }
> Price: `0.008 STX`

LP position risk analyzer. Calculates impermanent loss scenarios and assesses pool sustainability.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `poolId` | string | yes | Pool contract identifier. |
| `investmentAmount` | number | no | Investment amount in USD for IL calculations. Defaults to `1000`. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"poolId":"SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-stx-alex","investmentAmount":5000}' \
  https://<your-worker-domain>/api/alex/pool-risk
```

#### GET /api/alex/arbitrage-scan

{: .paid }
> Price: `0.01 STX`

Cross-pool arbitrage scanner. Finds price discrepancies across Alex pools and calculates profitable arbitrage paths.

```bash
curl -s \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  https://<your-worker-domain>/api/alex/arbitrage-scan
```

#### GET /api/alex/market-regime

{: .paid }
> Price: `0.005 STX`

Market regime detector. Classifies current market conditions (trending up/down, ranging, volatile, quiet) with AI analysis.

```bash
curl -s \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  https://<your-worker-domain>/api/alex/market-regime
```

### Zest Protocol lending analytics (AI-enhanced)

#### POST /api/zest/liquidation-risk

{: .paid }
> Price: `0.008 STX`

Liquidation risk monitor. Simulates price scenarios and predicts liquidation probability with AI recommendations.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address. |
| `collateralAsset` | string | yes | Collateral asset symbol (e.g., `STX`, `sBTC`). |
| `collateralAmount` | number | yes | Amount of collateral. |
| `debtAsset` | string | yes | Debt asset symbol (e.g., `aeUSDC`). |
| `debtAmount` | number | yes | Amount of debt. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D","collateralAsset":"STX","collateralAmount":1000,"debtAsset":"aeUSDC","debtAmount":500}' \
  https://<your-worker-domain>/api/zest/liquidation-risk
```

#### POST /api/zest/yield-optimizer

{: .paid }
> Price: `0.008 STX`

Lending yield optimizer. Analyzes all Zest markets and recommends optimal supply/borrow strategies.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `capitalUsd` | number | yes | Capital available in USD. |
| `riskTolerance` | string | yes | One of `conservative`, `moderate`, `aggressive`. |
| `preferredAssets` | string[] | no | List of preferred asset symbols. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"capitalUsd":10000,"riskTolerance":"moderate"}' \
  https://<your-worker-domain>/api/zest/yield-optimizer
```

#### GET /api/zest/interest-forecast

{: .paid }
> Price: `0.005 STX`

Interest rate forecaster. Predicts rate movements for the next 24h-7d based on utilization trends.

```bash
curl -s \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  https://<your-worker-domain>/api/zest/interest-forecast
```

#### POST /api/zest/position-health

{: .paid }
> Price: `0.005 STX`

Position health analyzer. Comprehensive health check with AI rebalancing recommendations.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address. |
| `positions` | array | yes | Array of `{asset, supplied, borrowed}` objects. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D","positions":[{"asset":"STX","supplied":1000,"borrowed":200}]}' \
  https://<your-worker-domain>/api/zest/position-health
```

### Cross-protocol DeFi intelligence (AI-enhanced)

#### POST /api/defi/portfolio-analyzer

{: .paid }
> Price: `0.015 STX`

DeFi portfolio intelligence. Analyzes combined Alex LP + Zest lending positions with correlation risk assessment and optimization recommendations.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | yes | Stacks wallet address. |
| `alexPositions` | array | no | Array of Alex LP positions: `{poolId, lpTokens, token0Symbol, token1Symbol}`. |
| `zestPositions` | array | no | Array of Zest positions: `{asset, supplied, borrowed}`. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"address":"SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D","alexPositions":[{"poolId":"SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-stx-alex","lpTokens":1000000000,"token0Symbol":"STX","token1Symbol":"ALEX"}],"zestPositions":[{"asset":"STX","supplied":5000,"borrowed":1000}]}' \
  https://<your-worker-domain>/api/defi/portfolio-analyzer
```

#### POST /api/defi/strategy-builder

{: .paid }
> Price: `0.02 STX`

AI strategy builder. Generates complete DeFi strategy across Alex and Zest with step-by-step execution plan.

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `capitalUsd` | number | yes | Capital available in USD. |
| `riskTolerance` | string | yes | One of `conservative`, `moderate`, `aggressive`. |
| `goals` | string[] | yes | Array of goals: `yield`, `growth`, `hedge`, `income`. |
| `timeHorizon` | string | yes | One of `short`, `medium`, `long`. |
| `preferences` | object | no | Optional: `{preferredAssets, avoidAssets, maxLeverage}`. |

```bash
curl -s \
  -X POST \
  -H "content-type: application/json" \
  -H "x-payment: <signed_stacks_transaction_hex>" \
  -d '{"capitalUsd":10000,"riskTolerance":"moderate","goals":["yield","growth"],"timeHorizon":"medium"}' \
  https://<your-worker-domain>/api/defi/strategy-builder
```
