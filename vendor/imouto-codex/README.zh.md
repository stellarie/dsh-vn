---
description: "面向用户与维护者的可选 OpenAI Codex 包：用 ChatGPT 订阅而非 API 密钥路由 Codex 模型、独立搜索与图片工具。"
kind: "package-reference"
---

# @stellarie/dsh-imouto-codex

[English](README.md) | 中文

## 概述

`@stellarie/dsh-imouto-codex` 为 dsh 增加 `openai-codex` 提供方。它通过 OAuth 使用 ChatGPT 订阅登录，通告已安装的 Codex 模型目录，并用 Codex 搜索端点回答独立网页搜索。可选功能增加快速模式、后端授权的模型回退、`imagegen` 工具，以及 `read_image` 的 HTTP(S) 输入。浏览器设置页与可选的终端命令树暴露账号、账号用量上限和全部偏好。只有当 profile 补丁挂载本包时，它才会生效。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

当使用者用 ChatGPT 订阅而不是 API 密钥登录时，在 profile 中挂载本包。包补丁 `cordis.patch.yml` 会增加提供方行，为 `agent-default-model` 和 `web.searchProvider` 选择 `openai-codex`，并增加一行休眠的终端行。

```yaml
- insert:
    - id: llm-openai-codex
      name: '@stellarie/dsh-imouto-codex'
    - id: openai-codex-tui
      name: '@stellarie/dsh-imouto-codex/tui'
      inject: [openAICodex]
```

### 登录

打开 **设置 → OpenAI Codex**，选择 **Sign in with ChatGPT**。插件会显示授权页面，等待本机回调，并把结果保存在 `$DSH_HOME/.openai-codex-auth.json`。插件从不读取或修改 `~/.codex/auth.json`。浏览器流程运行前，必须在主机上批准浏览器来源；`OpenAICodexTrustedOriginsStore` 记录这些精确来源。

### 选择搜索与图片行为

`llm-openai-codex` 行接受 `searchMode`、`searchModel`、`searchContextSize`、`searchMaxOutputTokens`、`contextWindow`、`models`、`modifyReadImage`、`shareImagegenWithOtherModels`、`useWebSocketContextReuse`、`useNativeCompaction`、`fastModeDefault`、`automaticModelFallback`、`proxyMode` 与 `proxyUrl`。已保存的用户设置优先于包内取值。

### 维护操作

`src/bin.ts` 导出 `run()`，供 profile 拥有的入口使用。它报告不含密钥的凭据元数据（`doctor`、`status`），开始或结束登录（`login`、`logout`），修复已保存会话中已停用的搜索事件（`repair-session`），并管理浏览器来源（`trust-origin`、`trusted-origins`、`untrust-origin`）。本包不发布可执行文件，因为只有 `dsh` profile 启动 dsh 应用。

<a id="understand-the-implementation"></a>
## 理解实现

### 插件行

`apply()` 注册凭据存储、模型适配器、独立搜索提供方、认证路由和两个工具。只有当 `tuiCommandTrees` 服务存在时，终端行才注册 `/codex`。两行都不在拥有该操作的步骤成功之前发布状态。

### 凭据存储

`OpenAICodexCredentialStore` 在 `$DSH_HOME` 下写入一个 JSON 文档，并由 `withFileLock` 与 `writeFileAtomic` 保护。OAuth 交换在 `oauth-provider.ts` 中完成，所有提供方调用都经过 `OpenAICodexProxyTransport`，因此一条代理偏好同时作用于模型请求和搜索请求。

### 许可与归属

本包派生自 `Yan-Zero/dsh-codex`，导入提交为 `b726c295dde2490dc2c8df0ff95bead99a3646ed`。仓库把所有 `@deepseek-ai/dsh-*` 包以 MIT 许可发布，因此本清单声明 MIT。上游 Apache-2.0 条款仍然覆盖导入的文件：`LICENSE` 保留上游 Apache-2.0 全文，`UPSTREAM.md` 记录来源仓库、导入提交和保持不变的标记。该组合随 `files` 一起发布，满足 NOTICE 义务。

<a id="further-exploration"></a>
## 进一步探索

- [docs/design.md](docs/design.md) 说明请求路径、凭据文档和兼容性检查。
- [docs/session-repair.md](docs/session-repair.md) 说明已停用事件的修复。
- [INSTALL.md](INSTALL.md) 是 profile 安装手册。
- [UPSTREAM.md](UPSTREAM.md) 记录上游来源与许可。

