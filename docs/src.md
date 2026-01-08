---
title: Source Documentation
nav_order: 3
---

# Source Documentation

## Architecture overview

Request flow:

1. `src/worker.ts` receives the request and matches the route.
2. `src/config.ts` builds runtime configuration (network, addresses, URLs).
3. Paid endpoints call `src/utils/payment.ts` to enforce x402 payment settlement; free external data endpoints skip this step.
4. Service modules fetch data or run AI analysis, then `src/utils/response.ts` returns a normalized JSON response.

Key components:

- **Worker entry**: single `fetch` handler that routes to endpoint handlers.
- **Payment enforcement**: creates 402 requirements, settles signed transactions via the facilitator, and embeds settlement info in responses for paid routes.
- **AI services**: OpenRouter-backed analysis for news, audits, sentiment, and wallet classification.
- **Market data**: Tenero API client plus domain-specific wrappers.
- **Stacks data**: Hiro API lookups for contract source and wallet metrics.

## Runtime configuration

Environment variables loaded by `createRuntimeConfig`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SERVER_ADDRESS` | yes | Stacks address that receives payments. |
| `NETWORK` | no | `mainnet` or `testnet` (defaults to `testnet`). |
| `OPENROUTER_API_KEY` | yes (for AI routes) | OpenRouter API key for AI services. |
| `FACILITATOR_URL` | no | Custom x402 facilitator URL. |

## Function reference

| File | Export | Purpose |
| --- | --- | --- |
| `src/config.ts` | `createRuntimeConfig` | Build runtime settings from env, network, and defaults. |
| `src/types.ts` | Types | Shared types for x402 responses and API envelopes. |
| `src/utils/response.ts` | `jsonResponse` | Serialize JSON with consistent headers. |
| `src/utils/response.ts` | `sendSuccess` | Return `success: true` with optional settlement data. |
| `src/utils/response.ts` | `sendError` | Return `success: false` with structured errors. |
| `src/utils/payment.ts` | `toMinorUnits` | Convert token amounts to minor units for payment validation. |
| `src/utils/payment.ts` | `createPaymentRequiredResponse` | Generate a 402 response with x402 requirements. |
| `src/utils/payment.ts` | `requirePayment` | Validate `x-payment` and settle via facilitator. |
| `src/services/openrouter.service.ts` | `initOpenRouter` | Initialize the OpenRouter client with the API key. |
| `src/services/openrouter.service.ts` | `getOpenRouter` | Retrieve the initialized OpenRouter client. |
| `src/services/news.service.ts` | `getStacksAndBitcoinNews` | Use OpenRouter to summarize recent Stacks/Bitcoin news. |
| `src/services/audit.service.ts` | `performSecurityAudit` | AI-driven Clarity contract security audit. |
| `src/services/wallet.service.ts` | `classifyWallet` | Fetch wallet metrics and classify behavior. |
| `src/services/research.service.ts` | `researchUser` | AI-backed X/Twitter user research. |
| `src/services/sentiment.service.ts` | `analyzeSentiment` | AI sentiment analysis for user-supplied topics. |
| `src/services/stacks.service.ts` | `getStacksApiUrl` | Resolve Hiro API base URL for a network. |
| `src/services/stacks.service.ts` | `getContractSource` | Fetch Clarity contract source from Hiro. |
| `src/services/tenero/client.ts` | `TeneroApiError` | Custom error type for Tenero API failures. |
| `src/services/tenero/client.ts` | `teneroFetch` | Wrapper for Tenero API calls with error handling. |
| `src/services/tenero-market.service.ts` | `getMarketStats` | Market statistics (volume, pools, traders). |
| `src/services/tenero-market.service.ts` | `getTopGainers` | Top gainers by price change. |
| `src/services/tenero-market.service.ts` | `getTopLosers` | Top losers by price change. |
| `src/services/tenero-market.service.ts` | `getWhaleTrades` | Recent large trades (whales). |
| `src/services/tenero-market.service.ts` | `getHourlyNetflow` | Hourly net flow across markets. |
| `src/services/tenero-pools.service.ts` | `getTrendingPools` | Trending pool activity by timeframe. |
| `src/services/tenero-pools.service.ts` | `getPoolOhlc` | OHLCV series for a pool. |
| `src/services/tenero-tokens.service.ts` | `getTokenSummary` | Market-weighted token summary. |
| `src/services/tenero-tokens.service.ts` | `getTokenProfile` | Token profile and metadata. |
| `src/services/tenero-tokens.service.ts` | `getTokenDetails` | Full token details (supply, holders, metrics). |
| `src/services/tenero-wallets.service.ts` | `analyzeWalletTrading` | AI-enhanced wallet trading behavior. |
| `src/services/tenero-wallets.service.ts` | `analyzeWalletPnl` | AI-enhanced wallet PnL analysis. |

## Architectural notes

- Every paid route funnels through `requirePayment`, so payment validation is consistent across the API. Free market data routes bypass payment checks and do not return settlement metadata.
- Service modules isolate external dependencies (OpenRouter, Hiro, Tenero) and keep worker routing thin.
- API responses are intentionally normalized so clients can check `success` before inspecting `data`.
