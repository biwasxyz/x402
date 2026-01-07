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

## Client test script

- Set `CLIENT_MNEMONIC` in `.env`; optional overrides: `API_URL` (default `http://localhost:8787`), `NETWORK` (`mainnet` or `testnet`).
- For POST endpoints provide payload via `REQUEST_BODY='{"field":"value"}'` or env: `AUDIT_CONTRACT_ID`, `WALLET_ADDRESS`, `RESEARCH_USERNAME`, `SENTIMENT_TOPIC`.
- Run with `npm run test:client -- /api/news` (path argument defaults to `/api/news`; `METHOD` can override the inferred method).
- The script logs a JSON blob containing the raw response body plus the `x-payment-response` header (decoded when present).

### Bun endpoint probes

- Requires `CLIENT_MNEMONIC` in `.env` (plus `API_URL`/`NETWORK` if you want to override defaults).
- Examples (default `API_URL=http://localhost:8787`, `NETWORK=testnet`):
  - `bun run scripts/news.ts`
  - `bun run scripts/audit.ts <contractIdentifier>`
  - `bun run scripts/wallet-classify.ts <address>`
  - `bun run scripts/research-user.ts <username>`
  - `bun run scripts/sentiment.ts <topic>`

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
