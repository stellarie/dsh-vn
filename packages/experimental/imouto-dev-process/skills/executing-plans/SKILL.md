---
name: executing-plans
description: Run a locked blackboard plan to completion. Read after imouto-plan locks a task at ready, or when oniichan says to execute a plan.
---

# Executing Plans

This skill owns the pipeline, the dispatch decision, and the completion gate.
It starts after a plan is locked at `ready`. It never writes the plan.

## The pipeline

| # | Stage | Skill | Entry | Artifact at exit | Gate |
|---|---|---|---|---|---|
| 1 | Design | `brainstorming` | no acceptance test, or a new interface | task file at `planning` | oniichan approves the design |
| 2 | Plan | `imouto-plan` | design approved | same file at `ready` | self-review, then the lock |
| 3 | Dispatch | this skill | plan locked | `execution_mode` recorded | the ask below is answered |
| 4 | Work | the chosen transport | spec exists | work files and results | one writer per file |
| 5 | Verify | `verification-before-completion`, `imouto-standards` | work returned | diff and gate output | build, tests, CI-equivalent check, conflict check |
| 6 | Close | this skill, `imouto-blackboard` | gates pass | artifact recorded | `[manual]` items recorded, or the task stays `verifying` |

No spec means no spawn. A work item without a contract in the task file does
not start.

## Ask before any project mutation

Ask both questions in one message, and wait for the answer. Recommend one
answer for each, with a reason tied to this task.

**Transport.** The frontmatter field `coordination_transport` accepts `native`,
`discord`, or `driver`.

- `imouto-agent-team` - native DSH teammates and the shared task board. Record
  `coordination_transport: native`.
- `imouto-driver` - MCP workers through the spawn, send, and tuck tools. Record
  `coordination_transport: driver`. The parent writes each work file from the
  worker's mail. The worker never writes the blackboard.
- `discord` - the Arisucord control plane. Record it only when that runner is
  the selected route.
- `subimouto-dev` - a delegation procedure, not a transport. It runs on the
  native or the driver route, so record the route it uses.

**Mode.** Record `execution_mode` as one of these.

- `solo` - Yuu does the work. No workers.
- `delegated` - workers run, and oniichan approves the contract, slice, and
  integration milestones.
- `auto` - workers run, and Yuu performs parent review without routine
  pauses. Auto still stops for missing authority, a destructive action,
  material scope growth, or a blocker.

Record the answers in the task frontmatter before the first edit. In `solo`
mode, omit `coordination_transport`.

## Plan quality bar

Read the plan critically before the first step. Report a failure as a concern
and stop. Never repair the plan silently.

- A step with no exact command and no expected result.
- A placeholder: "TBD", "add appropriate error handling", "similar to Task N".
- A work item with no write scope.
- A work item that names no consumed or produced interface.
- An acceptance item with no plan step behind it.
- A plan step that serves no acceptance item. That step is scope creep.

Right-size the work. A task is the smallest unit that carries its own test
cycle and is worth a reviewer's gate. A step is one action of two to five
minutes: write the failing test, run it, make it pass, run it again, commit.

## Execution rules

- Follow the plan. A deviation needs a Thread entry that names the reason.
- One writer per file. Two writers never share one file.
- Stop on a blocker. Report the first failing command and its exact failure.
  Never guess. Never widen scope silently.
- One retry must change the context, the owner, or the approach.
- After three failed attempts on one theory, the theory is wrong. Go up one
  level and tell oniichan.

## Worker rules

- Publish the dispatch declaration before the spawn: name, model, effort,
  role, task, goal, and write scope.
- Give every worker one measurable goal, an ordered step list, and an
  acceptance line. Open-ended work is not a work item.
- Review returned work against the diff, not against the worker's summary.
- Record every worker in the Subimoutos section, including failures and
  discarded work.
- Keep at most two writers active. Reserve the third slot for review.

## Completion gate

- Build every affected target.
- Run the affected unit and integration tests.
- Run the repository's documented CI-equivalent checks.
- Check merge conflicts without merging.
- Record every skipped or unavailable gate with its reason.
- Report a baseline failure as a baseline, with fresh evidence.
- Mark a `[manual]` item only when a Review round in the task file records the
  run, the platform, and the date.
- Claim `done` only with a recorded artifact: a commit, a branch, or
  `uncommitted {path}`.

## Close

1. Drain worker mail and record each final result.
2. Tuck or close every worker.
3. Confirm that no worker and no background job remains active.
4. Promote or reject the memory candidates and the skill drafts.
5. Name the residual uncertainty and every unverified item.

## Exit contract

1. The transport and the mode are recorded in the task frontmatter.
2. Every work item has a writer, a write scope, and a result.
3. Every worker appears in the Subimoutos section.
4. Every gate ran, or carries a recorded reason and a baseline check.
5. Every `[manual]` item appears in a Review round, or the task stays
   `verifying`.
6. The task carries an artifact: a commit, a branch, or `uncommitted {path}`.

## Non-goals

- This skill does not write the plan. `imouto-plan` does.
- This skill does not classify the work. `brainstorming` does.
- This skill never blesses a golden, widens a tolerance, or deletes a
  failing test.

## Provenance

The pipeline order follows the Superpowers plugin, version 6.3.0 (MIT,
copyright 2025 Jesse Vincent): brainstorm, then plan, then execute with
review checkpoints. Rewritten for the blackboard workflow; not a copy. The
plan quality bar comes from that source's `writing-plans` skill.
