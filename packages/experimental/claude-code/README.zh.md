---
description: "通过本机 Claude Code 运行时让 dsh 对话在 Claude 上运行，并由 dsh 执行所有工具，面向需要选择 Claude 模型和推理强度的用户。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-claude-code

[English](README.md) | 中文

## 概述

安装这个 Profile Bundle 后，可把 Claude Code 中已登录的 Claude 账号用作 dsh 模型。Bundle 增加 `claude-code` 模型路由：选择器会列出每个 Claude 模型及其推理强度，对话记录会显示 Claude 的思考。Claude 只充当模型。dsh 保留自己的系统提示、工具、审批、提问、技能和工具卡片，任何 dsh agent 预设都可搭配 Claude 模型使用。Claude Code 的内置工具、`CLAUDE.md` 文件、钩子和用户 MCP 服务器保持关闭。本包绝不读取、复制或存储任何凭据。它以实验性名称发布，不承诺稳定性。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

当 Claude 应在普通 dsh 会话中思考并回答，而工具由 dsh 执行时，选择这个 bundle。请先在宿主上登录 Claude Code；本 bundle 不启动登录流程。

### 安装 Bundle

把本包安装到目标 Profile，然后重启该 Profile。

```sh
dsh plugin --profile <name> add @deepseek-ai/dsh-experimental-claude-code
dsh --profile <name>
```

补丁层只插入 `claude-code` 行，不增加任何 agent 预设，因此可选择任意 dsh 预设并挑选 Claude 模型。

### 配置

| 字段 | 默认值 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | LLM 提供方路由名称；每个挂载实例需要唯一值 |
| `thinkingDisplay` | `summarized` | `summarized` 显示 Claude 的思考摘要；`omitted` 不显示 |
| `env` | `{}` | 清理之后叠加到子进程环境上的变量 |
| `idleTimeoutMs` | `1800000` | 未使用的存活查询在关闭前保持打开的毫秒数 |
| `toolTimeoutMs` | `86400000` | 一次 dsh 工具调用可用的毫秒数（含人工审批）；请保持在 24 小时以上 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-experimental-claude-code)是所有可接受字段及其 JSDoc 的完整来源。

### 选择模型和强度

选择器列出 Claude Code 运行时报告的模型，以及每个模型支持的推理强度。每个插件实例只向运行时查询一次。查询失败时，选择器提供 `opus`、`sonnet`、`haiku` 和 `claude-fable-5-1[1m]`，并且该路由的可配置提供方条目携带失败文本。模型 id `default` 使用 Claude 设置所选的模型。更换模型或强度会结束存活查询，并在新选择下续接 Claude 会话。

### 你会得到什么

Claude 的思考以推理块流式显示，Claude 的文本作为答案流式显示。Claude 调用工具时，dsh 的响应以一次普通的 dsh 工具调用结束：dsh 显示工具卡片、请求审批、运行工具，并在下一个请求中回传结果。Claude 在一条消息中发出多个工具调用时，会变成多个并行的 dsh 工具调用。`ask_user_question` 工具和其他 dsh 工具的行为与在任何模型上一样。

取消一个回合会立即中断查询并结束 Claude Code 进程。释放 agent 或卸载插件也会关闭其存活查询。

### 会话连续性

每个 dsh Session 保留一个存活的 Claude Code 查询。工具往返和后续用户消息都会送入该查询，因此 Claude 无需重发即可保留上下文。查询在 `idleTimeoutMs` 内未使用时关闭。当历史不再匹配存活查询时（例如被编辑、被压缩、某回合由其他路由回答，或模型、强度、工具集发生变化），适配器会关闭该查询，然后在最终答案之后续接 Claude 会话，或用带标签的对话记录开启新会话。

### 身份验证

子进程启动时，会先从父环境移除 `CLAUDECODE`、所有 `CLAUDE_CODE_*` 和所有 `ANTHROPIC_*` 变量，再叠加 `env`。这样既避免 dsh 在 Claude Code shell 内启动时被检测为嵌套会话，也避免按 API 密钥计费，由已登录的订阅付费。订阅登录下，每次查询的调试日志会记录 `apiKeySource: none`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 — 点击展开</summary>

### 设计理念

- **Claude 只充当模型。** 查询以 `tools: []`、`settingSources: []` 和 `strictMcpConfig: true` 运行。dsh 系统文本就是 Claude 系统提示。
- **dsh 工具经由一个 MCP 服务器传递。** 进程内服务器 `dsh` 列出请求中的工具。流式的 `mcp__dsh__{name}` 工具使用会变成 dsh 工具调用块，并以 Claude 工具使用 id 作为其 id。`canUseTool` 允许这些工具，拒绝其他所有工具。
- **工具调用会让查询停放。** 助手消息以 `tool_use` 结束时，响应以工具调用结束事件收尾。MCP 处理器等待该工具使用 id，下一个请求会解除等待。
- **重放信封把历史与存活查询对应起来。** `finish.replayState.response` 保存 `claudeSessionId`、`model`、`turn` 和 `stopped`。只有当本路由最后一条助手消息携带存活查询的回合号时，适配器才继续该查询。

### 源码地图

