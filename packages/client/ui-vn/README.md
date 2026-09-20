---
description: "Optional visual-novel presentation for the existing Conversation UI, with managed state images and translucent chat styling."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-vn

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-vn` adds managed character images behind the existing Conversation UI. It preserves Chat rendering, tools, attachments, questions, and composer behavior.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Open Visual novel below the composer. Enable the presentation, select state images, then adjust panel opacity, blur, and font.

The stage selects images for idle, thinking, responding, decision, tool, and error states. Missing state images fall back to idle.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The Host stores validated PNG, JPEG, and WebP files under the configured Harness asset root. Settings retain only content-addressed identifiers.

The Client registers Conversation background and footer slots. It reads existing Session and Chat state without changing their event formats.

-----

<a id="further-exploration"></a>
## Further Exploration

- [Conversation UI](../ui-conversation/README.md) owns the presentation slots.
- [Chat UI](../ui-chat/README.md) owns the unchanged message renderer.

-----

<a id="model-experience"></a>
## Model Experience

### Visual presentation

#### What the model sees

Nothing. `dsh-client-ui-vn` registers no prompts, messages, tools, or results.

#### Token effect

None. Presentation settings and images never enter model context.

#### KV Cache effect

None. The package adds no model-visible input.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Manual visual acceptance remains necessary for image composition and text contrast.
- The first release supports one full-window image for each state.

### Dev Note

<a id="dev-note"></a>

<details>
<summary>Working context for maintainers</summary>

Keep ChatView and InputBar unchanged. Extend presentation through the Conversation slots.

</details>

**Runtime invariant:** No companion is published. Typed settings, bounded routes, and focused lifecycle tests cover owned relationships.
