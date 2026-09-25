---
name: imouto-blackboard
description: Validate and update imouto blackboard task files.
---

# Imouto Blackboard


# Imouto Blackboard Protocol

This file is the canonical blackboard specification for Chloe, Sherry, and
their subimoutos. It overrides duplicated blackboard examples elsewhere.

## Files

Each task uses one main file:

`<blackboard-root>/{slug}.md`

Delegated work uses one companion directory:

`<blackboard-root>/{slug}.work/`

Each subimouto owns one work file:

`{work-item}-{cute-name}-{role}.md`

Example: `W001-akari-explore.md`.

The main task file is authoritative for task status, acceptance, and plan.
The work file is authoritative for its delegated assignment and live status.

## Main task schema

```markdown
---
protocol: imouto-blackboard/v1
task: {slug}
initiator: Chloe | Sherry | Yuu | oniichan
execution_mode: solo | delegated | auto
coordination_transport: native | discord | driver
status: planning | ready | implementing | review | verifying | done | blocked
owner: Chloe | Sherry | Yuu | oniichan | none
next_action: {one concrete action or none}
verifier: {name; required when status is verifying}
created: YYYY-MM-DD
updated: YYYY-MM-DD
project: {repository or project name}
base_revision: {commit, or snapshot path plus SHA-256 manifest}
depends_on: [{slug}, ...]
---

# {Task Title}

## Objective
{What and why.}

## Acceptance Test
{Tag each item with [auto], [manual], or [review].}

## Plan
{Architecture, files, interfaces, edge cases, and non-goals.}

## Rollback
{Include only when rollback needs more than restoring the previous files.}

## Work Items
### W001 - {title}
- Owner: {cute name or parent}
- Role: explore | implement | review | repair | integrate
- Goal: {one measurable completion condition}
- Work file: `{slug}.work/W001-{name}-{role}.md`
- Depends on: none | W000

## Implementation Notes
### Round 1
{Completed work, deviations, and acceptance evidence.}

## Review
### Round 1
{Findings and disposition.}

## Subimoutos
### {cute-name} - W001
- Spawned by: Chloe | Sherry | Yuu
- Role: explore | implement | review | repair | integrate
- Model: {exact model ID}
- Effort: {exact reasoning effort}
- Host ID: {agent_id or unavailable}
- Work file: `{relative work-file path}`
- Task: {one-line assignment}
- Outcome: {actual result}

## Thread
[MSG-001] [sender -> recipient] [type] [state]
{One topic.}
```

Omit `depends_on` when no task dependency exists. Omit Rollback when the
previous files provide sufficient recovery.

## Task ownership

`owner` identifies who must perform `next_action`.
`initiator` identifies who created and framed the task.
`execution_mode` identifies the user-approved orchestration behavior.
`coordination_transport` identifies the collaboration channel for subimoutos.

- `planning` usually belongs to Chloe.
- `ready` usually transfers ownership to Sherry.
- `implementing` belongs to Sherry.
- `review` belongs to the initiator-defined parent reviewer.
- `verifying` belongs to oniichan or the named verifier.
- `blocked` belongs to whoever can remove the recorded blocker.

`verifying` requires `verifier`. `done` uses `owner: none` and
`next_action: none`.

Update `owner`, `next_action`, and `updated` with every task-level handoff.

Solo and Auto assign technical review to Sherry. Delegated mode adds oniichan's
milestone approvals. Chloe reviews only when oniichan assigns her.

Legacy tasks without `execution_mode` use `initiator` for review routing.
Chloe reviews legacy Chloe-initiated tasks by default.

## Execution modes

Select one mode before project edits, branch creation, or subimouto dispatch.
Read-only inspection may precede selection to support task-specific tradeoffs.

- `solo`: Sherry works alone. Subimoutos are prohibited.
- `delegated`: Subimoutos are allowed. Oniichan approves every milestone.
- `auto`: Subimoutos are allowed. Sherry performs parent review automatically.

Use `native` for Codex collaboration tools. Use `discord` for the Arisucord
control plane and local runner. Legacy tasks without this field use `native`.

Use `driver` for imouto-driver workers. Workers cannot write the blackboard.
The parent writes each work file from the worker's mail, in the work-item schema.

Delegated mode uses three approval milestones:

1. Contract: approve scope, goal, acceptance, plan, work items, commands, and risks.
2. Slice: approve completed slices before dependent work or integration.
3. Integration: approve full gate evidence before finalization or publication.

Record each approval in Thread. Do not cross a delegated milestone while its
approval message remains open.

## Work item schema

```markdown
---
protocol: imouto-blackboard/v1
task: {slug}
work_item: W001
name: {cute girl name}
role: explore | implement | review | repair | integrate
model: {exact model ID}
effort: {exact reasoning effort}
host_id: {agent_id}
orchestrator_host_id: {host ID or runtime parent route}
allowed_peers:
  - host_id: {peer host ID}
    work_item: {peer work item ID}
    topic: {permitted findings topic}
status: assigned | active | needs-context | blocked | done
phase: confirm | inspect | plan | implement | verify | self-review | report
created: YYYY-MM-DD
updated: YYYY-MM-DD
write_scope:
  - {exact path or none}
depends_on: []
---

# W001 - {title}

## Contract
- Goal: {one measurable completion condition}
- Acceptance: {checkable criteria}
- Out of scope: {explicit exclusions}
- Verification: {required commands or review checks}

## Required Steps

1. {Action, expected result, and verification.}
2. {Action, expected result, and verification.}

## Updates
### YYYY-MM-DD HH:MM - {phase}
{Conclusion, evidence, or current result.}

## Messages
[W001-MSG-001] [{name} -> Sherry] [question] [open]
{One actionable question.}

[W001-MSG-002] [Sherry -> {name}] [answer] [resolves W001-MSG-001]
{One decision or missing fact.}

## Result
- Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Changed: {paths or none}
- Verification: {commands and observed results}
- Concerns: {residual concerns or none}
- Handoff: {next concrete action}
```

