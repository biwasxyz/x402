# x402-stacks API

Cloudflare Worker implementing the x402-stacks payment protocol for AI-powered Stacks blockchain analytics.

Payments are made in STX or sBTC on the Stacks blockchain.

## Endpoints

Paid endpoints return HTTP 402 with x402-stacks payment requirements when no payment is provided. Free endpoints (Tenero market data, pools, and token lookups) do not require payment.

### AI-Powered Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/news` | GET | 0.001 STX | Latest Stacks and Bitcoin news |
| `/api/audit` | POST | 0.02 STX | Clarity smart contract security audit |
| `/api/wallet/classify` | POST | 0.005 STX | Wallet behavior classification |
| `/api/research/user` | POST | 0.005 STX | X/Twitter user research |
| `/api/sentiment` | POST | 0.005 STX | Crypto sentiment analysis |

### Tenero Market Data (Free)

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/market/stats` | GET | Free | Stacks DeFi market statistics |
| `/api/market/gainers` | GET | Free | Top gaining tokens by price change |
| `/api/market/losers` | GET | Free | Top losing tokens by price change |
| `/api/market/whales` | GET | Free | Recent whale trades (large transactions) |
| `/api/market/netflow` | GET | Free | Hourly net flow of funds |

### Tenero Pools & Tokens (Free)

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/pools/trending` | GET | Free | Trending liquidity pools by activity |
| `/api/pools/ohlc` | POST | Free | Pool OHLCV candlestick data |
| `/api/tokens/summary` | POST | Free | Token market summary with weighted price |
| `/api/tokens/details` | POST | Free | Full token details (supply, holders) |

### Tenero Wallet Analytics (AI-Enhanced)

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/wallet/trading` | POST | 0.005 STX | AI-enhanced trading behavior analysis |
| `/api/wallet/pnl` | POST | 0.005 STX | AI-enhanced profit/loss analysis |

### Free Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info and endpoint list |
| `/health` | GET | Health check |

## Development

```bash
npm install
npm run dev
```

## Test Scripts

All scripts require `CLIENT_MNEMONIC` in `.env`. Optional: `API_URL` (default `http://localhost:8787`), `NETWORK` (`mainnet` or `testnet`).

### Generic Client

```bash
npm run test:client -- /api/news
```

For POST endpoints, provide payload via `REQUEST_BODY='{"field":"value"}'` or env vars.

### Bun Endpoint Probes

#### AI-Powered Endpoints

```bash
bun run scripts/news.ts
bun run scripts/audit.ts <contractIdentifier>
bun run scripts/wallet-classify.ts <address>
bun run scripts/research-user.ts <username>
bun run scripts/sentiment.ts [topic]
```

#### Market Data

```bash
bun run scripts/market-stats.ts
bun run scripts/market-gainers.ts [limit]
bun run scripts/market-losers.ts [limit]
bun run scripts/market-whales.ts [limit]
bun run scripts/market-netflow.ts
```

#### Pools & Tokens

```bash
bun run scripts/pools-trending.ts [1h|4h|1d|7d]
bun run scripts/pools-ohlc.ts <poolId> [period] [limit]
bun run scripts/tokens-summary.ts <tokenAddress>
bun run scripts/tokens-details.ts <tokenAddress>
```

#### Wallet Analytics (AI-Enhanced)

```bash
bun run scripts/wallet-trading.ts <address>
bun run scripts/wallet-pnl.ts <address>
```

### Example Addresses/IDs

```bash
# Token address
SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc

# Pool ID
SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-leo-stx-v-1-1

# Wallet address
SP2KZ24AM4X9HGTG8314MS4VSY1CVAFH0G1KBZZ1D
```

## Configuration

Environment variables:

- `SERVER_ADDRESS` - Your Stacks address (SP.../ST...) for receiving payments
- `NETWORK` - Network: "mainnet" or "testnet"
- `OPENROUTER_API_KEY` - OpenRouter API key for AI services (set via `wrangler secret put`)
- `FACILITATOR_URL` - x402-stacks facilitator URL (optional)

## Deployment

```bash
npm run deploy
```

## Project Structure

```
src/
├── worker.ts                      # Cloudflare Worker entry point
├── config.ts                      # Runtime configuration
├── types.ts                       # TypeScript interfaces
├── utils/
│   ├── payment.ts                 # x402 payment verification
│   └── response.ts                # Response helpers
└── services/
    ├── openrouter.service.ts      # OpenRouter AI client
    ├── stacks.service.ts          # Hiro Stacks API
    ├── news.service.ts            # News aggregation
    ├── audit.service.ts           # Contract security audit
    ├── wallet.service.ts          # Wallet classification
    ├── research.service.ts        # User research
    ├── sentiment.service.ts       # Sentiment analysis
    ├── tenero/
    │   ├── client.ts              # Tenero API client
    │   └── types.ts               # Tenero type definitions
    ├── tenero-market.service.ts   # Market data (stats, gainers, losers, whales)
    ├── tenero-pools.service.ts    # Pool data (trending, OHLC)
    ├── tenero-tokens.service.ts   # Token data (summary, details)
    └── tenero-wallets.service.ts  # AI-enhanced wallet analytics

scripts/
├── news.ts, audit.ts, etc.        # Original endpoint probes
├── market-*.ts                    # Market data probes
├── pools-*.ts                     # Pool data probes
├── tokens-*.ts                    # Token data probes
└── wallet-*.ts                    # Wallet analytics probes
```

## Data Sources

- **AI Analysis**: OpenRouter (Grok 4.1 Fast, Claude 3.5 Sonnet)
- **Market Data**: [Tenero API](https://docs.tenero.io/) (free public endpoints, formerly STXTools)
- **Blockchain Data**: [Hiro Stacks API](https://docs.hiro.so/stacks)
