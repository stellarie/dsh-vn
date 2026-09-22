---
name: subimouto-dev
description: Delegate bounded development on the native DSH or imouto-driver transport, with explicit goals, milestones, and verification.
---

# Subimouto Development

Use this skill for implementation work that may benefit from delegation. It is a
delegation procedure, not a transport: it runs on native DSH teammates or on
imouto-driver workers.

## Dispatch

The `executing-plans` skill owns the mode and transport decision. It records
`execution_mode: solo | delegated | auto` and
`coordination_transport: native | driver` in the main blackboard task. Read that
skill, answer its dispatch ask once, then follow this skill.

In Solo mode, do not summon anyone. A recorded mode stays active until oniichan
changes it explicitly.

The two transports have these entry points:

- Native: the DSH Agent Teams tools `team_task_create`, `team_task_get`,
  `send_message`, `list_agents`, and `wait_agent`.
- Driver: the imouto-driver tools `mcp__imouto__health`, `mcp__imouto__set_root`,
  `mcp__imouto__spawn`, `mcp__imouto__send`, `mcp__imouto__wait`, and
  `mcp__imouto__tuck`.

## Delegation decision

Identify the immediate critical-path task and any independent side work before
summoning anyone.

Proceed locally when the task is small, sequential, or tightly coupled; the next
action depends on the result; delegation would duplicate Yuu's work; or a local
edit is faster than a complete handoff.

Summon a subimouto when a bounded task can run beside the critical path; two
slices have disjoint write sets; separate context improves the result; or
delegation materially reduces context pressure.

Yuu owns the critical path, integration, and final verification. She may
implement small work and simple repairs directly.

## Native route

The retired agent-team body is archived beside this skill.

1. Create one Team task per verifiable slice and record its dependencies and
   disjoint write scope.
2. Create one companion work file per teammate before dispatch.
3. Publish the dispatch declaration, then spawn or message the teammate.

Every declaration states the name, role, task, goal, write scope, required
skills, and any `how-claude-thinks` reasoning page:

```text
Name: {unique teammate name}
Role: explore | implement | review | repair | integrate
Task: {one bounded assignment}
Goal: {one measurable completion condition}
Write scope: {exact paths or none}
Required skills: verification-before-completion, {role skills}
Reasoning page: {page or none}
```

The teammate claims the Team task with its current revision, keeps its own work
file current at phase boundaries, and completes the task only after fresh
verification passes. Use `send_message` for questions and findings. Before
`wait_agent`, call `list_agents`; wait only when a required teammate is running
or provisioning. Read the latest Team task before review or reassignment.

## Driver route

1. Call `mcp__imouto__health` and confirm its `stateDir`.
2. Call `mcp__imouto__set_root` with the exact project path. Never use a broad
   common ancestor for several repositories. Complete one repository, tuck its
   workers, then change the root.
3. Call `mcp__imouto__spawn` with `goal`, `brief`, `name`, `role`, `acceptance`,
   `requiredSkills`, `reportFormat`, `effort`, `scope`, and `budget`.
4. Use `mcp__imouto__send` for follow-up instructions. Use `mcp__imouto__wait`
   with `timeoutSec` from 60 to 110 only when the next action needs a result.
   Use `mcp__imouto__tuck` after consuming the final worker mail.

Give each worker a unique cute girl name and a headpat in the brief. The
returned imouto id, such as `imo-3`, is the host identifier.

The worker model is fixed as `deepseek-flash`. Supported effort values are
`low`, `high`, and `max`; use and record `max` by default. The driver keeps
thinking mode enabled and sends the selected effort as `reasoning_effort`.
Unknown skills fail before worker creation.

The parent writes each driver work file from the worker's mail. Do not instruct
a driver worker to read or update a blackboard file.

## Blackboard communication

Load the `imouto-blackboard` skill before blackboard work.

Before each spawn, create one work item in the main task file and one companion
work file. Use `host_id: pending` and `status: assigned`. Pass both paths in the
initial message.

Every work item defines one measurable Goal and an ordered Required Steps list.
Each step states its expected result and verification. Do not delegate
open-ended work such as "investigate this" without a completion condition.

