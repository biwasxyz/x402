# x402-stacks API

Cloudflare Worker implementing the x402-stacks payment protocol for AI-powered Stacks blockchain analytics.

Payments are made in STX or sBTC on the Stacks blockchain.

## Endpoints

All paid endpoints return HTTP 402 with x402-stacks payment requirements when no payment is provided.

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/news` | GET | 0.001 STX | Latest Stacks and Bitcoin news |
| `/api/audit` | POST | 0.02 STX | Clarity smart contract security audit |
| `/api/wallet/classify` | POST | 0.005 STX | Wallet behavior classification |
| `/api/research/user` | POST | 0.005 STX | X/Twitter user research |
| `/api/sentiment` | POST | 0.005 STX | Crypto sentiment analysis |
| `/health` | GET | Free | Health check |

## Development

```bash
npm install
npm run dev
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

- `src/worker.ts` - Cloudflare Worker with x402-stacks payment handling
- `src/services/` - AI and blockchain service integrations
- `src/utils/` - Payment verification and response helpers
