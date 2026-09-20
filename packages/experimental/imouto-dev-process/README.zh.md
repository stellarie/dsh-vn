---
description: "供 dsh-vn 妹妹配置使用的 Yuu 黑板工具和共享开发技能。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-imouto-dev-process

[English](README.md) | 中文

## 概述

此 bundle 为 Yuu 提供黑板验证、合法任务转换和十四个共享开发技能。

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

在 `dsh-base` 之后挂载此 bundle。它注册黑板工具和有范围的文件系统技能提供方。

<a id="understand-the-implementation"></a>
## 理解实现

本包在转换前验证黑板文件。技能目录包含 Yuu 流程指导和导入的 driver-store 技能。

<a id="further-exploration"></a>
## 进一步探索

- [导入记录](UPSTREAM.md)记录来源、版本、排除项和授权。
- [Yuu 配置](../imouto-dev-profile/README.zh.md)拥有人格和预设专用技能。

<a id="model-experience"></a>
## 模型体验

### 黑板工具和共享技能

#### 模型看到的内容

Yuu 看到 `blackboard_validate`、`blackboard_transition` 和十四个可发现技能说明。

#### Token 影响

工具 schema 保持稳定。选定技能会把已加载指令添加到当前请求。

#### KV Cache 影响

加载技能会在可复用前缀后追加上下文。未使用的技能不增加请求文本。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 黑板转换仅接受绝对 Markdown 路径。
- 导入的 driver-store 技能没有上游许可证文件。仓库所有者已授权导入。

### 开发备注

<a id="dev-note"></a>

<details>
<summary>维护者的工作上下文</summary>

按已评审的来源版本更新技能。不要把私有机器路径写入打包指令。

</details>

**运行时不变式：** 不发布运行时不变式伴生入口。重点工具和技能目录测试覆盖所属关系。
