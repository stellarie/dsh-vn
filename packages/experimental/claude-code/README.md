---
description: "Run dsh conversations on Claude through the local Claude Code runtime, with dsh running every tool, for users choosing a Claude model and its reasoning effort."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-claude-code

English | [中文](README.zh.md)

## Summary

Install this Profile Bundle to use the Claude account already logged in to Claude Code as a dsh model. The bundle adds the `claude-code` route: the picker lists each Claude model with its reasoning efforts, and the transcript shows Claude thinking. Claude is the model only. dsh keeps its own system prompt, tools, approvals, questions, skills, and tool cards, and any dsh preset works with a Claude model. Claude Code built-in tools, `CLAUDE.md` files, hooks, and user MCP servers stay off. The package never touches a credential. It carries no stability promise.

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

Choose this bundle when Claude should think and answer inside a normal dsh session, with dsh running the tools. Log in to Claude Code on the host first. The bundle starts no login flow.

### Installing the Bundle

Install the package into the target Profile and restart that Profile.

```sh
dsh plugin --profile <name> add @deepseek-ai/dsh-experimental-claude-code
dsh --profile <name>
```

The patch layer inserts the `claude-code` row. It adds no agent preset, so select any dsh preset and pick a Claude model.

### Configuration

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `claude-code` | LLM provider route name; each mounted instance needs a unique value |
| `thinkingDisplay` | `summarized` | `summarized` shows Claude thinking summaries; `omitted` shows none |
| `env` | `{}` | Variables layered over the child environment after the scrub |
| `idleTimeoutMs` | `1800000` | Milliseconds an unused live query stays open before it closes |
| `toolTimeoutMs` | `86400000` | Milliseconds one dsh tool call may take, human approval included; keep it at 24 hours or more |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-experimental-claude-code) is the exhaustive source for every accepted field and its JSDoc.

### Choosing a model and effort

The picker lists the models the Claude Code runtime reports, with the reasoning efforts each one supports. The runtime is asked once per plugin instance. When that lookup fails, the picker serves `opus`, `sonnet`, `haiku`, and `claude-fable-5-1[1m]`, and the configurable-provider entry for the route carries the failure text. The model id `default` uses the model that Claude settings select. A change of model or effort ends the live query and resumes the Claude session under the new choice.

### What you get

Claude thinking streams as reasoning blocks and Claude text streams as the answer. When Claude calls a tool, the dsh response ends with a normal dsh tool call, so dsh shows the tool card, asks for approval, runs the tool, and sends the result on the next request. Several tool calls in one Claude message become several parallel dsh tool calls. The `ask_user_question` tool and every other dsh tool work as they do on any model.

A cancelled turn interrupts the query and ends the Claude Code process at once. Disposing the agent or unloading the plugin closes its live query too.

### Session continuity

Each dsh Session keeps one live Claude Code query. A tool round trip and a follow-up user message both feed that query, so Claude keeps its context without a resend. The query closes after `idleTimeoutMs` without use. When the history no longer matches the live query, for example after an edit, a compaction, a turn answered by another route, or a change of model, effort, or tool set, the adapter closes the query. It then resumes the Claude session after a final answer, or starts a fresh session from a labeled transcript.

### Authentication

The child process starts with `CLAUDECODE`, every `CLAUDE_CODE_*`, and every `ANTHROPIC_*` variable removed from the parent environment, then the `env` overlay. This blocks nested-session detection when dsh starts inside a Claude Code shell, and it blocks API-key billing, so the logged-in subscription pays. Under subscription login, the debug log of each query records `apiKeySource: none`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design concept

