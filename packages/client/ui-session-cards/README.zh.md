---
description: "左侧栏折叠时，以小型卡片显示需要关注的会话。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-session-cards

[English](README.md) | 中文

## 概述

左侧栏折叠时，本包在对话区域左侧浮动一叠小型卡片。每张卡片对应一个正在运行、正在等待决定，或已完成但尚未打开的 Session，并且只显示其状态指示与标题。点击卡片会把该 Session 切换为当前会话。侧栏展开时该叠卡片隐藏。卡片读取标准的 `useSessions`、`useSessionStatus` 与 `useWorkspaces` 座位，并通过 `ctx.uiWorkspace` 切换 Session；本包不添加 host 服务、不添加 store，也不注册面向模型的输入。

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

Web 应用 bundle 会挂载本包；它没有用户配置字段，也不需要配套的 host 包。折叠左侧栏即可显示这叠卡片，展开侧栏则再次隐藏。

### 什么会得到一张卡片

每个需要用户的 Session 会出现一张卡片：

- **运行中**——该 Session 正在工作。
- **等待决定**——某个 Session 作用域的 UI 消费者正在等待该用户：审批、计划评审或提问。
- **已完成但未打开**——该 Session 在屏幕外停止，此后没有被打开过。

屏幕上的当前 Session、空白占位 Session、已归档 Session 以及 subagent 子会话都不会出现卡片。待决定的优先级高于该 Session 自身的活动，后者又高于完成提醒。

### 切换 Session

选择卡片会通过 `ctx.uiWorkspace.openSession` 把该 Session 变为当前会话，这与 Workspace 行使用的导航相同。随后卡片会跟随新的 Session：刚打开的 Session 不再需要卡片，侧栏展开时该叠卡片隐藏。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

浏览器半边注册一个 `conversation.input.dock` entry，因此这叠卡片随屏幕上的 Session 一起挂载与卸载。组件把自己的元素 portal 到 document body，并根据实测的对话内容角落定位，从而不受 transcript 自身滚动与裁剪的影响。

有两个事实通过注入来源而非 props 到达：折叠状态，从 frame 根节点的 `data-sidebar-collapsed` 属性读取；以及 Session 导航回调，它闭包持有 `ctx.uiWorkspace`。其余都来自标准座位：`useSessions` 提供列表，`useSessionStatus` 提供实时状态，`useWorkspaces` 提供归档集合。

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | 字典与 dock registration |
| [`src/client/SessionCards.tsx`](src/client/SessionCards.tsx) | 卡片栈、定位与注入面 |
| [`src/client/attention.ts`](src/client/attention.ts) | 哪些 Session 得到卡片，以及各自报告的状态 |
| [`src/client/sidebar-collapsed.ts`](src/client/sidebar-collapsed.ts) | 把 frame 属性暴露为 observable |
| [`src/client/locales.ts`](src/client/locales.ts) | 中英文文案 |
| [`src/index.ts`](src/index.ts) | 不执行行为的 Host entry |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Workspace browser](../../client/ui-workspace/README.zh.md)——本包读取的 Session 列表、状态与导航。
- [会话 UI](../../client/ui-conversation/README.zh.md)——dock 座位以及卡片定位所依据的对话区域。
- [Web client 架构](../../../docs/subsystems/web-client.zh.md)——slot、hook 与展示层。

-----

<a id="model-experience"></a>
## 模型体验

### 关注卡片

#### 模型看到的内容

没有。该卡片栈读取 `useSessions`、`useSessionStatus` 与 `useWorkspaces`，并通过 `conversation.input.dock` 渲染自己的卡片；它不添加提示词段落、不添加工具，也不添加 transcript 条目。

#### Token 影响

无。卡片只改变用户看到的内容，从不改变模型收到的内容。

#### KV Cache 影响

无直接影响；没有任何模型请求携带本包产生的事实。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **不能关闭、排序或固定**——只有 Session 不再需要用户时卡片才消失；卡片栈保持列表顺序。
- **只表达状态，不表达数量**——卡片报告状态，从不报告由多少个 turn、message 或 subagent 产生。
- **定位依赖实测**——卡片栈跟随对话内容的角落，并在窗口与锚点 resize 时重新测量；若布局移动该元素却不触发 resize，卡片栈会停留在上次测量的位置。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。本包只拥有一个可释放的 slot 注册，其余都从既有座位读取。
