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

Open Settings, then Visual novel. Enable the presentation and select state images. Set the background fit, zoom, and focus. Choose a font for the chat log, the input box, and file code. Then set the surface opacities and the panel blur.

Four opacity fields take a whole percentage: the chat input box, user messages, file cards, and file card headers. The chat log's own back-to-bottom control bounces while the presentation is on.

The stage selects images for idle, thinking, responding, decision, tool, and error states. Missing state images fall back to idle.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The Host stores validated PNG, JPEG, and WebP files under the configured Harness asset root. Settings retain only content-addressed identifiers.

The Client registers the Conversation background slot and one Settings section. It reads existing Session and Chat state without changing their event formats.

Surface opacities and role fonts ride CSS variables the stage publishes. A canvas probe lists the installed families the font selectors offer.

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
- One background fit, zoom, and focus applies to every state image.
- The file and code font also drives file card headers, because both read one token.
- A markdown code block keeps an opaque header wrapper, so header opacity reveals no stage there.

### Dev Note

<a id="dev-note"></a>

<details>
<summary>Working context for maintainers</summary>

Keep ChatView and InputBar unchanged. Extend presentation through the Conversation slots, and put preferences in a Settings section. The sheet animates the Chat's back-to-bottom control through its `data-chat-to-bottom` hook.

</details>

**Runtime invariant:** No companion is published. Typed settings, bounded routes, and focused lifecycle tests cover owned relationships.
