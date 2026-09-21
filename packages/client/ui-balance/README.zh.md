---
description: "会话输入框旁的 DeepSeek 账户余额读数，带有显示与隐藏开关。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-balance

[English](README.md) | 中文

## 概述

`dsh-client-ui-balance` 在输入框下方添加一个开关，用于显示账户的充值余额。主机使用已配置的凭据读取服务商余额，浏览器不会收到密钥。

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

打开输入框下方的开关。初始显示为“显示充值余额”。点击一次显示币种与充值金额。再次点击隐藏读数并恢复该标签。

读数报告以下状态之一：

- 币种与充值金额。
- 尚未配置凭据。
- 暂时无法获取余额。

-----

<a id="understand-the-implementation"></a>
## 理解实现

主机注册一个需认证的路由。它解析凭据、调用服务商余额端点，并缓存一分钟。每次显示读数都会请求最新读取，因此重新打开的读数是当前的。被拒绝或无法解析的读取变成显示状态，而不是错误。

客户端注册会话输入框页脚插槽。开关打开时读取该路由，开关状态保留在组件内部。

服务商载荷在传输边界解析。金额以字符串返回，缺少任一字段的行按不可用处理。

-----

<a id="further-exploration"></a>
## 进一步探索

- [会话界面](../ui-conversation/README.zh.md) 拥有本包占用的展示插槽。

-----

<a id="model-experience"></a>
## 模型体验

### 余额读数

#### 模型看到什么

没有。`dsh-client-ui-balance` 不注册任何提示、消息、工具或结果。

#### token 影响

无。余额读数不会进入模型上下文。

#### KV 缓存影响

无。本包不添加模型可见输入。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 读数需要已配置的凭据。没有凭据时报告该状态而非金额。
- 服务商余额端点是 DeepSeek 专有的。其他服务商需要各自的读取实现。
- 服务商刷新余额有短暂延迟，刚充值的金额可能滞后。
- 仅显示第一个余额行；持有多种货币的账户只会看到其中一种。

### 开发备注

<a id="dev-note"></a>

<details>
<summary>维护者的工作上下文</summary>

把凭据保留在主机端。绝不把密钥或解析结果之外的载荷发送到浏览器。

</details>

**运行时不变式：** 不发布伴生入口。类型化解析、单个有限路由和重点测试覆盖所属关系。
