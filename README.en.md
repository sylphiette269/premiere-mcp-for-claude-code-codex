# Premiere AI Agent

Chinese-first repository documentation lives in [README.md](./README.md).

Short summary:

`Premiere AI Agent` is a Windows-first monorepo for using `Claude Code` or
`Codex` with MCP tools to drive Adobe Premiere Pro for rough-cut editing.

This repository is focused on Windows, rough-cut workflows, local material
folders, Word briefs, reference videos, and prompt-driven planning.

When paired with
[`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp),
the prompt-driven flow can also let the AI search Douyin or Bilibili for 2 to 3
reference videos before generating a stronger rough-cut plan.

Primary use cases:

- rough-cut assistance from a Word brief
- rough-cut assistance from a reference video
- rough-cut assistance from a direct prompt
- planning and assembling edits from a local material folder

Important:

- you should always give the AI the local material folder path
- this project is for rough cuts, not reliable unattended finishing
- keyframe adjustment, transitions, and effects are not fully stable yet

For full details, use the Chinese README at [README.md](./README.md).

Additional docs:

- Quick start: [QUICKSTART.md](./QUICKSTART.md)
- Known issues: [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
- Project skills: [SKILLS.md](./SKILLS.md)

Acknowledgement:

Some of the early bridge and MCP integration work in this project drew on
selected ideas from
[`Adobe_Premiere_Pro_MCP`](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP).
I appreciate the original author for sharing that work openly. It was a useful
starting point while I was figuring out the Premiere-to-MCP connection flow.

From there, this repository grew toward its own rough-cut workflow, with a
stronger focus on Word briefs, reference videos, prompt-driven planning, local
material folders, and Claude Code / Codex based operation.
