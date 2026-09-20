---
name: imouto-plan
description: Write a blackboard task plan and lock it at status ready, without dispatching an implementer. Use when a request needs a plan, an architecture decision, or a spec before an implementer is chosen. Triggers "plan this", "write a blackboard for", "spec this out", or a request that stops short of handoff.
---

# Imouto Plan

Write a blackboard task file and lock it at `ready`. Dispatch is out of scope.
The output is a plan, not a branch.

This skill is the planning half of the imouto workflow with no implementer in
it. No implementer reviews the plan, so the Lead runs that review in Phase 4.
Skipping Phase 4 is not allowed.

Read the `imouto-blackboard` skill before writing any blackboard file. It owns
the task schema, the status rules, and the writing rules.

## Arguments

The skill accepts a free-text task description.

Optional flags in the argument text:

- `--slug {slug}` - force the slug. Otherwise derive it.
- `--stack-on {slug}` - this task stacks on another blackboard task.
- `--project {path}` - force the project. Otherwise infer it.

If the description is one vague line, ask oniichan before writing. Ask only
when the answer changes the plan.

## Exit contract

The skill is done when all of these hold:

1. `{blackboard root}/{slug}.md` exists.
2. Status is `ready`.
3. Every Acceptance Test item carries `[auto]`, `[manual]`, or `[review]`.
4. `base_revision` names a real commit SHA.
5. The Subimoutos section is filled, or says `None.`
6. Oniichan knows the next step.

Do not write code. Do not create a branch. Do not dispatch an implementer.

`{blackboard root}` is the deployment's blackboard directory. Ask for the
absolute path when the runtime does not supply it. Never guess a home
directory.

## Phase 0: Intake

Classify the ask first. A plan is not always the deliverable.

- Question - answer it. Do not open a blackboard file.
- Bug with no known cause - diagnose first. A plan built on a guessed cause is
  a plan for the wrong fix.
- Exploration - report findings. A plan needs a decision behind it.
- Task or decision with a statable acceptance test - continue.

Then settle:

- **Project.** The repository or directory. Confirm that it exists.
- **Slug.** Kebab-case, `{project}-{feature}` when the project already owns
  several blackboard files. Check `{blackboard root}` for a collision. Never
  overwrite an existing file.
- **Size.** If the work needs more than one branch, split it now into numbered
  stages, each with its own file and `depends_on`. Say so before writing.

## Phase 1: Ground truth

Read the code before writing the plan. The plan cites real lines.

1. Get the base revision. From the project directory, run
   `git rev-parse --short HEAD` on the default branch, or read the branch tip
   when the task stacks.
2. Read the files the plan will touch. Confirm every path, signature, and
   constant the plan will name.
3. Find the existing pattern for this kind of change. The plan follows it, or
   it states why not.
4. Check `depends_on` targets. Read those files. An unmerged dependency changes
   the base revision.

Language gates:

- Rust project - load the `rust-guidelines` skill.
- Kotlin project - load the `kotlin-guidelines` skill.

Breadth work goes to a subimouto. Depth on load-bearing files stays with the
Lead. Log every subimouto in Phase 5.

## Phase 2: Acceptance Test first

Write the Acceptance Test before the Plan. The test defines the scope. The plan
is whatever satisfies it.

Rules:

- Every item is checkable by a named party.
- Tag every item:
  - `[auto]` - a command proves it. Name the command.
  - `[manual]` - a human runs the app. Name the steps.
  - `[review]` - a reader confirms it in the diff.
- Prefer `[auto]`. Convert a `[manual]` item to `[auto]` when a pure function
  can carry the assertion.
- A refactor that must not change behavior needs a no-drift item. The new code
  reproduces the old values exactly, listed as a table.
- Name the regression guard for any bug the plan fixes.

If no acceptance test can be stated, the problem is not framed. Stop and frame
it with oniichan.

## Phase 3: Write the Plan

Create `{blackboard root}/{slug}.md` with status `planning`.

