# x402-stacks API - Claude Guidance

## Project Summary
Cloudflare Worker that implements the x402-stacks payment protocol for AI-powered Stacks analytics. Paid AI endpoints return HTTP 402 until a valid STX or sBTC payment is provided, while free Tenero market/pools/tokens endpoints bypass payment.

## Available Endpoints

### AI-Powered (Paid)
- `/api/news` (0.001 STX) - Stacks/Bitcoin news
- `/api/audit` (0.02 STX) - Clarity contract security audit
- `/api/wallet/classify` (0.005 STX) - Wallet behavior classification
- `/api/research/user` (0.005 STX) - X/Twitter user research
- `/api/sentiment` (0.005 STX) - Crypto sentiment analysis
- `/api/wallet/trading` (0.005 STX) - Trading behavior analysis
- `/api/wallet/pnl` (0.005 STX) - Profit/loss analysis

### Alex Lab DEX (Paid)
- `/api/alex/swap-optimizer` (0.005 STX) - AI swap route optimization
- `/api/alex/pool-risk` (0.008 STX) - LP position risk with IL scenarios
- `/api/alex/arbitrage-scan` (0.01 STX) - Cross-pool arbitrage scanner
- `/api/alex/market-regime` (0.005 STX) - Market regime detection

### Zest Protocol Lending (Paid)
- `/api/zest/liquidation-risk` (0.008 STX) - Liquidation risk monitor
- `/api/zest/yield-optimizer` (0.008 STX) - Yield optimization strategies
- `/api/zest/interest-forecast` (0.005 STX) - Interest rate predictions
- `/api/zest/position-health` (0.005 STX) - Position health check

### Cross-Protocol DeFi (Paid)
- `/api/defi/portfolio-analyzer` (0.015 STX) - Combined Alex+Zest analysis
- `/api/defi/strategy-builder` (0.02 STX) - AI DeFi strategy generation

### BNS Domain Analytics (Paid)
- `/api/bns/valuation` (0.005 STX) - AI domain name valuation
- `/api/bns/portfolio` (0.008 STX) - BNS portfolio analysis

### sBTC Analytics (Paid)
- `/api/sbtc/whale-flows` (0.005 STX) - sBTC whale movement tracking
- `/api/sbtc/farming-scanner` (0.008 STX) - sBTC yield farming opportunities

### NFT Analytics (Paid)
- `/api/nft/portfolio-valuation` (0.008 STX) - NFT portfolio valuation

### Smart Money Tracking (Paid)
- `/api/whale/smart-money` (0.015 STX) - Smart money/whale pattern analysis

### Free Endpoints
- `/api/market/*` - Market stats, gainers, losers, whales, netflow
- `/api/pools/*` - Trending pools, OHLC data
- `/api/tokens/*` - Token summary and details

### x402 Scan Registration
- `/.well-known/x402.json` - x402 scan manifest endpoint (auto-generated from SERVER_ADDRESS)
- `x402-manifest.json` - Static manifest file template
- Register at x402 scan by submitting: `https://your-worker-url/.well-known/x402.json`

## Key Commands
- `npm install` - Install dependencies.
- `npm run dev` - Run the Worker locally (wrangler dev).
- `npm run deploy` - Deploy to Cloudflare (prefer CI/CD over direct deploy).
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
  - `alex/` - Alex Lab DEX client and types
  - `alex.service.ts` - Alex swap/pool/arbitrage analytics
  - `zest/` - Zest Protocol client and types
  - `zest.service.ts` - Zest lending/risk/yield analytics
  - `defi.service.ts` - Cross-protocol portfolio and strategy
  - `tenero/` - Tenero market data client
  - `hiro/` - Hiro Stacks API client for BNS, NFT, transfers
  - `bns.service.ts` - BNS domain valuation and portfolio analysis
  - `sbtc.service.ts` - sBTC whale flows and farming scanner
  - `nft.service.ts` - NFT portfolio valuation
  - `whale.service.ts` - Smart money tracking
- `src/utils/` - Payment verification and response helpers.
- `scripts/` - Endpoint test probes (alex-*, zest-*, defi-*).

## Knowledge Base References
Use the local knowledge base for Stacks/Clarity and protocol guidance: `/Users/biwas/claudex402/claude-knowledge`.