Workers cannot access blackboard files outside their scope. Task-level decisions
go in the main Thread. When a work file shows `needs-context` or `blocked`,
answer there, then wake the worker with the transport's send tool.

Record the host ID and set `status: active` during `confirm`. While a worker
pauses, the main task owner is the sole coordinator: she appends one answer,
then sends the wake-up. The worker rereads the file before restoring
`status: active`. Do not edit an active work file.

The blackboard is the durable record. Native collaboration tools carry
notifications. Record the host ID in the final provenance block.

## Event-driven messaging

Use the transport's messaging for wake-ups and the blackboard for durable
details. Avoid polling when a worker can notify the coordinator.

Every initial assignment provides the orchestrator contact route when the
runtime exposes one. It may also provide explicitly allowed peer host IDs.

Send a concise notification when a worker completes her Goal, needs findings
owned by another work item, needs orchestrator context or a decision, becomes
blocked, or a requested peer finding becomes available:

```text
Task: {task slug}
Work item: {work item ID}
Event: DONE | NEEDS_FINDINGS | NEEDS_CONTEXT | BLOCKED | FINDINGS_READY
For: {orchestrator or allowed peer name}
Record: {absolute companion work-file path}
Need or result: {one sentence}
Next action: {one sentence}
```

Send concise evidence in the final mail before `DONE` or `FINDINGS_READY`. The
parent writes that evidence to the companion work file. Do not repeat logs,
diffs, or long findings in notifications.

The orchestrator is the default routing hub. Direct peer messaging is allowed
only when the assignment names that peer and its topic. A worker must not
discover or contact undeclared peers. Messaging never transfers write scope,
changes dependencies, authorizes edits, or permits nested delegation. Record
every request and response in both affected work files.

An answer uses `FINDINGS_READY`, `NEEDS_CONTEXT`, or `BLOCKED`. The requesting
worker rereads the referenced work file before continuing. Completion
notifications do not replace parent review, integration, or the global
development gate.

## Mini-SDLC

Every worker follows these phases:

1. `confirm` - Check the contract, scope, dependencies, and acceptance.
2. `inspect` - Read relevant code, tests, documentation, and callers.
3. `plan` - Record a short approach when the task is non-trivial.
4. `implement` - Change only the assigned write scope.
5. `verify` - Run checks that fail when the change is wrong.
6. `self-review` - Inspect the diff, scope, edges, and accidental changes.
7. `report` - Record the result, evidence, concerns, and handoff.

A phase that does not apply requires `N/A` with one reason. The assigned Goal
and Required Steps override a generic phase. The worker records each completed
step and its evidence, and does not silently reorder or omit steps.

Role rules:

- Explorer: confirm, inspect, plan, and report. Do not edit project files.
- Implementer: complete every applicable phase and targeted verification.
- Reviewer: inspect acceptance and the diff. Repair only within assigned scope.
- Repairer: reproduce the finding, apply a bounded fix, and rerun checks.
- Integrator: modify only declared cross-slice wiring and run integration checks.

## Coding completion contract

A coding worker completes these checks before `DONE` or handoff:

1. Compile every affected target within the assigned scope.
2. Run every affected unit test.
3. Run assigned integration or regression checks when available.
4. Compare the final diff against every requirement and acceptance criterion.
5. Inspect the diff for unrelated changes, unsafe behavior, and missing edges.
6. Record exact commands, results, changed files, and remaining concerns.

Compilation and affected unit tests must pass. If either fails, use
`NEEDS_CONTEXT` or `BLOCKED`; do not declare `DONE`. A documented baseline
failure outside the assigned change may remain only when the parent supplied
baseline evidence, and the worker records that evidence.

## Review ownership

Record `initiator` in every new main blackboard task. Solo and Auto use Yuu as
the parent technical reviewer; Delegated adds oniichan's milestone approvals.
Chloe reviews only when oniichan requests her or assigns ownership to her.

A review worker supports the parent review but does not replace ownership. For a
Yuu-owned review, read the complete diff, the acceptance evidence, and the
work-file results, then resolve findings and rerun affected checks. If
higher-level instructions reserve `done`, set `status: review`, `owner: oniichan`,
and state the remaining approval action.

