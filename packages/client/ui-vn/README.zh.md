---
description: "现有会话界面的可选视觉小说展示，包含受管理的状态图片和半透明聊天样式。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-vn

[English](README.md) | 中文

## 概述

`dsh-client-ui-vn` 在现有会话界面后添加受管理的角色图片。它保留聊天渲染、工具、附件、问题和输入框行为。

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

打开设置，然后选择视觉小说。启用展示并选择状态图片。设置背景适配、缩放与焦点。为聊天记录、输入框和文件代码各选一种字体。然后设置各表面不透明度和面板模糊。

四个不透明度字段接受整数百分比：聊天输入框、用户消息、文件卡片和文件卡片标题。展示开启时，聊天记录自带的回到底部控件会跳动。

舞台为闲置、思考、回复、决策、工具和错误状态选择图片。缺少的状态图片回退到闲置图片。

-----

<a id="understand-the-implementation"></a>
## 理解实现

主机把通过验证的 PNG、JPEG 和 WebP 文件存入配置的 Harness 资源根目录。设置仅保留内容寻址标识符。

客户端注册会话背景插槽和一个设置分区。它读取现有会话和聊天状态，不更改事件格式。

各表面不透明度和角色字体通过舞台发布的 CSS 变量生效。画布探测列出字体选择器可选的已安装字体。

-----

<a id="further-exploration"></a>
## 进一步探索

- [会话界面](../ui-conversation/README.zh.md)拥有展示插槽。
- [聊天界面](../ui-chat/README.zh.md)拥有未更改的消息渲染器。

-----

<a id="model-experience"></a>
## 模型体验

### 视觉展示

#### 模型看到的内容

无。`dsh-client-ui-vn` 不注册提示词、消息、工具或结果。

#### Token 影响

无。展示设置和图片不会进入模型上下文。

#### KV Cache 影响

无。本包不添加模型可见输入。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 图片构图和文字对比度仍需手动验收。
- 首个版本为每个状态支持一张全窗口图片。
- 背景适配、缩放和焦点对所有状态图片统一生效。
- 文件与代码字体同时作用于文件卡片标题，因为两者读取同一个令牌。
- Markdown 代码块保留不透明的标题外层，因此那里的标题不透明度看不到背景。

### 开发备注

<a id="dev-note"></a>

<details>
<summary>维护者的工作上下文</summary>

保持 ChatView 和 InputBar 不变。通过会话插槽扩展展示，把偏好放进设置分区。样式表通过 `data-chat-to-bottom` 钩子为聊天自带的回到底部控件加动画。

</details>

**运行时不变式：** 不发布伴生入口。类型化设置、有限路由和重点生命周期测试覆盖所属关系。
