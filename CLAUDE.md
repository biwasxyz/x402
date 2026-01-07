# x402-stacks API - Claude Guidance

## Project Summary
Cloudflare Worker that implements the x402-stacks payment protocol for AI-powered Stacks analytics. Paid endpoints return HTTP 402 until a valid STX or sBTC payment is provided.

## Key Commands
- `npm install` - Install dependencies.
- `npm run dev` - Run the Worker locally (wrangler dev).
- `npm run deploy` - Deploy to Cloudflare.
- `npm run test:client -- /api/news` - Exercise a paid endpoint with the client script.
- `bun run scripts/<name>.ts` - Quick endpoint probes (requires `CLIENT_MNEMONIC`).

## Configuration
Environment variables (local or via `wrangler secret put`):
- `SERVER_ADDRESS` (Stacks address for payments)
- `NETWORK` (`mainnet` or `testnet`)
- `OPENROUTER_API_KEY`
- `FACILITATOR_URL` (optional)

## Code Layout
- `src/worker.ts` - Request routing and payment flow.
- `src/services/` - AI and blockchain service integrations.
- `src/utils/` - Payment verification and response helpers.

## Knowledge Base References
Use the local knowledge base for Stacks/Clarity and protocol guidance: `/Users/biwas/claudex402/claude-knowledge`.
Recommended files:
- `context/clarity-reference.md` for Clarity language reference.
- `decisions/0002-clarity-design-principles.md` for contract design rules.
- `patterns/clarity-testing.md` for testing tooling patterns.
- `runbook/clarity-development.md` for Clarity dev workflows and checklists.
- `context/siws-guide.md` and `context/sip-siws.md` for SIWS auth flows.
- `context/tenero-api.md` and `downloads/2025-01-06-tenero-openapi-spec.json` for market data APIs.

## Claude Workflow Hooks
The knowledge base supports:
- `/gather` to pull context before work.
- `/report` to capture session summaries.
- `reflect` skill for workflow improvements.