- **Claude is the model only.** The query runs with `tools: []`, `settingSources: []`, and `strictMcpConfig: true`. The dsh system text is the Claude system prompt.
- **dsh tools travel through one MCP server.** The in-process server `dsh` lists the request tools. A streamed `mcp__dsh__{name}` tool use becomes a dsh tool-call block with the Claude tool use id as its id. `canUseTool` allows those tools and denies every other tool.
- **A tool call parks the query.** When the assistant message stops with `tool_use`, the response ends with a tool-use finish. The MCP handler waits for the tool use id. The next request resolves it.
- **The replay envelope matches history to the live query.** `finish.replayState.response` holds `claudeSessionId`, `model`, `turn`, and `stopped`. The adapter continues the live query only when the last assistant message of this route carries the live turn.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: config schema, route and directory registration, disposal hooks |
| [`src/adapter.ts`](src/adapter.ts) | Model list, exact model metadata, and stream entry |
| [`src/stream.ts`](src/stream.ts) | One request: reuse or start a live query, then stream its turn |
| [`src/live.ts`](src/live.ts) | Live query, its turn stream, cancellation, idle timer, and registry |
| [`src/blocks.ts`](src/blocks.ts) | Claude content blocks mapped to dsh chunks |
| [`src/tool-bridge.ts`](src/tool-bridge.ts) | The `dsh` MCP server and parked tool calls |
| [`src/conversation.ts`](src/conversation.ts) | Continue, resume, or fresh decision and tool result mapping |
| [`src/models.ts`](src/models.ts) | Model catalog, efforts, and fallback list |
| [`src/environment.ts`](src/environment.ts) | Child environment scrub and overlay |
| [`src/permissions.ts`](src/permissions.ts) | Permission callback that allows only dsh tools |

### Run flow

The adapter finds the live Agent of `options.sessionId` and reads the working directory from its Session header. It fails the request when either is missing and never falls back to the process directory. It then plans the request against the live query: a continuation answers the parked tool calls and queues extra user text, other plans close the live query first. Auxiliary requests (session title, compaction) run once with no tools, are not persisted, and never stay live. A result error becomes a `finish` of kind `error` with a `CLAUDE_CODE_*` code. Those codes are not retryable, because a Claude Code run may already have acted.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Claude Code subagent provider](../../subagent/subagent-claude-code/README.md) — the one-shot delegation backend over the same SDK.
- [LLM service](../../llm/llm/README.md) — the adapter registry and stream contract this route plugs into.
- [Generated configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-experimental-claude-code) — every accepted config field.

-----

<a id="model-experience"></a>
## Model Experience

### Claude Code request

#### What the model sees

Claude receives the dsh system text as its system prompt and the dsh tools as MCP tools named `mcp__dsh__{name}`, with the dsh descriptions and JSON schemas. It receives the user messages of the turn, and tool results as MCP results, through one live query. When the query cannot continue, it receives a labeled transcript of the whole history. Claude Code built-in tools, skills, `CLAUDE.md` files, hooks, and user MCP servers are not present.

#### Token effect

The token count follows Claude Code. A continued turn pays for the new messages and results plus the live query context. A fresh turn pays for the transcript again. Every `usage` chunk reports the Claude messages of that dsh response.

#### KV Cache effect

Claude Code owns prompt caching. A live query keeps its own reusable prefix across tool round trips and follow-up turns. A fresh session, a model or effort change, a tool set change, or a different system text starts a new prefix.

### Auxiliary requests

#### What the model sees

A session-title or compaction request runs fresh with no tools. Its dsh system text becomes the Claude system prompt and its messages become the transcript. Thinking is off for titles.

#### Token effect

Each auxiliary request pays for its own transcript once and never continues.

#### KV Cache effect

Independent of the main conversation. The request persists no Claude session and reuses no prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **The live query lives in one process** — a restart, an idle timeout, or a history change loses it. The next request resumes a finished Claude session or sends a transcript, and a transcript shows earlier tool calls as text.
- **A long human approval keeps a query parked** — a parked query closes after `idleTimeoutMs` too, so an approval slower than the timeout costs a transcript restart.
- **System text is fixed per query** — a change of the dsh system text mid-session does not reach a live query.
- **Steering is best effort** — user text sent together with tool results reaches Claude as a queued message that Claude Code folds into the running turn.
- **Model discovery runs once per plugin instance** — a failed lookup keeps the fallback list until the Profile restarts. The Models settings page does not list this route, because the route registers no settings section.
- **No sampling controls** — `temperature`, `maxTokens`, and `stop` from a dsh request are not sent.
- **The SDK default process launch is used** — the shared dsh subprocess service does not own the Claude Code process.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This note is non-authoritative working context. The runtime dependency is pinned to Agent SDK 0.3.263, and the bridge relies on `_meta["claudecode/toolUseId"]` in MCP tool calls. An upgrade needs a re-run of the real smoke: `DSH_CLAUDE_CODE_E2E=1 pnpm exec vitest run -c vitest.e2e.config.ts packages/experimental/claude-code/tests/real-claude.e2e.ts`. Routing the Claude Code process through the shared subprocess service is undecided.

</details>

**Runtime invariant:** No companion is published. The route registration and the continue-or-restart decision own no relation that two independent observations can diverge on.
