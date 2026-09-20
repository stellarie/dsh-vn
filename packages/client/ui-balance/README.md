---
description: "DeepSeek account balance readout beside the Conversation composer, with a show and hide toggle."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-balance

English | [中文](README.zh.md)

## Summary

`dsh-client-ui-balance` adds one composer-footer toggle that reveals the account's topped-up balance. The Host reads the provider balance with the configured credential, so the browser never receives the key.

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

Open the toggle below the composer. It starts as "Show topped-up balance". One click reveals the currency and the topped-up amount. A second click hides the reading and restores that label.

The reading reports one of four states:

- The currency and the topped-up amount.
- No credential is configured.
- The balance is unavailable right now.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The Host registers one authenticated route. It resolves the credential, calls the provider balance endpoint, and caches the answer for one minute. Showing the readout asks for a fresh read, so a reopened readout is current. A refused or unparsable read becomes a display state, never an error.

The Client registers the Conversation composer footer slot. It reads that route while the toggle is open, and the toggle state stays component-local.

The provider payload is parsed at the wire boundary. Every amount arrives as a string, and a row missing any field reads as unavailable.

-----

<a id="further-exploration"></a>
## Further Exploration

- [Conversation UI](../ui-conversation/README.md) owns the presentation slots this package occupies.

-----

<a id="model-experience"></a>
## Model Experience

### Balance readout

#### What the model sees

Nothing. `dsh-client-ui-balance` registers no prompts, messages, tools, or results.

#### Token effect

None. The balance readout never enters model context.

#### KV Cache effect

None. The package adds no model-visible input.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The readout needs a configured credential. Without one it reports that state instead of an amount.
- The provider balance endpoint is DeepSeek-specific. Another provider needs its own reader.
- The provider refreshes the balance with a short delay, so a fresh top-up can lag.
- Only the first balance row is shown; an account holding several currencies sees one of them.

### Dev Note

<a id="dev-note"></a>

<details>
<summary>Working context for maintainers</summary>

Keep the credential on the Host. Never send the key, or a payload beyond the parsed row, to the browser.

</details>

**Runtime invariant:** No companion is published. Typed parsing, one bounded route, and focused tests cover owned relationships.
