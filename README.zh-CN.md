# Premiere Agent

[English README](./README.md)

`Premiere Agent` 是一个面向视频生产的 AI agent monorepo。

它的目标不是只暴露一堆 MCP 工具，而是把研究、节拍分析和 Premiere
执行层组合成一条可理解、可追踪、可验证的闭环链路。

## 它能做什么

- 接收一句用户目标，例如 `做一个 15 秒抖音风格产品视频`
- 生成或加载统一的 `editing blueprint`
- 按需分析 BGM，产出节拍驱动的剪辑计划
- 在研究层、音频层和 Premiere 层之间做统一调度
- 跑一轮 critic，并输出结构化报告与 checkpoint

## 仓库结构

```text
repo-root/
├── agent/                  # 编排、大脑、记忆、critic、reporter
├── cli/                    # 命令行入口
├── scenarios/              # 最小闭环示例
├── packages/
│   ├── premiere-mcp/       # Premiere 执行层
│   ├── audio-beat-mcp/     # 节拍分析层
│   └── video-research-mcp/ # 研究与蓝图层
└── .github/workflows/ci.yml
```

## 快速开始

```bash
npm install
npm run build
npm test
npm run agent:dev -- "做一个 15 秒抖音风格产品视频"
```

如果要真正执行 Premiere 步骤，还需要：

- Windows
- Node.js 18+
- Adobe Premiere Pro
- 已启用 CEP
- 已安装 `packages/premiere-mcp` 提供的 CEP 面板

## 运行示例

```bash
npm run scenario:product
npm run scenario:music
npm run scenario:research
```

## 当前状态

当前仓库已经具备公开发布的基本形态：

- monorepo 结构已经稳定
- 根仓命令和 package 边界已经打通
- CI 已配置
- 根仓 `build` 和 `test` 可通过

当前重点是把 agent 闭环做清楚，而不是做成云端 SaaS 或桌面一键安装器。

## 协作与安全

- 贡献说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)
- 安全问题见 [SECURITY.md](./SECURITY.md)
