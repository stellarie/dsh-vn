---
description: "Yuu blackboard tools and shared development skills for the dsh-vn imouto profile."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-imouto-dev-process

English | [中文](README.zh.md)

## Summary

This bundle provides blackboard validation, legal task transitions, and sixteen shared development skills for Yuu.

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

Mount the bundle after `dsh-base`. It registers blackboard tools and a scoped filesystem skill provider.

<a id="understand-the-implementation"></a>
## Understand the implementation

The package validates blackboard files before transitions. Its skill directory contains Yuu process guidance and imported driver-store skills.

<a id="further-exploration"></a>
## Further Exploration

- [Import record](UPSTREAM.md) records sources, revisions, exclusions, and authorization.
- [Yuu profile](../imouto-dev-profile/README.md) owns persona and preset-specific skills.

<a id="model-experience"></a>
## Model Experience

### Blackboard tools and shared skills

#### What the model sees

Yuu sees `blackboard_validate`, `blackboard_transition`, and sixteen discoverable skill descriptions.

#### Token effect

Tool schemas remain stable. A selected skill adds its loaded instructions to the current request.

#### KV Cache effect

Loading a skill appends context after the reusable prefix. Unused skills add no request text.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Blackboard transitions accept absolute Markdown paths only.
- Imported driver-store skills have no upstream license file. The repository owner authorized their import.

### Dev Note

<a id="dev-note"></a>

<details>
<summary>Working context for maintainers</summary>

Update skills by reviewed source revision. Keep private machine paths outside packaged instructions.

</details>

**Runtime invariant:** No runtime invariant companion is published. Focused tool and skill-catalog tests cover the owned relationships.
