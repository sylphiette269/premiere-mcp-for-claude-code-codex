# Contributing

## Scope

This repository is a monorepo.

- Root-level changes should improve the agent orchestration layer, workspace
  tooling, shared docs, or CI
- Package-level changes should stay within the ownership boundary of each
  package
- Do not collapse package boundaries by copying logic across packages unless the
  refactor clearly improves the design

## Development Setup

From the repository root:

```bash
npm install
npm run build
npm test
```

Useful package-level commands:

```bash
npm run build --workspace packages/premiere-mcp
npm run test --workspace packages/premiere-mcp
npm run build --workspace packages/audio-beat-mcp
npm run build --workspace packages/video-research-mcp
```

## Change Rules

- Prefer small, reviewable changes
- Keep root docs and package docs aligned
- Preserve the current runtime contracts unless the change intentionally updates
  them
- When changing Premiere bridge behavior, verify both code and docs

## Pull Requests

Please include:

- what changed
- how it was verified
- any follow-up work or known limitations
