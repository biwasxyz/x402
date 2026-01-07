# x402-stacks API - Claude Guidance

## Project Summary
Cloudflare Worker that implements the x402-stacks payment protocol for AI-powered Stacks analytics. Paid endpoints return HTTP 402 until a valid STX or sBTC payment is provided.

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
- `src/utils/` - Payment verification and response helpers.

## Knowledge Base References
Use the local knowledge base for Stacks/Clarity and protocol guidance: `/Users/biwas/claudex402/claude-knowledge`.

### Quick Reference (Nuggets)
Fast lookups for common facts and gotchas:
- `nuggets/stacks.md` - Tenero API, SIWS, SIP-018 signing standards quick reference.
- `nuggets/clarity.md` - Core principles, gotchas, error handling, testing commands.
- `nuggets/cloudflare.md` - Worker deployment best practices.
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

### Architectural Decisions
Design principles and workflow patterns:
- `decisions/0002-clarity-design-principles.md` - Contract design rules and security patterns.
- `decisions/0001-workflow-component-design.md` - Development workflow component patterns (OODA loop, planning flows, composable workflows).

### Runbooks
Step-by-step operational guides:
- `runbook/clarity-development.md` - Clarity dev workflows and checklists.
- `runbook/setup-github-pat.md` - GitHub Personal Access Token setup.
- `runbook/setup-github-pages-just-the-docs.md` - Documentation site deployment.

## Claude Workflow Hooks
The knowledge base supports composable workflow commands and skills:

## Commit Workflow
- After every small change, create a commit with a Conventional Commits message (e.g., `fix: adjust root response`).
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `revert`.
- Enable the local commit-msg hook: `git config core.hooksPath .githooks`.

### Commands (User-Initiated)
- `/sync` - Pull latest from repositories.
- `/gather` - Pull relevant context before work.
- `/plan` - Spawn Plan agent for implementation strategy.
- `/report` - Generate session summaries.
- `/status` - Quick status check of current state.
- `/build` - Run build pipeline.
- `/pr` - Create/manage pull request.
- `/preview` - Deploy to preview environment.
- `/ship` - Production deployment (requires confirmation).

### Skills (Proactive)
- `reflect` - Review and suggest workflow improvements.
- `/execute` - Orchestrate build/test during coding (proactive).
- `/pick_whoabuddy_brain` - Sync and apply latest claude-knowledge updates.

### Composable Workflows
**Planning Session**: `/sync` → `/gather` → `/plan` → [work] → `/report` → `reflect`
**Feature Development**: `/plan` → `/execute` → `/build` → `/pr` → `/preview` → `/ship`
**Quick Fix**: `/status` → [fix] → `/build` → `/pr` → `/ship`
