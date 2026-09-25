---
schema: codex-project-memory/v1
project: dsh-vn
last_verified: 2026-09-20
---

# Project Memory

## Purpose

This fork preserves DeepSeek Harness behavior while adding an optional visual-novel presentation to the existing conversation UI.

## Commands

- `pnpm run typecheck` - Build Host types and check Client types. [verified: 2026-09-20] [source: package.json]
- `pnpm run build:web` - Build the Web frontend. [verified: 2026-09-20] [source: package.json]
- `pnpm run test:web:built` - Run Web tests against built artifacts. [verified: 2026-09-20] [source: package.json]
- `pnpm --silent run change-scope --base upstream/master` - Report the outgoing change scope. [verified: 2026-09-20] [source: .agents/skills/dsh-pre-push-checks/SKILL.md]

## Architecture

- Cordis plugins provide all Harness behavior and UI contributions. [status: active] [verified: 2026-09-20] [source: docs/architecture.md]
- Conversation views render from durable Session events and live Client projections. [status: active] [verified: 2026-09-20] [source: docs/architecture.md]
- VN presentation must not change the agent loop or Session format. [status: active] [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.md]
- The `imouto-yuu` profile composes repository-owned profile and process packages with vendored Codex integration. [status: active] [verified: 2026-09-20] [source: packages/boot/app-boot/src/profile.ts]
- The imouto-driver remains external and enters through the required `IMOUTO_DRIVER_ENTRY` environment variable. [status: active] [verified: 2026-09-20] [source: packages/experimental/imouto-dev-profile/presets/yuu/agent.cordis.yml]

## Conventions

- Preserve the existing ChatView and InputBar behavior. [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.md]
- Keep presentation assets outside model-facing Session attachments. [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]
- Use `origin` for `stellarie/dsh-vn` and `upstream` for `deepseek-ai/deepseek-harness`. [verified: 2026-09-20] [source: git remote -v]
- Store portable Yuu process skills under `packages/experimental/imouto-dev-process/skills`. [verified: 2026-09-20] [source: packages/experimental/imouto-dev-process/tests/skills.spec.ts]

## Known Pitfalls

- Large data URLs in settings enlarge every settings read and write. Use managed asset references. [status: active] [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]
- Direct image paths fail across browser, Desktop, and remote Host contexts. Use authenticated asset routes. [status: active] [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]
- Plain Node cannot execute the TypeScript imouto-driver entry. Launch it with `--import tsx/esm`. [status: active] [verified: 2026-09-20] [source: packages/experimental/imouto-dev-profile/presets/yuu/agent.cordis.yml]

## Decisions

### 2026-09-20 - Preserve the existing chat renderer

- Decision: Add VN presentation around the existing ChatView and InputBar.
- Why: This retains Markdown, tools, attachments, paging, questions, and upstream compatibility.
- Alternatives: A separate conversation renderer would duplicate complex chat behavior.
- Evidence: `packages/client/ui-chat/src/client/chat/ChatView.tsx` and `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx`.

### 2026-09-20 - Store managed VN image copies

- Decision: Store content-addressed image copies and persist opaque identifiers in settings.
- Why: Source paths are unstable, data URLs bloat settings, and attachments carry Session semantics.
- Alternatives: Direct paths, data URLs, and Session attachment storage were rejected.
- Evidence: `C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md`.

### 2026-09-20 - Keep the imouto driver external

- Decision: Require a readable `IMOUTO_DRIVER_ENTRY` instead of copying the driver runtime into dsh-vn.
- Why: This keeps runtime state and credentials outside the repository while preserving deterministic profile wiring.
- Alternatives: Vendoring driver runtime state or using an absolute machine path were rejected.
- Evidence: `packages/experimental/imouto-dev-profile/presets/yuu/agent.cordis.yml` and isolated profile dump.

## Open Questions

- [ ] Confirm visual readability and state transitions in a live Web or Desktop session. Next check: complete the manual acceptance steps. [added: 2026-09-20]
- [ ] Confirm Yuu persona, driver tools, Codex provider, and VN presentation in a live session. Next check: launch `imouto-yuu` beside the existing instance. [added: 2026-09-20]

## Session Handoffs

### 2026-09-20 - Visual novel presentation

- Done: Created the `stellarie/dsh-vn` fork and selected managed presentation assets.
- Pending: Complete manual visual acceptance in a newly built Web or Desktop instance.
- Next: Load state images, enable VN mode, and confirm contrast plus all state transitions.
- Verification: Focused tests passed 33 cases. Full build passed. Documentation passed 40 gates; one Windows symlink test returned `EPERM`.

### 2026-09-20 - Imouto Yuu import

- Done: Added the Yuu profile, portable skills, process tools, external driver wiring, and vendored Codex integration.
- Pending: Complete live manual acceptance beside the existing DSH instance.
- Next: Set `IMOUTO_DRIVER_ENTRY`, launch `imouto-yuu` on another port, and verify the complete interaction flow.
- Verification: Full build and lint passed. Focused suites passed 405 tests. Documentation passed 40 gates; one Windows symlink test returned `EPERM`.