### Quick Reference (Nuggets)
Fast lookups for common facts and gotchas:
- `nuggets/stacks.md` - Tenero API, SIWS, SIP-018 signing standards quick reference.
- `nuggets/clarity.md` - Core principles, gotchas, error handling, testing commands.
- `nuggets/cloudflare.md` - Worker deployment best practices (prefer CI/CD over direct deploy).
- `nuggets/node.md` - Node.js and TypeScript tooling tips.
- `nuggets/github.md` - GitHub API, Actions, and Pages workflows.
- `nuggets/git.md` - Git workflow tips and commands.

### Deep Reference (Context)
Comprehensive documentation for detailed guidance:
- `context/clarity-reference.md` - Complete Clarity language reference.
- `context/siws-guide.md` and `context/sip-siws.md` - SIWS auth flows and implementation.
- `context/sip-018.md` - Signed Structured Data standard for on-chain verification.
- `context/tenero-api.md` and `downloads/2025-01-06-tenero-openapi-spec.json` - Market data APIs.

### Patterns & Best Practices
Reusable code patterns and architectural guidance:
- `patterns/clarity-patterns.md` - Comprehensive Clarity code patterns (public functions, events, error handling, bit flags, multi-send, whitelisting, DAO proposals, fixed-point math, treasury patterns).
- `patterns/clarity-testing.md` - Testing tooling and patterns for Clarity contracts.
- `patterns/skill-organization.md` - Three-layer pattern (SKILL → RUNBOOK → HELPERS) for maintainable workflows.

### Architectural Decisions
Design principles and workflow patterns:
- `decisions/0002-clarity-design-principles.md` - Contract design rules, security patterns, Clarity 4 features.
- `decisions/0001-workflow-component-design.md` - Development workflow component patterns (OODA loop, planning flows, composable workflows).

### Runbooks
Step-by-step operational guides:
- `runbook/clarity-development.md` - Clarity dev workflows and checklists.
- `runbook/cloudflare-scaffold.md` - Cloudflare Worker setup, wrangler config, credentials, deployment patterns.
- `runbook/setup-github-pat.md` - GitHub Personal Access Token setup.
- `runbook/setup-github-pages-just-the-docs.md` - Documentation site deployment.
- `runbook/updating-claude-knowledge.md` - Knowledge base maintenance and sanitization guidelines.

## Claude Workflow Hooks
The knowledge base supports composable workflow commands and skills:

## Commit Workflow
- After every small change, create a commit with a Conventional Commits message (e.g., `fix: adjust root response`).
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `revert`.
- Enable the local commit-msg hook: `git config core.hooksPath .githooks`.

### Commands (User-Initiated)
- `/sync` - Pull latest from repositories.
- `/gather [topic]` - Pull relevant context before work.
- `/plan <task>` - Spawn Plan agent for implementation strategy.
- `/report` - Generate session summaries.
- `/status` - Quick status check of current state.
- `/build` - Run build pipeline.
- `/pr` - Create/manage pull request.
- `/preview` - Deploy to preview environment.
- `/ship` - Production deployment (requires confirmation).
- `/daily [date]` - Generate daily work summaries.
- `/learn <category>: <fact>` - Capture knowledge nuggets (clarity, stacks, cloudflare, git, github, node).

### Skills (Proactive)
- `reflect` - Review and suggest workflow improvements.
- `/execute` - Orchestrate build/test during coding (proactive).
- `/pick_whoabuddy_brain` - Sync and apply latest claude-knowledge updates.
- `/daily` - Generate daily work summaries from git history.

### Specialized Agents
Reusable expert agents available in `claude-config/agents/`:
- `stacks-blockchain-expert.md` - Stacks.js, deployment, Clarinet workflows.
- `clarity-code-expert.md` - Clarity smart contracts, auditing, testing.
- `git-expert.md` - Git workflows and conflict resolution.
- `github-expert.md` - GitHub CLI, issues, PRs, Actions.

### Composable Workflows
**Planning Session**: `/sync` → `/gather` → `/plan` → [work] → `/report` → `reflect`
**Feature Development**: `/plan` → `/execute` → `/build` → `/pr` → `/preview` → `/ship`
**Quick Fix**: `/status` → [fix] → `/build` → `/pr` → `/ship`
