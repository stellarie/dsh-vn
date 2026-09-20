---
description: "The optional OpenAI Codex bundle for users and maintainers who route Codex models, standalone search, and image tools through a ChatGPT subscription instead of an API key."
kind: "package-reference"
---

# @stellarie/dsh-imouto-codex

English | [中文](README.zh.md)

## Summary

`@stellarie/dsh-imouto-codex` adds the `openai-codex` provider to dsh. It signs in with a ChatGPT subscription through OAuth, advertises the installed Codex model catalog, and answers standalone web searches with the Codex search endpoint. Optional features add fast mode, backend-authorized model fallback, an `imagegen` tool, and HTTP(S) input for `read_image`. A browser settings page and an optional terminal command tree expose the account, the account usage limits, and every preference. The bundle stays dormant until a profile patch mounts it.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Mount the bundle in a profile when a person signs in with a ChatGPT subscription rather than an API key. The bundle patch `cordis.patch.yml` adds the provider row, selects `openai-codex` for `agent-default-model` and `web.searchProvider`, and adds a dormant terminal row.

```yaml
- insert:
    - id: llm-openai-codex
      name: '@stellarie/dsh-imouto-codex'
    - id: openai-codex-tui
      name: '@stellarie/dsh-imouto-codex/tui'
      inject: [openAICodex]
```

### Sign in

Open **Settings → OpenAI Codex** and select **Sign in with ChatGPT**. The plugin prints the authorization page, waits for the loopback callback, and stores the result in `$DSH_HOME/.openai-codex-auth.json`. The plugin never reads or changes `~/.codex/auth.json`. A browser origin must be approved on the host before the browser flow runs; `OpenAICodexTrustedOriginsStore` records those exact origins.

### Choose search and image behavior

The `llm-openai-codex` row accepts `searchMode`, `searchModel`, `searchContextSize`, `searchMaxOutputTokens`, `contextWindow`, `models`, `modifyReadImage`, `shareImagegenWithOtherModels`, `useWebSocketContextReuse`, `useNativeCompaction`, `fastModeDefault`, `automaticModelFallback`, `proxyMode`, and `proxyUrl`. A saved user setting wins over a bundle value.

### Maintenance operations

`src/bin.ts` exports `run()` for a profile-owned front door. It reports non-secret credential metadata (`doctor`, `status`), starts or ends a login (`login`, `logout`), repairs retired search events in stored sessions (`repair-session`), and manages browser origins (`trust-origin`, `trusted-origins`, `untrust-origin`). The package publishes no executable, because only `dsh` profiles launch dsh applications.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Plugin rows

`apply()` registers the credential store, the model adapter, the standalone search provider, the auth routes, and the two tools. The terminal row registers `/codex` only when a `tuiCommandTrees` service is present. Both rows publish no state before the operation that owns it succeeds.

### Credential store

`OpenAICodexCredentialStore` writes one JSON document under `$DSH_HOME`, guarded by `withFileLock` and `writeFileAtomic`. The OAuth exchange runs in `oauth-provider.ts`, and every provider call goes through `OpenAICodexProxyTransport`, so one proxy preference applies to model and search requests together.

### Licensing and attribution

The package derives from `Yan-Zero/dsh-codex` at commit `b726c295dde2490dc2c8df0ff95bead99a3646ed`. The repository publishes every `@deepseek-ai/dsh-*` package under the MIT license, so this manifest declares MIT. The upstream Apache-2.0 terms still cover the imported files: `LICENSE` keeps the upstream Apache-2.0 text, and `UPSTREAM.md` records the source repository, the imported commit, and the marker that stays unchanged. `NOTICE` obligations are met by that pair, which travels in `files`.

<a id="further-exploration"></a>
## Further Exploration

- [docs/design.md](docs/design.md) describes the request path, the credential document, and the compatibility checks.
- [docs/session-repair.md](docs/session-repair.md) describes the retired-event repair.
- [INSTALL.md](INSTALL.md) is the profile installation runbook.
- [UPSTREAM.md](UPSTREAM.md) records the upstream source and its license.

