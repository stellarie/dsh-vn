---
description: "在右侧边栏面板中显示正在运行的 imouto-driver 工作进程：一条主机路由读取驱动状态目录，一个浏览器标签页展示结果。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-imouto-driver-panel

[English](README.md) | 中文

## 概述

`dsh-experimental-imouto-driver-panel` 在右侧边栏面板中显示外部 imouto-driver 进程的工作进程。该驱动是独立的 MCP 服务器，不向 DSH 推送任何通道，因此本面板从驱动已经写入的文件推导工作进程列表。主机半边注册一条需认证的路由，返回有界快照；浏览器半边注册一个侧边栏标签页并轮询该路由。读取是纯增量的：驱动从不回读这些文件，因此本面板无法破坏驱动状态。

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

把本包加入某个配置的 bundle 列表。它自带的补丁插入一行，同时注册两个半边。

```yaml
- id: imouto-driver-panel
  name: '@deepseek-ai/dsh-experimental-imouto-driver-panel'
  config:
    root: 'C:\projects\example'
```

插入的行从 `IMOUTO_DRIVER_ROOT` 读取 `root`。配置补丁层可以替换该值，如上面的例子所示。`root` 缺失或无效时，配置加载失败。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `root` | 必填 | 面板读取的驱动根目录，其状态目录由它推导 |
| `maxWorkers` | `32` | 单个请求返回的最大工作进程行数 |
| `maxTailBytes` | `262_144` | 单个请求扫描的活动流最大尾部字节数 |

读取器也可以单独使用：

```ts
import { homedir } from 'node:os'
import { driverStateDirFor } from '@deepseek-ai/dsh-experimental-imouto-driver-panel/src/state-dir.ts'
import { readDriverSnapshot } from '@deepseek-ai/dsh-experimental-imouto-driver-panel/src/reader.ts'

const driverRoot = 'C:\\projects\\example'
const home = homedir()
const stateDir = driverStateDirFor(driverRoot, { home, platform: process.platform })
const snapshot = readDriverSnapshot({ stateDir, maxWorkers: 32, maxTailBytes: 262_144, now: new Date().toISOString() })
```

<a id="understand-the-implementation"></a>
## 理解实现

状态目录是 `<stateHome>/<label>-<sha256(normalizedRoot)[0..12]>`，其中 `stateHome` 为 `IMOUTO_STATE_HOME` 或 `<home>/.imouto/projects`。读取器从配置的根目录正向复现驱动自身的规则。它绝不从目录名反推根目录，因为哈希才是身份，标签只是基名。

快照有两个来源：

- `imoutos/*.json` 提供每个工作进程的身份、名称、目标和更新时间。
- `events.jsonl` 的尾部窗口提供每个工作进程的实时状态和最后一次记录的动作。

持久化的 `state` 字段绝不驱动结果。驱动在加载记录时会把任何非 `tucked` 的状态强制转换为 `tucked`，因此磁盘上的该字段是最后写入值而非实时值。实时状态来自窗口内最后一条 `state` 事件，没有该事件的工作进程读作 `unknown`。

两项边界都作用于完整结果：`maxWorkers` 限制行数，`maxTailBytes` 限制扫描窗口。状态目录缺失、事件文件缺失、尾部行被截断、记录在整体替换中被读到，都会得到空列表或部分列表，而不是抛出错误。

两个半边在一条需认证的路由上汇合。主机注册 `GET /api/imouto-driver-panel/snapshot`，按需读取并返回 JSON。浏览器标签页每三秒轮询一次，因此不需要主机定时器，也不需要推送通道。

本包不发布运行时不变式伴随包，因为它不持有可变投影：每个答案都在调用时从驱动的文件推导，两处注册都随挂载它的 fiber 一起释放。

### 源码索引

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | 主机插件：校验后的 `Config` 与快照路由 |
| [`src/state-dir.ts`](src/state-dir.ts) | 从驱动根目录推导状态目录，复现驱动的规则 |
| [`src/reader.ts`](src/reader.ts) | 有界的工作进程列表与活动读取 |
| [`src/panel.ts`](src/panel.ts) | 单个请求的主机侧读取 |
| [`src/wire.ts`](src/wire.ts) | 路由路径与轮询间隔，浏览器安全 |
| [`src/client/index.ts`](src/client/index.ts) | 标签页类型与面板主体的注册 |
| [`src/client/DriverPanel.tsx`](src/client/DriverPanel.tsx) | 每个工作进程一行，外加空列表与不可用提示 |
| [`src/types.ts`](src/types.ts) | 快照、工作进程、事件与选项类型 |

<a id="further-exploration"></a>
## 进一步探索

- 两种格式都由驱动拥有：`imouto-driver/src/runtime/store.ts`（工作进程记录）与 `imouto-driver/src/runtime/events.ts`（事件流）。
- [Agent Teams 浏览器界面](../client-ui-agent-team/README.zh.md) —— 同一个右侧边栏位置，展示 Team 成员。

<a id="model-experience"></a>
## 模型体验

### 无模型可见表面

#### 模型看到什么

没有。`dsh-experimental-imouto-driver-panel` 不注册任何工具、提示段落或会话事件，因此既不添加请求文本，也不添加会话记录条目。

#### token 影响

无。读取器只把快照返回给调用方，不向请求写入任何内容。

#### KV 缓存影响

无。本包不追加任何内容，因此没有缓存前缀发生变化。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延期工作

- **没有随附配置列出它。** 挂载面是配置的 `dsh.profile.bundles` 列表加上一条依赖声明，因为裸行在未声明时无法解析。
- **只读。** 面板只显示工作进程，无法操控它们。操控需要驱动的 `send` 工具，而浏览器无法调用它。
- **轮询而非推送。** 驱动不发布任何 DSH 通道，因此面板每三秒轮询一次。在一个间隔内启动并结束的工作进程可能完全被漏掉。
- **不保存偏移量。** 每次快照都重新读取尾部窗口，而不是从字节偏移续读，因此一次轮询的代价是窗口大小而非新增字节数。文件缩小或被替换无需特殊处理。
- **整条记录解析。** 工作进程记录被完整解析，包括其对话历史，因为驱动把它写成一个 JSON 文档。`maxWorkers` 限制条数；按记录限制字节数的工作延期。
- **面板主体尚未做过可视化确认。** 主机侧读取已在挂载配置下针对实时驱动状态目录返回快照路由。浏览器标签页尚未在会话中针对该驱动渲染过。
- **root 没有可用的默认值。** bundle 补丁无法得知部署的驱动根目录，因此该行必须提供它。缺少 root 会在配置校验时失败，而不是挂载一个读不到任何内容的面板。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>面向维护者的工作上下文 — 点击展开</summary>

无。

</details>