## 模型体验

### Codex 模型请求

#### 模型看到什么

被选中的 Codex 模型会收到 harness 系统提示、映射到 Responses API 的历史、该 agent 允许的工具模式，以及该路由支持的采样字段。适配器默认发送 `store: false`，并且只在 `useWebSocketContextReuse` 打开时通过 `previous_response_id` 复用匹配上下文。`read_image` 输入扩展会把抓取的 URL 文本加入工具结果，`imagegen` 结果会加入一个生成图片的附件引用。

#### Token 影响

输入 token 是转换后请求的提供方分词结果。推理、文本、工具调用和图片分块作为 harness 分块到达，用量统计来自提供方报告。上下文窗口偏好只改变通告容量，不增加提示文本。

#### KV Cache 影响

转换保留消息顺序，因此未变化的前缀保持可复用。改变模型、推理档位或工具集，会在该位置改变前缀。原生压缩把较早区域替换为一个加密条目，因此之后每个请求的复用都在那里结束。

### 独立网页搜索

#### 模型看到什么

一次搜索选择 `OpenAICodexSearchProvider`，它按配置的模式、上下文大小和输出预算把查询发送到 Codex 搜索端点，并把映射后的结果作为网页搜索工具结果返回。

#### Token 影响

结果正文就是提供方回答，并按 `searchMaxOutputTokens` 截断。查询与结果给发起它们的工具调用增加 token。

#### KV Cache 影响

搜索结果在自己的位置作为工具结果进入会话，因此未变化的较早前缀保持可复用。改变 `searchModel`、`searchMode` 或 `searchContextSize` 只影响之后的请求。

### 图片工具

#### 模型看到什么

`imagegen` 接受提示和可选输入图片，返回工作区路径或附件引用。当 `modifyReadImage` 打开时，`read_image` 也接受 HTTP(S) URL，并把抓取的字节作为图片块返回。当所选模型未通告图片输入时，`ImageToolPolicy` 拒绝调用。

#### Token 影响

返回的图片占用所选模型的图片 token。`imagegen.output_path` 给结果增加一个路径字符串。拒绝消息只增加一句短句，不包含图片。

#### KV Cache 影响

工具结果追加在自己的位置，因此较早的轮次保持可复用。关闭 `shareImagegenWithOtherModels` 或 `modifyReadImage` 会改变工具列表或工具行为，从而从该请求起改变前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制是当前包约束，不是任务清单。

- **本包是可选的，且默认关闭** — profile 必须挂载包补丁，而当前没有任何随仓库发布的 profile 这样做。
- **浏览器登录需要已批准来源** — 来自未批准来源的浏览器请求会被拒绝，使用者必须先在主机上批准该精确来源。
- **登录尝试不可持久化** — 登录过程中刷新页面会放弃该次尝试。
- **`useWebSocketContextReuse` 取决于提供方** — 当提供方不返回匹配上下文时，复用路径退化为无状态请求。
- **原生压缩需要显式开启** — 当 V2 端点不可用时，`useNativeCompaction` 回退到 harness 压缩。
- **模型回退跟随账号后端** — `automaticModelFallback` 绝不会使用 OpenAI 未授权的替代模型。
- **维护操作需要 profile 入口** — 本包不发布可执行文件，因为只有 `dsh` profile 启动 dsh 应用。
- **上游 Apache-2.0 文件保留上游条款** — MIT 声明覆盖仓库包，`LICENSE` 中的 Apache-2.0 全文覆盖导入的源码。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作背景 — 点击展开</summary>

本开发备注是非权威的工作背景：维护者备忘与方向。已发布行为和已接受的依据位于上文各节、包代码与所链接文档中。

- 提供方标识保持 `openai-codex`，标记 `dsh-openai-codex-compaction-4f5cf1b7-v1` 保持不变，因此已有的加密压缩检查点仍然可读。
- 本包保留自己的模型缓存环境变量 `DSH_CODEX_MODELS_CACHE`，只读取 Codex 模型元数据，从不读取 Codex 凭据。

</details>

**运行时不变式：** 本包不发布运行时不变式伴随包，因为 LLM 与 web 注册表已经拥有提供方唯一性与释放，而每个凭据和模型回复都跨越文件或网络边界，其校验在拥有该操作的步骤中完成。
