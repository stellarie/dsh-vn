---
description: "使用并排查实验性 Web Agent Teams roster、共享任务板与 teammate 导航面板。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-agent-team

[English](README.md) | 中文

## 概述

本包向 Web 会话页头添加 Agent Teams action，让用户检查 roster、管理任务板并打开 teammate 会话。Dialog toolbar 中带可见标签的 **Open in sidebar** 控件打开右侧栏 tab，逐行列出每个 teammate 的当前任务与一行 steering 输入。它通过 `ctx.remote.agentTeams` 读取权威 Team 状态，并让 child history 导航继续使用稳定的 addressed-subagent 路径。通过公开发布的实验性 Agent Teams Web profile 选择本包。这个浏览器 projection 不扩展稳定 API Proxy、不存储 Team 状态，也不注册面向模型的输入。

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

在稳定 Web bundle 与 Host-side Agent Teams profile 之后，通过 [`@deepseek-ai/dsh-experimental-agent-team-web-profile`](../agent-team-web-profile/README.zh.md) 安装本包。Web Client loader 挂载 `/client` export；root Host export 不执行行为，本包也没有用户配置字段。

### 检查并导航 roster

打开 panel 会调用 `agentTeams/view`。Roster row 展示持久 name、运行时 status、model 与 diagnostics。选择健康 teammate 时，系统刷新既有直接 child catalog，并打开普通的 `{ parentSessionId, childSessionId, mode: 'continuable' }` address。History 与后续人类提示词继续使用稳定 addressed-subagent 会话路径；本包不会添加 Team 专用 address 字段。

### 管理任务板

任务板展示 task identity、owner、blocker、readiness、提示性 write scope 与重叠 warning。用户可以通过 `agentTeams/createTask` 与 `agentTeams/updateTask` 创建、编辑、分配或取消分配、完成、重开和删除任务。每次 update 都发送当前显示的 revision，create 或 update rejection 都保留为显式 business result。

任务板由一个组件渲染，并在两个表层同时出现：页头 dialog 与右侧栏 stack。因此无论用户从哪里操作，task action 的行为都一致。

### 从右侧栏 steering teammate

Dialog toolbar 中带可见标签的 **Open in sidebar** 控件位于 Refresh Team 旁，把 Team stack 作为右侧栏 tab 打开。Tab type 通过 `ctx.sidebarRightTabs.register` 注册；控件用 `ctx.sidebarRight.openTab` 打开它，因此再次点击只会显示已打开的 tab，而不会新增一个。

Stack 为每个 teammate 保留一行：持久 name、运行时 status，以及该 member 拥有的 `in_progress` 任务 subject。Lead 自己的行不出现，因为 Team member 不能给自己发消息。没有已开始任务的 teammate 显示空状态行。

每行带有一个单行输入框，通过 `agentTeams/sendMessage` 向该 teammate 发送一条 steering 消息。调用结束后该行报告 mailbox 结果（已送达或已排队）并清空输入框。被拒绝的调用会保留输入内容并显示失败行，用户可以修正原因后重试。

在这些行下方，stack 渲染与 dialog 相同的共享任务板。

Stack 在挂载期间保持实时：它按短间隔重新读取 Team view，因此 teammate status 与 task 进度无需手动刷新即可跟随现实。steering 发送与每次 task mutation 都会立即重载，因此用户自己的操作不必等待下一个 tick。读取失败时保留上一次成功的 view——行与任务板都留在屏幕上——并显示失败行，而不会把 pane 清空。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

Client export 挂载来自 [`@deepseek-ai/dsh-experimental-agent-team/remote`](../agent-team/README.zh.md) 的生成的 `ctx.remote.agentTeams` contribution，然后注册 locale dictionary、一个 conversation-header slot，以及一个带有 body 的右侧栏 tab type。Dispose plugin fiber 会移除全部 registration。

开始 create 或 update 会让更早的 refresh 失效。成功后会重新读取完整 Team view，使每个 task 的派生字段保持最新。`team-task-conflict` 结果仅在重新读取成功后显示状态陈旧提示；如果重新读取失败，则改为显示重新读取错误。由于 Team 服务把任务文本或 scope 编辑与 dependency 修改公开为独立 action，两者使用两个连续的 compare-and-set mutation。

任务板拥有自己的 draft、pending task 记账与全部 mutation，并从渲染它的表层取得 view 与三个 view 生命周期回调。每个表层仍各自拥有自己的 load、刷新节奏与失败行，因此两者可以独立刷新，而不会出现第二条 mutation 路径。

Stack 在挂载时与按需刷新同一个 view。某一行的当前任务是与该 member 名字相同的 `ownerName` 所拥有的第一个 `in_progress` 任务，因此 dialog 与 stack 共用同一个 loader。Steering 调用与刷新都携带其发起时的 session，会话切换后才到达的结果会被丢弃。

| 文件 | 职责 |
|---|---|
| [`src/client/mount.ts`](src/client/mount.ts) | 生成的 Remote、locale、导航、slot 与右侧栏 registration |
| [`src/client/TeamAction.tsx`](src/client/TeamAction.tsx) | 页头 action、roster 与 dialog view 生命周期 |
| [`src/client/TeamTaskBoard.tsx`](src/client/TeamTaskBoard.tsx) | 共享任务板与全部 task mutation |
| [`src/client/TeamSidebar.tsx`](src/client/TeamSidebar.tsx) | 右侧栏 teammate stack、steering 状态与共享任务板 |
| [`src/client/useTeamView.ts`](src/client/useTeamView.ts) | 每个表层各自拥有的 Team view 生命周期 |
| [`src/client/team-remote.ts`](src/client/team-remote.ts) | Remote result 别名与 task request 类型 |
| [`src/client/team-view.ts`](src/client/team-view.ts) | 当前任务查询与 status、failure 文案映射 |
| [`src/client/locales.ts`](src/client/locales.ts) | 中英文 panel 文案 |
| [`src/index.ts`](src/index.ts) | 不执行行为的 Host entry |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Agent Teams Web profile](../agent-team-web-profile/README.zh.md)——挂载本 Client plugin 的公开 opt-in bundle。
- [Agent Teams service](../agent-team/README.zh.md)——权威 roster、task 与 Remote 行为。
- [会话 UI](../../client/ui-conversation/README.zh.md)——稳定 header slot 与 addressed-subagent 导航表层。
- [实验性包](../README.zh.md)——孵化状态与发布规则。

-----

<a id="model-experience"></a>
## 模型体验

无直接影响，因为该浏览器 projection 与任务控制界面不注册面向模型的输入。

#### KV Cache 影响

无直接影响；Team 工具与普通会话提交负责后续任何模型可见用途。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **轮询而非推送**——stack 在打开期间按间隔重新读取 Team view；没有任何机制把 Team 变化推送到浏览器，因此在别处产生的 mutation 会在下一次读取时出现。
- **各自独立的 view**——每个表层各自加载与重载自己的 Team view，因此在任一方刷新之前，dialog 的任务列表可能比 stack 落后一次 mutation。
- **通往 teammate 的两条路径**——stack 的 steering 输入框使用持久 Team peer mailbox，而导航后输入的人类消息使用稳定 addressed-subagent 提示词路径。
- **仅限文本 steering**——一行只向一个具名 teammate 发送一行文本；行内不能附加内容、interrupt 某个 turn 或 spawn teammate。
- **没有 lifecycle 或 workspace control**——panel 不能 spawn、rename、delete 或 interrupt teammate，write scope 仍只是提示性 metadata。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。RPC 是权威来源，本包只持有可释放的 slot、tab type 与 Remote 注册。
