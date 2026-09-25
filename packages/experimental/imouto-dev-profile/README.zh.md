---
description: "供 imouto-yuu 配置使用的仓库自有 Yuu 人格、智能体预设和开发技能。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-imouto-dev-profile

[English](README.md) | 中文

## 概述

此 bundle 注册 Yuu 的人格、可选模型预设、仓库指令加载和三个编排技能。

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

使用随附的 `imouto-yuu` 配置。启动前把 `IMOUTO_DRIVER_ENTRY` 设为可读的外部 driver 入口。

<a id="understand-the-implementation"></a>
## 理解实现

预设加载项目 `AGENTS.md` 文件、挂载 Yuu 工具，并发现打包的预设和流程技能。

<a id="further-exploration"></a>
## 进一步探索

- [导入记录](UPSTREAM.md)记录 Yuu 来源版本和本地修复。
- [流程 bundle](../imouto-dev-process/README.zh.md)拥有共享技能和黑板工具。

<a id="model-experience"></a>
## 模型体验

### Yuu 人格和编排

#### 模型看到的内容

`yuu` 预设添加 Yuu 人格、仓库指令、工具和三个编排技能说明。

#### Token 影响

人格和适用的指令文件进入每次请求。选定技能会添加已加载正文。

#### KV Cache 影响

稳定的人格和指令形成可复用前缀。之后加载的技能追加上下文。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 外部 imouto-driver 保持独立安装和许可。
- `IMOUTO_DRIVER_ENTRY` 缺失或不可读时启动失败。

### 开发备注

<a id="dev-note"></a>

<details>
<summary>维护者的工作上下文</summary>

保持 driver 外置。保持人格和技能引用可移植。

</details>

**运行时不变式：** 不发布运行时不变式伴生入口。配置组合和预设测试覆盖所属关系。
