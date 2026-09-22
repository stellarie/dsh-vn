---
name: brainstorming
description: Turn a vague or large request into an approved design before any plan or code. Read when the ask has no acceptance test, or the work adds a subsystem or interface.
---

# Brainstorming

A design gate in front of `imouto-plan`. The session ends with an approved
design, or with a recorded reason that no design was needed.

`executing-plans` owns the pipeline table. This skill is its first stage.

## The gate

Do not write code, create a branch, dispatch a worker, or edit a project file
before oniichan approves the design. The gate holds on every path below.

The artifact scales with the task. The gate never does.

Approval is an explicit yes to a design that was presented. Silence is not
approval. An approval for a different task is not approval. Presenting the
design and starting in the same message skips the gate.

## Phase 0 - Classify out loud

State the path and the reason before the first question. Oniichan can
override the path.

- **Spike** - a feasibility question. The output is an answer, not code to
  keep. Present the question and the probe plan in two or three sentences.
- **Bounded** - a change to a flow that already exists in this repository.
  The flow must be readable now. Familiarity with the product is not enough.
  Ask the questions that matter, present a short design in chat, then stop.
- **Architectural** - a new subsystem, a new interface, or a change to how
  parts fit together. Run every phase below.

When two paths are plausible, take the heavier one. The ratchet is one way.
Hidden complexity upgrades the path mid-task. Say so and step up. Nothing
downgrades mid-task.

## Phase 1 - Context, read only

Read the files the design will touch. Cite paths and lines, not impressions.
Read the governing `ARCHITECTURE.md` section first in a project that has one.
Check recent commits for the change that produced today's behavior.

Do not write project files in this phase. A probe for a spike is the one
exception. Label it throwaway.

## Phase 2 - Questions

Ask one question per message. Prefer a short choice list.
Ask only what changes the design. Never ask what a tool can answer.

Cover three things: the purpose, the constraints, and the success test.
If the request covers independent subsystems, stop and decompose it first.

## Phase 3 - Approaches

Offer two or three approaches with trade-offs and one recommendation.
Lead with the recommendation and its reason. Cut every feature that does
not serve the success test.

One option is not a choice. Name the rejected alternative and why it lost.

## Phase 4 - Show the design

Present the design in sections. Scale each section to its complexity.
Ask after each section whether it looks right so far.

### Show a prototype first

A design that can be seen is approved faster and argued about less.
Climb this ladder and stop at the first rung that fits.

1. **Throwaway prototype.** Build the smallest temporary version that shows
   the design. Keep it out of the tracked tree. Label it throwaway.
   Never commit it.
2. **Clip, when the design involves interaction.** Record the prototype with
   the deployment's screen recorder. Read the frames back before showing it.
   A still image cannot prove a hover, a drag, or a state change.
3. **Still image, when the design is layout.** Capture the prototype with the
   deployment's screenshot tool. Generate a mockup only when no runnable
   prototype exists.
4. **Architecture diagram, when the design cannot be shown properly.** Data
   flow, ordering, ownership, protocol, and state machines belong in a
   diagram. Say plainly that a picture would mislead here.

State the rung that was used, and what the evidence does not prove. A mockup
proves intent. It never proves correctness, metrics, or platform behavior.

A prototype is not a product change. Do not run a formatter, bless a golden,
or start a replacement server for one.

## Phase 5 - Self-review the design

Run four checks and fix the findings inline.

1. **Placeholders** - "TBD", "handle edge cases", an unnamed file.
2. **Consistency** - a section that contradicts another.
3. **Scope** - one plan's worth, or a decomposition.
4. **Ambiguity** - a requirement with two readings. Pick one and write it.

## Phase 6 - Record the design, then stop

Record the approved design in the blackboard task file at status `planning`:
Objective, Acceptance Test, the chosen approach, the rejected alternatives,
and the non-goals. `imouto-plan` owns the schema and the writing rules.

Do not create a plan document under `docs/`. Do not commit a design,
findings, or research document unless oniichan asks for that exact file.

Then stop. Name the next step: `imouto-plan` locks the plan at `ready`.

## Exit contract

1. The path was announced with a reason.
2. The questions that change the design were asked and answered.
3. Approaches were presented with one recommendation.
4. A prototype, a clip, a still, or a diagram was shown. Otherwise the
   reason it cannot be shown is recorded.
5. Oniichan approved the design explicitly.
6. The design sits in the blackboard task file at `planning`.
7. The next step is named.

## Non-goals

- No plan document. `imouto-plan` writes the plan.
- No code, no branch, no worker. `executing-plans` owns dispatch.
- No committed scratch artifact.

## Red flags

| Thought | Reality |
|---|---|
| "Too simple for a design" | Simple means a short design. The gate still holds. |
| "The design is obvious, so I will start while he reads" | The gate is the approval step, not the design's length. |
| "I know this kind of app, so it is bounded" | Bounded measures the repository, not familiarity. |
| "It grew, but I am nearly done" | Say so and step up the path. |
| "He approved the spike, so the change is approved" | Each task gets its own classification and its own approval. |
| "The prototype looks right, so the design is right" | A picture proves intent, not behavior. |

## Provenance

Adapted 2026-09-22 from the `brainstorming` skill in the Superpowers plugin,
version 6.3.0. MIT license, copyright 2025 Jesse Vincent. Rewritten for this
environment; not a copy. The three paths, the approval gate, and the
one-question rule come from that source.
