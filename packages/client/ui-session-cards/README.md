---
description: "Show the Sessions that need attention as small cards while the left sidebar is collapsed."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-session-cards

English | [中文](README.zh.md)

## Summary

While the left sidebar is collapsed, this package floats a stack of small cards at the left of the conversation area. Each card names one Session that is running, is waiting on a decision, or finished without being opened, and shows only its state indicator and its title. Clicking a card makes that Session current. The stack is hidden while the sidebar is shown. Cards read the standard `useSessions`, `useSessionStatus`, and `useWorkspaces` seats and switch Sessions through `ctx.uiWorkspace`; the package adds no host service, no store, and no model-facing input.

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

The Web application bundle mounts the package; it has no user configuration fields and needs no companion host package. Collapse the left sidebar to show the stack, and expand it to hide the stack again.

### What earns a card

One card appears for each Session that wants the user:

- **Running** — the Session is working.
- **Waiting on a decision** — a Session-scoped UI consumer awaits this user: an approval, a plan review, or a question.
- **Finished, not opened** — the Session stopped while off screen and nothing opened it since.

A card never appears for the Session on screen, for a blank placeholder, for an archived Session, or for a subagent child. A pending decision outranks the Session's own activity, which outranks the completion reminder.

### Switch Sessions

Selecting a card makes that Session current through `ctx.uiWorkspace.openSession`, the same navigation the Workspace rows use. The cards then follow the new Session: the Session just opened no longer needs a card, and the stack hides while the sidebar is expanded.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser half registers one `conversation.input.dock` entry, so the stack mounts with the Session on screen and leaves with it. The component portals its own element to the document body and places it from the conversation content's measured corner, which keeps the transcript's scrolling and clipping out of the picture.

Two facts arrive through injected sources rather than props: the collapsed sidebar, read from the frame root's `data-sidebar-collapsed` attribute, and the Session navigation callback, which closes over `ctx.uiWorkspace`. Everything else is a standard seat: `useSessions` for the list, `useSessionStatus` for the live status, and `useWorkspaces` for the archive set.

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Dictionaries and the dock registration |
| [`src/client/SessionCards.tsx`](src/client/SessionCards.tsx) | Card stack, placement, and the injected face |
| [`src/client/attention.ts`](src/client/attention.ts) | Which Sessions earn a card, and which state each reports |
| [`src/client/sidebar-collapsed.ts`](src/client/sidebar-collapsed.ts) | The frame attribute as an observable |
| [`src/client/locales.ts`](src/client/locales.ts) | English and Chinese copy |
| [`src/index.ts`](src/index.ts) | Inert Host entry |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Workspace browser](../../client/ui-workspace/README.md) — the Session list, status, and navigation this package reads.
- [Conversation UI](../../client/ui-conversation/README.md) — the dock seat and the conversation area the stack is placed from.
- [Web client architecture](../../../docs/subsystems/web-client.md) — slots, hooks, and the presentation layers.

-----

<a id="model-experience"></a>
## Model Experience

### Attention cards

#### What the model sees

Nothing. The stack reads `useSessions`, `useSessionStatus`, and `useWorkspaces`, and it renders its own cards through `conversation.input.dock`; it adds no prompt section, no tool, and no transcript entry.

#### Token effect

None. A card changes what the user sees, never what the model receives.

#### KV Cache effect

No direct effect; no model request carries a fact this package produced.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No dismissal, order, or pinning** — a card disappears only when its Session stops needing the user; the stack keeps list order.
- **State, not volume** — a card reports the state, never how many turns, messages, or subagents produced it.
- **Placement is measured** — the stack follows the conversation content's corner and re-measures on window and anchor resize; a layout that moves that element without resizing it leaves the stack at its last measurement.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The package owns one disposable slot registration and reads the rest from existing seats.
