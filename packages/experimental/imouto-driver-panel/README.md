---
description: "Show the live imouto-driver workers in a right-sidebar pane: one host route over the driver state directory and one browser tab."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-imouto-driver-panel

English | [中文](README.zh.md)

## Summary

`dsh-experimental-imouto-driver-panel` shows the live workers of an external imouto-driver process in a right-sidebar pane. The driver is a separate MCP server, and it publishes no push channel to DSH, so the panel derives its roster from the files the driver already writes. The host half registers one authenticated route that answers a bounded snapshot; the browser half registers a sidebar tab and polls that route. The read is additive: the driver never reads these files back, so the panel cannot corrupt driver state.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Add the package to a profile's bundle list. Its own patch inserts one row, which registers both halves; the row requires the driver root.

```yaml
- id: imouto-driver-panel
  name: '@deepseek-ai/dsh-experimental-imouto-driver-panel'
  config:
    root: 'C:\Users\you\chibipop'
```

| Field | Default | Meaning |
|---|---|---|
| `root` | required | Absolute driver root whose state directory the panel reads |
| `maxWorkers` | `32` | Maximum worker rows one request answers |
| `maxTailBytes` | `262_144` | Maximum trailing bytes of the activity stream one request scans |

The reader is also usable on its own:

```ts
import { driverStateDirFor } from '@deepseek-ai/dsh-experimental-imouto-driver-panel/src/state-dir.ts'
import { readDriverSnapshot } from '@deepseek-ai/dsh-experimental-imouto-driver-panel/src/reader.ts'

const stateDir = driverStateDirFor(driverRoot, { home, platform: process.platform })
const snapshot = readDriverSnapshot({ stateDir, maxWorkers: 32, maxTailBytes: 262_144, now: new Date().toISOString() })
```

<a id="understand-the-implementation"></a>
## Understand the implementation

The state directory is `<stateHome>/<label>-<sha256(normalizedRoot)[0..12]>`, where `stateHome` is `IMOUTO_STATE_HOME` or `<home>/.imouto/projects`. The reader reproduces the driver's own rule forward from the configured root. It never reverse maps a directory name, because the hash is the identity and the label is only a basename.

Two sources feed one snapshot:

- `imoutos/*.json` supplies each worker's identity, name, goal, and update time.
- The trailing window of `events.jsonl` supplies the live state and the last recorded act of each worker.

The persisted `state` field never drives the result. The driver coerces every record it loads whose state is not `tucked` to `tucked`, so the field on disk is last-written rather than live. Live state comes from the last `state` event in the window, and a worker with no such event reads as `unknown`.

Both bounds are enforced on the complete value: `maxWorkers` caps the roster and `maxTailBytes` caps the scanned window. An absent state directory, an absent events file, a torn trailing line, and a record caught mid-replace all yield an empty or partial roster instead of a thrown error.

The two halves meet at one authenticated route. The host registers `GET /api/imouto-driver-panel/snapshot`, which reads on demand and answers JSON. The browser tab polls it every three seconds, so no host timer and no push channel are needed.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Host plugin: validated `Config` and the snapshot route |
| [`src/state-dir.ts`](src/state-dir.ts) | Driver root to state directory, mirroring the driver's rule |
| [`src/reader.ts`](src/reader.ts) | Bounded roster and activity read |
| [`src/panel.ts`](src/panel.ts) | Host-side read for one request |
| [`src/wire.ts`](src/wire.ts) | Route path and poll interval, browser-safe |
| [`src/client/index.ts`](src/client/index.ts) | Tab type and pane body registration |
| [`src/client/DriverPanel.tsx`](src/client/DriverPanel.tsx) | One row per worker, plus the empty and unavailable notices |
| [`src/types.ts`](src/types.ts) | Snapshot, worker, event, and option types |

<a id="further-exploration"></a>
## Further Exploration

- The driver owns both formats: `imouto-driver/src/runtime/store.ts` (worker records) and `imouto-driver/src/runtime/events.ts` (the event stream).
- The driving decision record is the W003 findings file in the task blackboard work directory.

<a id="model-experience"></a>
## Model Experience

### No model-visible surface

#### What the model sees

Nothing. `dsh-experimental-imouto-driver-panel` registers no tool, no prompt section, and no session event, so it adds no request text and no transcript entry.

#### Token effect

None. The reader returns a snapshot to its caller and writes nothing to a request.

#### KV Cache effect

None. The package appends nothing, so no cached prefix changes.

## Known Limitations and Deferred Work

- **No shipped profile lists it.** The mount surface is a profile's `dsh.profile.bundles` list plus a dependency entry, because a bare row cannot resolve undeclared. The live `imouto-yuu` profile is user-owned state outside this repository, and it links a different checkout.
- **Read-only.** The pane shows workers; it cannot steer one. Steering needs the driver's `send` tool, which the browser cannot call.
- **Polling, not push.** The driver publishes no DSH channel, so the pane polls every three seconds. A worker that starts and finishes inside one interval can be missed entirely.
- **No stored offset.** Each snapshot re-reads the trailing window rather than resuming from a byte offset, so a poll costs the window size instead of the appended bytes. Shrinking or replaced files need no special handling.
- **Whole-record parse.** A worker record is parsed in full, including its conversation history, because the driver writes it as one JSON document. `maxWorkers` bounds the count; a per-record byte cap is deferred.
- **Unverified against a live driver.** The reader and the pane are tested over synthetic state directories and a stubbed route. Neither has been exercised against a live driver state directory in a browser session.
- **The root has no working default.** A bundle patch cannot know a deployment's driver root, so the row must supply one. A missing root fails at config validation instead of mounting a pane that reads nothing.