## Model Experience

### Codex model request

#### What the model sees

The selected Codex model receives the harness system prompt, the history mapped to the Responses API, the tool schemas allowed for the agent, and the sampling fields the route supports. The adapter sends `store: false` by default and reuses matching context through `previous_response_id` only when `useWebSocketContextReuse` is on. `read_image` input extension adds the fetched URL text to the tool result, and an `imagegen` result adds a generated-image attachment reference.

#### Token effect

Input tokens are the provider tokenization of the converted request. Reasoning, text, tool-call, and image chunks arrive as harness chunks, and usage statistics come from the provider report. A context-window preference only changes the advertised capacity; it adds no prompt text.

#### KV Cache effect

The conversion preserves message order, so an unchanged prefix stays reusable. Changing the model, the reasoning effort, or the tool set changes the prefix at that point. Native compaction replaces an earlier region with one encrypted item, so reuse ends there for every later request.

### Standalone web search

#### What the model sees

A search selects `OpenAICodexSearchProvider`, which sends the query to the Codex search endpoint with the configured mode, context size, and output budget, and returns the mapped results as the web-search tool result.

#### Token effect

The result body is the provider answer, trimmed to `searchMaxOutputTokens`. The query and the result add tokens to the tool call that requested them.

#### KV Cache effect

Search results enter the conversation as a tool result at their own position, so an unchanged earlier prefix stays reusable. Changing `searchModel`, `searchMode`, or `searchContextSize` changes later requests only.

### Image tools

#### What the model sees

`imagegen` accepts a prompt and optional input images and returns either a workspace path or an attachment reference. With `modifyReadImage` on, `read_image` also accepts an HTTP(S) URL and returns the fetched bytes as an image block. `ImageToolPolicy` refuses a call when the selected model does not advertise image input.

#### Token effect

A returned image occupies image tokens for the selected model. `imagegen.output_path` adds one path string to the result. The refuse message adds one short sentence and no image.

#### KV Cache effect

Tool results append at their own position, so earlier turns stay reusable. Turning `shareImagegenWithOtherModels` or `modifyReadImage` off changes the tool list or the tool behavior, which changes the prefix from that request on.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits are current package constraints, not a task list.

- **The package is optional and off by default** — a profile must mount the bundle patch, and no shipped profile does.
- **Browser login needs an approved origin** — a browser request from an unapproved origin is refused, and the person must approve the exact origin on the host first.
- **A login attempt is not durable** — a page reload in the middle of the sign-in abandons the attempt.
- **`useWebSocketContextReuse` depends on the provider** — the reuse path degrades to a stateless request when the provider does not answer the matching context.
- **Native compaction is opt-in** — `useNativeCompaction` falls back to harness compaction when the V2 endpoint is unavailable.
- **Model fallback follows the account backend** — `automaticModelFallback` never invents a replacement model that OpenAI did not authorize.
- **The maintenance operations need a profile front door** — the package ships no executable, because only `dsh` profiles launch dsh applications.
- **The upstream Apache-2.0 files keep their upstream terms** — the MIT declaration covers the repository package, and the Apache-2.0 text in `LICENSE` covers the imported sources.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is non-authoritative working context: notes and directions for maintainers. Shipped behavior and accepted rationale live in the sections above, the package code, and the linked documents.

- The provider identifier stays `openai-codex`, and the marker `dsh-openai-codex-compaction-4f5cf1b7-v1` stays unchanged, so existing encrypted compaction checkpoints stay readable.
- The package keeps its own model-cache environment variable `DSH_CODEX_MODELS_CACHE` and reads Codex model metadata only. It never reads Codex credentials.

</details>

**Runtime invariant:** No runtime invariant companion is published because the LLM and web registries own provider uniqueness and disposal, and every credential and model reply crosses a file or network boundary whose validation runs in its owning operation.
