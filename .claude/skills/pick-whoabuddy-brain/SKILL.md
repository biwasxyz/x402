---
name: pick-whoabuddy-brain
description: Sync the whoabuddy claude-knowledge repository and apply relevant updates to CLAUDE.md. Use when the user asks to update knowledge base references, sync claude-knowledge, or check for new patterns and best practices from whoabuddy.
allowed-tools: Bash, Read, Edit, Glob, Grep, Task
---

# Pick Whoabuddy's Brain

This Skill synchronizes the local claude-knowledge repository with the latest commits from whoabuddy and applies relevant updates to the project's CLAUDE.md file.

## Instructions

When this Skill is activated, follow these steps:

### 1. Check Repository Status

First, check if the claude-knowledge repository has updates:

```bash
cd /Users/biwas/claudex402/claude-knowledge
git fetch origin
git status -sb
```

### 2. Pull Updates if Available

If the repository is behind:

```bash
cd /Users/biwas/claudex402/claude-knowledge
git pull origin main
git log --oneline -10
```

Display the recent commits to the user so they know what was updated.

### 3. Research Updated Content

If updates were pulled, use the Task tool with `subagent_type=Explore` to research what changed:

- Check which files were modified or added
- Read new nuggets, patterns, context files, or decisions
- Identify content relevant to the x402 project (Stacks, Clarity, Cloudflare, Node.js, Git, GitHub)
- Note any new best practices or gotchas

### 4. Update CLAUDE.md

Apply relevant updates to `/Users/biwas/claudex402/x402/CLAUDE.md`:

- Add references to new files in the appropriate sections
- Update descriptions for changed content
- Add new categories if the knowledge base structure changed
- Ensure all paths are accurate

### 5. Report Findings

Provide a summary to the user:

- List what files were updated in claude-knowledge
- Summarize what was added or changed in CLAUDE.md
- Highlight any important new patterns or best practices
- Note if no updates were needed

## Key Paths

- Knowledge base: `/Users/biwas/claudex402/claude-knowledge`
- Project CLAUDE.md: `/Users/biwas/claudex402/x402/CLAUDE.md`

## Exit Conditions

- **Success**: CLAUDE.md is updated with latest knowledge base references, or confirmed up to date
- **Failure**: Repository unreachable, merge conflicts, or file access issues

## Notes

- Always fetch before checking status to ensure accurate comparison
- Use semantic matching to identify which knowledge base content is relevant to x402
- Don't add references to content that isn't applicable to a Cloudflare Worker project with Stacks integration
