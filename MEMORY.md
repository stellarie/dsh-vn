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

## Conventions

- Preserve the existing ChatView and InputBar behavior. [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.md]
- Keep presentation assets outside model-facing Session attachments. [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]
- Use `origin` for `stellarie/dsh-vn` and `upstream` for `deepseek-ai/deepseek-harness`. [verified: 2026-09-20] [source: git remote -v]

## Known Pitfalls

- Large data URLs in settings enlarge every settings read and write. Use managed asset references. [status: active] [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]
- Direct image paths fail across browser, Desktop, and remote Host contexts. Use authenticated asset routes. [status: active] [verified: 2026-09-20] [source: C:/Users/Stella/notes/blackboard/dsh-vn-ui.work/W001-akari-explore.md]

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

## Open Questions

- [ ] Confirm visual readability and state transitions in a live Web or Desktop session. Next check: complete the manual acceptance steps. [added: 2026-09-20]

## Session Handoffs

### 2026-09-20 - Visual novel presentation

- Done: Created the `stellarie/dsh-vn` fork and selected managed presentation assets.
- Pending: Complete manual visual acceptance in a newly built Web or Desktop instance.
- Next: Load state images, enable VN mode, and confirm contrast plus all state transitions.
- Verification: Focused tests passed 33 cases. Full build passed. Documentation passed 40 gates; one Windows symlink test returned `EPERM`.