| 文件 | 作用 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：配置模式、路由与目录注册、释放钩子 |
| [`src/adapter.ts`](src/adapter.ts) | 模型列表、精确模型元数据和流入口 |
| [`src/stream.ts`](src/stream.ts) | 单个请求：复用或启动存活查询，然后流式输出其回合 |
| [`src/live.ts`](src/live.ts) | 存活查询、其回合流、取消、空闲计时器和注册表 |
| [`src/blocks.ts`](src/blocks.ts) | 把 Claude 内容块映射为 dsh 块 |
| [`src/tool-bridge.ts`](src/tool-bridge.ts) | `dsh` MCP 服务器与停放的工具调用 |
| [`src/conversation.ts`](src/conversation.ts) | 继续、续接还是全新的决定，以及工具结果映射 |
| [`src/models.ts`](src/models.ts) | 模型目录、强度和后备列表 |
| [`src/environment.ts`](src/environment.ts) | 子进程环境清理与叠加 |
| [`src/permissions.ts`](src/permissions.ts) | 只允许 dsh 工具的权限回调 |

### 运行流程

适配器找到 `options.sessionId` 对应的存活 Agent，并从其 Session 头读取工作目录。两者缺一时请求失败，绝不回退到进程目录。随后按存活查询规划请求：继续的请求回答停放的工具调用并排队额外的用户文本，其他方案会先关闭存活查询。辅助请求（会话标题、压缩）只运行一次，不带工具、不持久化，也不会保持存活。结果错误变成带 `CLAUDE_CODE_*` 代码的 `error` 类结束事件。这些代码不可重试，因为一次 Claude Code 运行可能已经执行了操作。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Claude Code subagent 提供方](../../subagent/subagent-claude-code/README.zh.md) — 基于同一 SDK 的一次性委派后端。
- [LLM 服务](../../llm/llm/README.zh.md) — 本路由接入的适配器注册表和流约定。
- [生成的配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-experimental-claude-code) — 所有可接受的配置字段。

-----

<a id="model-experience"></a>
## 模型体验

### Claude Code 请求

#### 模型看到什么

Claude 把 dsh 系统文本作为系统提示接收，把 dsh 工具作为名为 `mcp__dsh__{name}` 的 MCP 工具接收，并带有 dsh 的描述和 JSON 模式。它通过一个存活查询接收该回合的用户消息，以及作为 MCP 结果的工具结果。当查询无法继续时，它接收整个历史的带标签对话记录。Claude Code 的内置工具、技能、`CLAUDE.md` 文件、钩子和用户 MCP 服务器都不存在。

#### Token 影响

令牌数量取决于 Claude Code。继续的回合为新消息和结果，加上存活查询的上下文付费。全新的回合会再次为对话记录付费。每个 `usage` 块报告该 dsh 响应所含 Claude 消息的用量。

#### KV Cache 影响

提示缓存由 Claude Code 负责。存活查询在工具往返和后续回合之间保留自己的可复用前缀。全新会话、模型或强度变更、工具集变更或不同的系统文本会开启新的前缀。

### 辅助请求

#### 模型看到什么

会话标题或压缩请求会全新运行且不带工具。它的 dsh 系统文本成为 Claude 系统提示，它的消息成为对话记录。标题请求关闭思考。

#### Token 影响

每个辅助请求只为自己的对话记录付费一次，并且从不继续。

#### KV Cache 影响

独立于主对话。该请求不持久化 Claude 会话，也不复用前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **存活查询只存在于一个进程中** — 重启、空闲超时或历史变更都会丢失它。下一个请求会续接已结束的 Claude 会话或发送对话记录，而对话记录会把之前的工具调用显示为文字。
- **漫长的人工审批会让查询一直停放** — 停放的查询同样会在 `idleTimeoutMs` 后关闭，因此超过该时限的审批会导致以对话记录重新开始。
- **系统文本按查询固定** — 会话中途更改的 dsh 系统文本不会到达存活查询。
- **引导是尽力而为** — 与工具结果一起发送的用户文本作为排队消息到达 Claude，由 Claude Code 并入正在运行的回合。
- **模型发现每个插件实例只运行一次** — 查询失败会一直保持后备列表，直到 Profile 重启。模型设置页不会列出本路由，因为该路由不注册设置分区。
- **没有采样控制** — dsh 请求中的 `temperature`、`maxTokens` 和 `stop` 不会发送。
- **使用 SDK 默认进程启动** — 共享的 dsh 子进程服务不拥有 Claude Code 进程。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作背景 — 点击展开</summary>

本备注只是非权威的工作背景。运行时依赖固定在 Agent SDK 0.3.263，桥接依赖 MCP 工具调用中的 `_meta["claudecode/toolUseId"]`。升级后需要重新运行真实冒烟测试：`DSH_CLAUDE_CODE_E2E=1 pnpm exec vitest run -c vitest.e2e.config.ts packages/experimental/claude-code/tests/real-claude.e2e.ts`。是否让共享子进程服务接管 Claude Code 进程尚未决定。

</details>

**运行时不变式：** 不发布伴随项。路由注册以及继续或重启的决定不拥有两个独立观察可能出现分歧的关系。
