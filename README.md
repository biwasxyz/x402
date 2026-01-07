# x402

Cloudflare Worker that exposes the x402-protected API endpoints for news, audits, wallet classification, user research, and sentiment analysis.

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the Cloudflare Worker locally:

```bash
npm run dev
```

This uses `wrangler dev` and serves the Worker defined in `src/worker.ts`. The same command replaces the old Express entrypoint.

## Project Structure

- `src/worker.ts` – Cloudflare Worker entrypoint that routes every API request.
- `src/endpoints/` – Implementation for each paid/free endpoint (news, audit, wallet, research, sentiment, docs, health).
- `src/services/` – Integrations with OpenRouter, Hiro, and supporting APIs.
- `src/utils/` – Shared helpers for responses and payment verification.
