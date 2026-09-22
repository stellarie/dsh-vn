---
name: imouto-agent-team
description: Run bounded development through native DSH Agent Teams with blackboard records, routed skills, and lead-owned integration.
---

# Imouto Agent Team

Use native DSH Agent Teams as the coordination transport. The selected model remains Lead.

The Lead owns scope, architecture, integration, review, and final completion. Teammates own bounded results.

## Mandatory verification skill

The Lead loads `verification-before-completion` before project work.

Every teammate brief requires `verification-before-completion`. Each teammate loads it during `confirm`, before project work.

A teammate report does not prove project completion. The Lead reruns integration checks before the final claim.

## Authority

Use one authority for each concern:

- Team task board: live ownership, readiness, dependencies, and completion.
- Blackboard: durable contract, decisions, evidence, and provenance.
- Team messages: wake-ups, questions, and concise findings notifications.
- Repository: implementation truth.
- Lead: architecture, integration, review, and final status.

Do not duplicate mutable task status in messages. Update the Team task and blackboard record first.

## Intake and mode

Confirm the requested execution mode before project mutation. Honor an explicit mode without asking again.

- `solo`: Do not create teammates. Use the normal solo development process.
- `delegated`: Pause for oniichan at contract, slice, and integration milestones.
- `auto`: Continue automatically. Pause only for authority, destructive actions, material expansion, ambiguity, or blockers.

Record `coordination_transport: native` in the main blackboard task.

## Lead workflow

1. Load the `imouto-blackboard` skill before blackboard work.
2. Load `verification-before-completion`.
3. Inspect enough code to define one checkable acceptance test.
4. Create the main blackboard task and set `status: planning`.
5. Decompose work along interfaces, data flow, or independent files.
6. Create one Team task per verifiable slice.
7. Record dependencies and disjoint write scopes on every Team task.
8. Create one companion work file per teammate before dispatch.
9. Start one teammate. Add a second only for independent work.
10. Review every result, work file, and actual diff.
11. Route repairs with explicit transferred write scopes.
12. Run final integration gates and a non-mutating conflict check.
13. Record teammate provenance and close the blackboard task.

## Decomposition rules

Delegate results, not activities.

Every slice has:

- One measurable Goal.
- One acceptance test.
- One owner.
- One disjoint write scope.
- Explicit dependencies.
- Exact verification commands.
- Explicit forbidden actions.

Do not delegate open-ended improvement. Do not assign two active writers to overlapping paths.

Start with one teammate. Use at most two concurrent writers. Reserve a third teammate for review or repair.

## Team task workflow

The Lead uses this sequence:

1. Create the Team task with `team_task_create`.
2. Read the task with `team_task_get` before changing it.
3. Spawn or message the assigned teammate.
4. The teammate claims the task with its current revision.
5. The teammate updates its companion work file at phase boundaries.
6. The teammate completes the Team task only after required checks pass.
7. The Lead reads the latest task before review or reassignment.

Use task dependencies for ordered work. A ready task never starts its owner automatically.

## Teammate mini-SDLC

Each teammate follows these phases:

1. `confirm`: Read the Team task, work file, scope, dependencies, and acceptance.
2. `inspect`: Read relevant code, tests, documentation, and callers.
3. `plan`: Record the smallest complete approach.
4. `implement`: Change only the assigned write scope.
5. `verify`: Run checks that fail when the work is wrong.
6. `self-review`: Inspect the diff, scope, edge cases, and accidental changes.
7. `report`: Update the work file and return a concise result.

Record `N/A` with one reason when a phase does not apply.

## Skill routing

Every role loads `verification-before-completion` first. Add only the skills required by the slice.

| Work | Required skill |
|---|---|
| Unfamiliar code or exploration | `codebase-analysis` |
| Bug, failure, crash, or unexpected behavior | `systematic-debugging` |
| Feature, bugfix, or behavior change | `test-driven-development` |
| Review or review response | `code-review` |
| Rust | `rust-guidelines` |
| Kotlin | `kotlin-guidelines` |
| Technical prose | `writing-ste100` |

