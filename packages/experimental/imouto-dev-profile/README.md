---
description: "Repository-owned Yuu persona, agent preset, and development skills for the imouto-yuu profile."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-imouto-dev-profile

English | [中文](README.zh.md)

## Summary

This bundle registers Yuu's persona, model-selectable preset, repository instruction loading, and three orchestration skills.

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

Use the shipped `imouto-yuu` profile. Set `IMOUTO_DRIVER_ENTRY` to a readable external driver entry before launch.

<a id="understand-the-implementation"></a>
## Understand the implementation

The preset loads project `AGENTS.md` files, mounts Yuu's tools, and discovers packaged preset and process skills.

<a id="further-exploration"></a>
## Further Exploration

- [Import record](UPSTREAM.md) records the Yuu source revision and local repairs.
- [Process bundle](../imouto-dev-process/README.md) owns shared skills and blackboard tools.

<a id="model-experience"></a>
## Model Experience

### Yuu persona and orchestration

#### What the model sees

The `yuu` preset adds Yuu's persona, repository instructions, tools, and three orchestration skill descriptions.

#### Token effect

The persona and applicable instruction files enter each request. Selected skills add their loaded bodies.

#### KV Cache effect

Stable persona and instructions form the reusable prefix. Later skill loads append context.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The external imouto-driver remains separately installed and licensed.
- Launch fails when `IMOUTO_DRIVER_ENTRY` is missing or unreadable.

### Dev Note

<a id="dev-note"></a>

<details>
<summary>Working context for maintainers</summary>

Keep the driver external. Keep persona and skill references portable.

</details>

**Runtime invariant:** No runtime invariant companion is published. Profile composition and preset tests cover the owned relationships.