Legacy tasks without `execution_mode` fall back to `initiator`; a legacy
`initiator: Chloe` task is Chloe-owned by default.

## Coordination

1. Start with one worker.
2. Add a second only for independent work with a disjoint write set.
3. Keep at most two write workers active concurrently.
4. Reserve the third slot for justified review or repair.
5. Continue non-overlapping critical-path work while workers run.
6. Review returned work before integration.
7. Continue related repairs with the same worker when context matters.
8. Run acceptance checks after integration.
9. Check generated task and work files against `imouto-blackboard` before
   handoff.
10. Complete the global development gate before claiming success.
11. Drain relevant mail and record each final result.
12. Promote or reject new memory candidates and skill drafts.
13. Tuck each completed driver worker and record residual uncertainty.
14. Confirm no required worker or background command remains active.

If higher-level requirements demand a review subimouto, summon one even when
Yuu implemented the change locally. Workers never spawn nested workers or modify
files outside their write sets. They report changed files, tests, concerns, and
one clear result.

## Reports and failures

Every worker final reply uses these headings, with five bullets maximum each:
`Result`, `Changed`, `Checks`, `Concerns`, `Next`. Keep every heading. Cite
commands and results without narrating them. Do not repeat the diff, brief, or
earlier progress. Put detailed evidence in the work file.

Results:

- `DONE`: collect the summary and continue to review.
- `DONE_WITH_CONCERNS`: pass the concerns to the reviewer and record them.
- `NEEDS_CONTEXT`: provide the missing context to the same worker.
- `BLOCKED`: assess the cause and delegate a changed approach if a slot exists.

`DONE` requires completed scope, listed changed files, successful required
checks, and no undisclosed concerns. If review finds a defect, repair it locally
when small; otherwise continue the owning worker or delegate a bounded repair
with an explicit write set. If work is unusable, preserve the evidence, isolate
its changes, and delegate cleanup. Never silently overwrite a worker's work.

If native or driver dispatch fails, continue locally when safe. Report blocked
only when delegation is required and no safe local path exists.

## Message requirements

Every initial message states:

- A unique cute girl name and a headpat before the assigned work.
- The main blackboard task path and the assigned companion work file.
- The repository root, tool scope, and shell source.
- One concrete task, its acceptance criteria, and one measurable Goal.
- An ordered Required Steps list with expected results and verification.
- The exact files or directories the worker may write.
- Files and actions that are out of scope.
- Required tests, compile commands, and unit-test commands.
- A final requirement-by-requirement comparison.
- The required report shape, changed files, tests, and concerns.
- The prohibition on nested delegation.
- The requirement to send phase conclusions for parent work-file updates.
- The orchestrator contact route when the runtime exposes one.
- Every allowed peer host ID and permitted topic, or `none`.
- The event message shape and required notification events.

Every brief starts with this execution context:

```text
Repository root: {absolute project root}
Tool scope: {absolute or root-relative scope}
Shell: Read the platform line in your system prompt.
Write paths: {exact allowed paths}
Forbidden actions: {exact actions}
```

Do not ask a worker to merge another worker's patch by hand. Assign cross-slice
wiring to one implementation or repair worker.

## Patterns

Explore, implement, review-and-repair: delegate one explorer for unfamiliar
facts, then one implementer and one review-and-repair worker. Transfer the
explicit write set before repair.

Independent slices: delegate up to two implementers with disjoint write sets.
Each runs its own targeted tests. Reserve the third slot for review-and-repair.

Coupled implementation: delegate one implementer, one reviewer, and one repair
or integration worker when needed. Transfer file ownership only after the
previous worker finishes and the transfer is recorded.

## Limits

- Maximum three workers per task, including reviewers and repair workers.
- No nested delegation.
- No overlapping active write sets.
- No duplicated parent and worker work.
- No unbounded retries. Each retry changes context, ownership, or approach.
- No completion claim without observed verification results.

Yuu decides first. Workers join only when they earn their headpat.
