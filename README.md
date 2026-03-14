# Premiere Agent

[![CI](https://github.com/sylphiette269/Premiere--agent/actions/workflows/ci.yml/badge.svg)](https://github.com/sylphiette269/Premiere--agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

English README. For Chinese, see [README.zh-CN.md](./README.zh-CN.md).

`Premiere Agent` is a monorepo for an AI video agent that turns a single goal
into a structured video-editing workflow.

It combines three execution layers under one agent runtime:

- `packages/premiere-mcp`
  Premiere Pro MCP server and CEP bridge
- `packages/audio-beat-mcp`
  Beat analysis and edit timing planning
- `packages/video-research-mcp`
  Reference-video research and blueprint generation
- `agent/`
  Gateway, planner, orchestrator, memory, critic, and reporter

## What It Does

- Takes a user goal such as `make a 15-second TikTok-style product video`
- Derives or loads an editing blueprint
- Optionally analyzes background music for beat-driven timing
- Dispatches the right tool layer for research, timing, and Premiere execution
- Runs a critic pass and writes a structured report with checkpoints

## Quick Start

```bash
npm install
npm run build
npm test
npm run agent:dev -- "make a 15-second TikTok-style product video"
```

To execute real Premiere steps, you also need:

- Windows
- Node.js 18+
- Adobe Premiere Pro
- CEP enabled
- The CEP panel installed from `packages/premiere-mcp`

## Example Flows

Use the root CLI directly:

```bash
npm run agent:dev -- "make a 15-second TikTok-style product video"
npm run agent:dev -- "build a beat-synced short music edit" --bgm "C:/path/song.mp3"
```

Or run the packaged scenarios:

```bash
npm run scenario:product
npm run scenario:music
npm run scenario:research
```

## Repository Layout

```text
repo-root/
├── agent/                  # orchestration and reporting layer
├── cli/                    # command-line entrypoint
├── scenarios/              # runnable end-to-end examples
├── packages/
│   ├── premiere-mcp/       # Premiere execution package
│   ├── audio-beat-mcp/     # beat-analysis package
│   └── video-research-mcp/ # research and blueprint package
└── .github/workflows/ci.yml
```

## Current Status

This repository is already shaped for open source:

- monorepo structure is in place
- root workspace commands are wired
- package metadata is filled
- CI is configured
- build and test pass from the repository root

The current focus is a clean, inspectable agent pipeline, not a hosted SaaS or
one-click desktop installer.

## Verification

Run from the repository root:

```bash
npm install
npm run build
npm test
npm audit --json
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).
