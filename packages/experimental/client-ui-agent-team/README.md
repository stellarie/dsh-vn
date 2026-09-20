---
description: "Use and debug the experimental Web Agent Teams roster, shared task board, and teammate navigation panel."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-agent-team

English | [中文](README.zh.md)

## Summary

This package adds an Agent Teams action to the Web conversation header, where a user can inspect the roster, manage the task board, and open a teammate conversation. A labelled **Open in sidebar** control in the dialog toolbar opens a right-Sidebar tab listing each teammate with its current task and one steering line. It reads authoritative Team state through `ctx.remote.agentTeams` and keeps child-history navigation on the stable addressed-subagent path. Choose it through the published experimental Agent Teams Web profile. The browser projection does not extend the stable API Proxy, store Team state, or register model-facing input.

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

Install the package through [`@deepseek-ai/dsh-experimental-agent-team-web-profile`](../agent-team-web-profile/README.md) after the stable Web bundle and the Host-side Agent Teams profile. The Web Client loader mounts the `/client` export; the root Host export is inert, and the package has no user configuration fields.

### Inspect and navigate the roster

Opening the panel calls `agentTeams/view`. Roster rows show durable names, runtime status, model, and diagnostics. Selecting a healthy teammate refreshes the existing direct-child catalog and opens the ordinary `{ parentSessionId, childSessionId, mode: 'continuable' }` address. History and later human prompts continue through the stable addressed-subagent conversation path; this package adds no Team-specific address field.

### Manage the task board

The task board shows task identity, owner, blockers, readiness, advisory write scopes, and overlap warnings. A user can create, edit, assign or unassign, complete, reopen, and delete tasks through `agentTeams/createTask` and `agentTeams/updateTask`. Every update sends the displayed revision, and create or update rejections remain explicit business results.

One component renders the board, and both surfaces show it: the header dialog and the right-Sidebar stack. A task action therefore behaves the same wherever the user reaches it.

### Steer a teammate from the right sidebar

The labelled **Open in sidebar** control in the dialog toolbar opens the Team stack as a right-Sidebar tab, beside Refresh Team. The tab type registers through `ctx.sidebarRightTabs.register`; the control opens it with `ctx.sidebarRight.openTab`, so a second click reveals the open tab instead of adding another.

The stack carries one row per teammate: the durable name, the runtime status, and the subject of the `in_progress` task that member owns. The Lead's own row is absent, because a Team member cannot message itself. A teammate with no started task shows the empty-state line.

Each row carries a one-line box that sends one steering message to that teammate through `agentTeams/sendMessage`. The row reports the mailbox outcome as delivered or queued after the call settles, and clears the box. A rejected call leaves the text in place and shows the failure line, so the user can retry after fixing the cause.

Below the rows, the stack renders the same shared task board the dialog does.

The stack stays live while it is mounted: it re-reads the Team view on a short interval, so teammate status and task progress track reality without a manual refresh. A steering send and every task mutation reload immediately, so the user's own action never waits for the next tick. A failed read keeps the last good view — rows and board both stay on screen — and shows the failure line instead of blanking the pane.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The Client export mounts the generated `ctx.remote.agentTeams` contribution from [`@deepseek-ai/dsh-experimental-agent-team/remote`](../agent-team/README.md), then registers its locale dictionaries, one conversation-header slot, and one right-Sidebar tab type with its body. Disposing the plugin fiber removes every registration.

Starting a create or update invalidates older refreshes. Success reloads the complete Team view so every task's derived fields stay current. A `team-task-conflict` result displays a stale-state notice only after that reload succeeds; a reload failure remains visible instead. Editing task text or scopes and changing dependencies use two sequential compare-and-set mutations because the Team service exposes them as separate actions.

The board owns its drafts, its pending-task bookkeeping, and every mutation, and it takes the view plus three view-lifecycle callbacks from whichever surface renders it. Each surface still owns its own load, refresh cadence, and failure line, so the two can refresh independently without a second mutation path.

The stack reloads the same view on mount and on demand. The current item of one row is the first `in_progress` task whose `ownerName` equals that member's name, so one loader serves both the dialog and the stack. A steering call and a reload carry the session they started in, and a result that arrives after the conversation switched sessions is dropped.

| File | Role |
|---|---|
| [`src/client/mount.ts`](src/client/mount.ts) | Generated Remote, locale, navigation, slot, and right-Sidebar registrations |
| [`src/client/TeamAction.tsx`](src/client/TeamAction.tsx) | Header action, roster, and dialog view lifecycle |
| [`src/client/TeamTaskBoard.tsx`](src/client/TeamTaskBoard.tsx) | The shared task board and every task mutation |
| [`src/client/TeamSidebar.tsx`](src/client/TeamSidebar.tsx) | Right-Sidebar teammate stack, steering state, and the shared board |
| [`src/client/useTeamView.ts`](src/client/useTeamView.ts) | The Team view lifecycle one surface owns |
| [`src/client/team-remote.ts`](src/client/team-remote.ts) | Remote result aliases and task request types |
| [`src/client/team-view.ts`](src/client/team-view.ts) | Current-task lookup and status/failure labels |
| [`src/client/locales.ts`](src/client/locales.ts) | English and Chinese panel copy |
| [`src/index.ts`](src/index.ts) | Inert Host entry |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams Web profile](../agent-team-web-profile/README.md) — the published opt-in bundle that mounts this Client plugin.
- [Agent Teams service](../agent-team/README.md) — authoritative roster, task, and Remote behavior.
- [Conversation UI](../../client/ui-conversation/README.md) — the stable header slot and addressed-subagent navigation surface.
- [Experimental packages](../README.md) — incubation status and publication policy.

-----

<a id="model-experience"></a>
## Model Experience

None, as this browser projection and task control surface registers no model-facing input.

#### KV Cache effect

No direct effect; the Team tools and ordinary conversation submission own any later model-visible use.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Polled, not pushed** — the stack re-reads the Team view on an interval while it is open; nothing pushes Team changes to the browser, so a mutation made elsewhere appears at the next read.
- **Independent views** — each surface loads and reloads its own Team view, so the dialog can show a task list one mutation behind the stack until either refreshes.
- **Two paths into a teammate** — the stack's steering box uses the durable Team peer mailbox, while a human message typed after navigation uses the stable addressed-subagent prompt path instead.
- **Text-only steering** — one row sends one text line to one named teammate; a row cannot attach content, interrupt a turn, or spawn a teammate.
- **No lifecycle or workspace controls** — the panel cannot spawn, rename, delete, or interrupt teammates, and write scopes remain advisory metadata.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. RPC is authoritative and the package owns only disposable slot, tab-type, and Remote registrations.