Do not tell a teammate to load every skill. Route only the applicable skills.

## Reasoning routing

Load `how-claude-thinks` when the task needs it.

| Situation | Page |
|---|---|
| Ambiguous request | `Problem-Intake.md` |
| Scope disagreement | `Scoping.md` |
| Evidence gathering | `Information-and-Evidence.md` |
| Difficult bug | `Debugging-and-Diagnosis.md` |
| Complex plan | `Decomposition-and-Planning.md` |
| Conflicting explanations | `Drawing-Conclusions.md` |
| Risk or uncertainty | `Handling-Uncertainty.md` |
| Final completion | `Verification-and-Doneness.md` |
| Session failure | `Failure-Modes.md` |

Require conclusions and evidence. Never request hidden reasoning transcripts.

## Dispatch declaration

Before each spawn, publish the teammate declaration:

```text
Name: {unique teammate name}
Role: explore | implement | review | repair | integrate
Task: {one bounded assignment}
Goal: {one measurable completion condition}
Write scope: {exact paths or none}
Required skills: verification-before-completion, {role skills}
Reasoning page: {page or none}
```

## Teammate brief

Every initial prompt contains:

```text
Main blackboard: {absolute path}
Work file: {absolute path}
Team task: {task id}
Repository root: {absolute path}
Role: {role}
Goal: {measurable completion condition}
Acceptance: {checkable criteria}
Write scope: {exact paths or none}
Dependencies: {task ids or none}
Required skills: verification-before-completion, {applicable skills}
Reasoning page: {path or none}
Required commands: {exact commands}
Forbidden actions: {exact actions}
Allowed peers: {names and topics or none}
```

The prompt also requires:

- Claim the Team task before work.
- Read the blackboard work file.
- Do not spawn nested teammates.
- Do not change another teammate's files.
- Ask before expanding scope.
- Update the work file at phase boundaries.
- Complete the Team task only after fresh verification.

## Communication

Use `send_message` for questions, wake-ups, and concise findings.

Use this event format:

```text
Task: {task id}
Event: DONE | NEEDS_FINDINGS | NEEDS_CONTEXT | BLOCKED | FINDINGS_READY
Record: {absolute work-file path}
Result or need: {one sentence}
Next: {one sentence}
```

Direct peer messages require permission in both briefs. Messages do not transfer ownership, scope, or dependencies.

Before `wait_agent`, call `list_agents`. Wait only when another required teammate is running or provisioning.

## Concise reports

Every teammate final reply uses exactly these headings:

1. `Result`
2. `Changed`
3. `Checks`
4. `Concerns`
5. `Next`

Each heading contains five bullets maximum. Do not narrate commands, restate the brief, or reproduce the diff.

## Review and repair

The Lead reviews the actual diff. Teammate reports are claims, not evidence.

Classify findings:

- Blocking: behavior, security, data, or acceptance failure.
- Important: fix before integration.
- Minor: record and decide.

Verify every finding before repair. Transfer the exact write scope before another teammate changes owned files.

A review teammate supports the Lead. The Lead retains review ownership.

## Completion gate

Before completion, the Lead verifies:

- Every acceptance item.
- Every affected buildable target.
- Affected unit and integration tests.
- Repository CI-equivalent checks.
- Final diff scope and debris.
- Non-mutating conflicts against the target branch.
- Blackboard and Team task consistency.
- Teammate provenance.
- No required teammate or background job remains active.

Record skipped or unavailable checks with reasons. Never report them as passed.

## Closeout

1. Read every required teammate result and work file.
2. Resolve open Team tasks and messages.
3. Record every teammate, including failed or discarded work.
4. Curate reusable memory or skill candidates when applicable.
5. Leave idle teammates available unless oniichan requests interruption.
6. Report residual uncertainty and the exact next action.

## Provenance

The blackboard lifecycle follows the `imouto-blackboard` skill.
The reasoning routes use the `how-claude-thinks` skill.
Recheck both skills when their protocols or page names change.