## Mini-SDLC

Every subimouto follows these phases:

1. `confirm` - Check the contract, scope, dependencies, and acceptance.
2. `inspect` - Read relevant code, tests, documentation, and current behavior.
3. `plan` - Record a short approach when the work is non-trivial.
4. `implement` - Change only the assigned write scope.
5. `verify` - Run checks that would fail when the change is wrong.
6. `self-review` - Inspect the diff, scope, edge cases, and accidental changes.
7. `report` - Record the result, evidence, concerns, and handoff.

Skip inapplicable phases by recording `N/A` with one reason.

## Subimouto model policy

imouto-driver workers use `deepseek-flash` with thinking enabled. Supported
effort values are `low`, `high`, and `max`. The default is `max`.

- Use `gpt-5.6-luna` with effort `max` by default.
- Use `gpt-5.6-sol` with effort `high` only for difficult reasoning.
- Never use `gpt-5.6-terra` or `gpt-6-astra` for subimoutos.
- Keep the exact model ID and effort in separate fields.

## Role rules

- Explorer: use confirm, inspect, plan, and report. Do not edit project files.
- Implementer: use every applicable phase and run targeted verification.
- Reviewer: inspect acceptance and the diff. Do not repair without write scope.
- Repairer: reproduce the finding, apply a bounded fix, and rerun checks.
- Integrator: modify only declared cross-slice wiring and run integration checks.

## Communication

Subimoutos communicate through their work files. They update at phase
boundaries, questions, blockers, and completion. They do not write progress
narration for every command.

Before each spawn, the parent publishes a user-facing dispatch declaration.
It states the cute name, exact model, effort, role, task, Goal, and write scope.
The declaration must precede the spawn tool call.

The parent creates `host_id: pending` and `status: assigned`, then spawns.
The parent sends the returned host ID without editing the active work file.
The subimouto records that ID and sets `status: active` during `confirm`.

Only the assigned subimouto writes her work file while status is `active`.
She stops writing before setting `needs-context` or `blocked`. The main task
owner becomes the sole coordinator for that pause.

The coordinator appends one answer, then sends the wake-up. The subimouto
rereads the work file before restoring `status: active`. The blackboard is the
durable record; the collaboration channel is the wake-up signal.

Subimoutos may read completed dependency work files. They never edit another
subimouto's work file. Sherry records task-level decisions in the main Thread.

Use native messages as wake-ups. Use work files as the durable record.
Imoutos notify the orchestrator for completion, context needs, findings needs,
and blockers. Avoid polling when notification is available.

The orchestrator routes messages by default. Direct peer messaging requires an
`allowed_peers` entry with the peer host ID, work item, and permitted topic.
Messaging never transfers scope or changes dependencies.

Native event messages contain task, work item, event, recipient, record path,
one-sentence result or need, and one next action. Full evidence stays in the
work file.

Supported events are `DONE`, `NEEDS_FINDINGS`, `NEEDS_CONTEXT`, `BLOCKED`, and
`FINDINGS_READY`. Record each request and response in both affected work files.
The receiver rereads the referenced record before relying on its findings.

Thread message types are `question`, `answer`, `decision`, `blocker`, and
`handoff`. Message states are `open`, `resolved`, or `resolves {message-id}`.

Never overwrite earlier Implementation Notes or Review rounds. Add a new
numbered round. A later round may explicitly supersede an earlier claim.

## Result requirements

`DONE` requires completed scope, listed changed files, successful required
checks, and no undisclosed concerns.

Every development task includes these acceptance gates when applicable:

- Build every affected buildable target.
- Run affected unit and integration tests.
- Run documented CI-equivalent checks from repository scripts or workflows.
- Check merge conflicts against the intended target branch without merging.

Every coding work item must compile its affected targets and pass affected unit
tests before handoff. It must compare the final diff against every requirement.
Use `NEEDS_CONTEXT` or `BLOCKED` when a required compile or unit test fails.

Record each command and observed result. Record every skipped or unavailable
gate with its reason. A documented baseline failure may remain only when fresh
evidence shows the change did not cause it.

Use `NEEDS_CONTEXT` instead of guessing. Use `BLOCKED` when instructions,
dependencies, or scope prevent progress. Report the first failing command and
its exact failure. Never expand write scope silently.

## Concurrency

The main task file has one active parent writer. Every active subimouto has a
different work file and a disjoint project write scope.

Use at most two concurrent project writers. Reserve the third subimouto slot
for review or repair. Nested delegation is prohibited.

## Provenance

Add every completed, failed, discarded, or stopped subimouto to the main
Subimoutos section. The work file preserves detailed lifecycle evidence.

## Writing rules

- Use plain technical English. Do not use persona or kaomoji.
- Use active voice and one topic per paragraph.
- Keep instruction sentences within 20 words.
- Keep descriptive sentences within 25 words.
- Cite paths, lines, commands, and tests instead of narrating exploration.
- Never store credentials, tokens, personal data, or secrets.

## Branch naming

Use `<type>/<short-kebab-description>` for every newly created work branch.

- `feat/` covers features and planned improvements.
- `bug/` covers ordinary defect fixes.
- `hotfix/` covers urgent production fixes.
- Never create or recommend a `codex/` branch.
- Never rename an existing branch without oniichan's request.

## Backward compatibility

Task files without `protocol` are legacy files. Do not migrate every legacy
task automatically. Add the protocol fields and Work Items section when a
legacy task next receives delegated work.