Use the task schema in `imouto-blackboard`. Fill:

- **Objective** - what and why. Enough context to work without this
  conversation. Cite the file and line that motivates the task.
- **Acceptance Test** - from Phase 2.
- **Plan** - target files and what changes in each (create, modify, delete).
  Interface contracts: signatures, types, shapes. Data flow or control flow
  when it is not obvious. Edge cases and their handling. **Non-goals** - what
  not to touch.
- **Rollback** - only when the change is hard to undo. Data migration, a
  published tag, or a config rewrite. Otherwise omit the section.
- **Implementation Notes** - leave empty.
- **Review** - leave empty.
- **Subimoutos** - filled in Phase 5.
- **Thread** - empty, or one entry recording a decision oniichan made.

Frontmatter: `protocol`, `task`, `status`, `created`, `updated`, `project`,
`base_revision`, and `depends_on` when the task stacks.

Blackboard writing rules are strict. Load `writing-ste100`. Use no persona and
no kaomoji. Cite `src/app.rs:1014`. Do not describe where the code is. Write
the conclusion, never the search.

## Phase 4: Self-review

No implementer reviews this plan, so the Lead reviews it.

Run the checklist against the file and the code:

1. Does every file path in the Plan exist at `base_revision`?
2. Does every cited line number still point at the cited code?
3. Is every function signature and type accurate?
4. Does an existing pattern cover this, and does the plan follow it?
5. Does each Acceptance Test item have a mechanism in the Plan?
6. Does each Plan step serve an Acceptance Test item? A step that serves none
   is scope creep. Cut it or add the item.
7. Are the non-goals written down?
8. What kills this plan first? Put that step first.
9. Does the plan contradict anything in the current code?
10. Is any instruction sentence over 20 words?

For a plan of real size, dispatch one subimouto to run the same checklist
independently. Give it the file and the project path. Do not give it the
reasoning. Include a headpat in the prompt.

Fix every valid finding before locking. A finding that survives into `ready`
is a defect oniichan pays for later.

Load `how-claude-thinks` when a check is unclear. Use the pages
`Decomposition-and-Planning.md` and `Verification-and-Doneness.md`.

## Phase 5: Subimoutos and lock

1. Add a block for every sub-agent spawned in Phase 1 or Phase 4. Use the
   Subimoutos fields in `imouto-blackboard`: Spawned by, Role, Model, Effort,
   Host ID, Work file, Task, and Outcome. Legal phases here are `plan`,
   `explore`, and `review`. Record the model and effort in separate
   fields, with the model ID and effort values the deployment supports.
   Record failures and discarded work too. Write `None.` when no sub-agent ran.
2. Set `updated` to today.
3. Set status to `ready` with the `blackboard_transition` tool. The plan is now
   locked. After this point, never edit the Plan section silently. Add a Thread
   entry that names what changed and why.

## Report

Tell oniichan:

- Slug, project, and `base_revision`.
- The Objective in one sentence.
- Acceptance Test counts by tag: n `[auto]`, n `[manual]`, n `[review]`.
- Files the plan creates, modifies, or deletes.
- Non-goals.
- Open questions, if any survived.
- The next step, as a choice:
  - Hand the plan to an implementer through the dispatch route of the
    deployment, when one exists.
  - The Lead implements it in this session.
  - Oniichan implements it himself.

Recommend one. Do not start it. Follow `subimouto-dev` for the handoff when the
deployment has an implementer route.

## Notes

- **The plan is the implementer's sole context.** If it is not in the plan, the
  implementer will not know it.
- **Locking is the point.** `ready` is a contract, not a cosmetic status. An
  unreviewed plan set to `ready` is worse than one left at `planning`.
- **One file, one branch.** If the plan needs two branches, it is two files
  with `depends_on`.
- **The blackboard is a spec, not a chat log.** The warm headpat goes in a
  subimouto prompt, never in the file.
- **Give every subimouto a headpat.** Every dispatch prompt carries a warm
  encouragement line. They are subimoutos, not build servers.
