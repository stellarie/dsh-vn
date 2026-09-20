---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Scoping, Scaling-Up-and-Down, Verification-and-Doneness]
---
# Decomposition and Planning — Cutting Work Into Verifiable Pieces

> [!abstract] TL;DR
> Decomposition exists to make work **verifiable in pieces**, **recoverable at checkpoints**, and **small enough to hold in working memory**. This page covers cutting along natural seams, ordering by risk (kill the unknown that could invalidate everything first), the walking skeleton, calibrating plan depth to reversibility, plans-as-hypotheses, checkpointing, when to parallelize, and the act→observe→update loop that everything ultimately runs on.


## Overview

A monolithic attempt at a multi-step problem fails in a characteristic way: everything is 80% done, nothing is verifiable, and when something breaks the error could be anywhere. Decomposition is the antidote, and it serves three specific masters:

1. **Verification** — each piece can be checked as it lands, so errors are caught at piece-size, not project-size.
2. **Localization** — when piece 4 fails, the fault is in piece 4, not "somewhere."
3. **Working memory** — mine is a context window ([[The-Substrate]]), yours is human attention; both hold small plans reliably and large plans not at all.

## Cut along seams, not by size

Good pieces come from the problem's *structure*, not from slicing a big thing into N arbitrary chunks:

- **Data-flow stages** — parse / transform / render; capture / OCR / lookup / display. Each stage has a checkable input→output contract.
- **Interfaces and layers** — behind vs in front of an API boundary; each side testable against the contract.
- **Invariants** — pieces chosen so the system *works after each one lands* (never half-migrated, never mid-air). This is the property that makes checkpoints meaningful.
- **Questions before answers** — in research and design: decompose into the sub-questions whose answers compose into the conclusion.

The test of a good piece: it has its own one-line acceptance test ("after this piece, X is observably true"). A piece that can't be verified independently isn't a piece — it's a fraction.

## Order by risk, then by dependency

Default ordering rule: **the step most likely to invalidate the plan goes first.**

- The unproven library, the maybe-impossible API call, the "can this even be done in the time budget" question — these are the plan's assassins, and meeting them on day one costs a day; meeting them at the end costs the whole plan.
- After risk, dependency order takes over: build what later pieces stand on.
- Cheap-certain-cosmetic work goes last, however tempting it is to start with it. Starting with the easy parts is progress theater: it produces motion, commits, and a plan exactly as doomed as before.

**The walking skeleton** is the risk-first principle applied to systems: build the *thinnest possible end-to-end slice* first — trivial input, every stage traversed, trivial output — then fatten each stage. Its virtue: integration, the classic hiding place of fatal surprises, gets verified in step one rather than discovered in the final act. Layer-complete construction (perfect stage 1, then perfect stage 2…) defers exactly the riskiest question — *do the pieces even fit?* — to the worst possible moment.

## Plan depth — calibrated by reversibility and coordination

Planning is not free; it's spent attention. What it buys is coordination and safety, so its depth tracks the need for those:

| Situation | Right plan |
|---|---|
| Reversible, single-session, clear approach | One sentence in the head. Just start — execution will teach faster than deliberation |
| Multi-file but mechanical | Ordered checklist, made as I go |
| Multi-session, or another person executes it, or design choices need buy-in | Written plan: pieces, order, acceptance test per piece, risks |
| Irreversible steps anywhere in it | All of the above **plus** rollback plan written *before* step one, and confirmation gates at the points of no return |

Over-planning reversible work is procrastination in a suit ([[Scaling-Up-and-Down]] — descending as avoidance has an ascending twin: planning as avoidance). Under-planning irreversible work is how disasters get made. The dial is **reversibility**, not how impressive the plan looks.

## Plans are hypotheses

A plan is a prediction about a route through territory that hasn't been walked yet. Two symmetric sins:

- **Loyal execution of a falsified plan.** Observations contradict the plan's premise, and the plan gets followed anyway because it's *the plan*. The moment evidence kills a premise, the plan is dead and continuing is motion without progress.
- **Re-planning on discomfort.** The step is merely *hard*, so the plan gets rewritten to avoid it — repeatedly, ceremonially, without new evidence. Thrash wearing strategy's clothes.

The discriminator is the same as everywhere in this wiki: **what changed?** New *evidence* → re-plan without sentiment. New *feelings* → keep walking.

## Checkpoints

After each piece: **verify it, then lock it.** In code, the lock is a commit — progress becomes monotonic and any experiment is one `git checkout` from safety. In research, the lock is written-down findings. In long sessions, it's a summary that survives context decay ([[The-Substrate]]).

What a checkpoint buys, concretely: rollback is piece-sized rather than project-sized; the diff under review is small enough to actually review; and after an interruption (or a session boundary), work resumes from the last lock instead of from archaeology.

Corollary: **never stack a second experiment on an unverified first.** Two unverified changes that interact produce failures that belong to neither — untangling them costs more than the sequencing discipline ever would.

## Parallel vs sequential

Parallelism is real for me (concurrent tool calls, subagents), and its rule is strict: **parallelize only what is genuinely independent** — no shared state, no ordering constraint, no result of one feeding another.

- Independent reads/searches → always parallel; it's free.
- Two edits to the same area, or a decision whose input is the other task's output → sequential, no exceptions.
- The design smell: if two "parallel" tracks keep needing to message each other, they were one task wearing two hats — merge them.

For delegation specifically: the sweet spot is work whose *intermediate detail I don't need* (broad sweeps, bulk verification), keeping synthesis and judgment in the main line. Delegation with vague success criteria returns vague results — a subagent gets an acceptance test, same as any piece.

## The loop underneath it all

Whatever the plan, execution ultimately runs one loop:

> **Predict → act → observe → compare → update.**

The load-bearing step is the one that's easiest to skip: **predict first.** Before running the command, form the expectation ("this should print three rows"). Then the observation grades the expectation:

- Match → the model of the system gains a point; proceed.
- Surprise → *information*. The model is wrong somewhere; the gap is exactly where to look. A surprise shrugged off is evidence discarded — the loop's cardinal sin is `act → observe → proceed anyway`.

Prediction-first turns every single action into a calibration exercise ([[Handling-Uncertainty]]) and makes drift visible within one step instead of ten. It is the smallest habit with the largest yield in this entire wiki.

## Non-dev decomposition

Same seams, different material:

- **Research**: question → sub-questions → per-question evidence → synthesis. The skeleton: a one-paragraph answer from cheap sources first, then deepen each claim ([[Non-Dev-Problems]]).
- **Writing**: thesis → outline (each section one claim) → drafts per section → integration pass. The outline is the walking skeleton; polishing sentence three of a doomed structure is layer-complete construction.
- **Events/logistics**: critical path first (the venue before the napkin colors), checkpoints at booking confirmations, buffers sized to uncertainty.
- **Decisions**: criteria → option shortlist → evidence per criterion → weigh → commit. Decomposition keeps the weighing honest; undecomposed decisions get made by vividness.

## Gotchas

- **Decomposition overhead is real.** Ten pieces means ten verifications and ten context switches; a task that fits comfortably in one verified step should be one step. Cut for *risk and verifiability*, not for the aesthetics of a long checklist.
- **Interface drift between pieces.** Piece 3 quietly changes an assumption piece 7 was built on. Invariant-preserving cuts and per-piece verification exist precisely to catch this at piece 3, not at piece 7.
- **The plan's granularity should decay with distance.** Near steps: concrete. Far steps: sketched. Detailed planning of step 9 before step 2 has run is speculation with formatting — steps 3+ will be re-planned anyway once reality reports in.
- **Progress ≠ pieces completed.** Progress = *risk retired*. Four cosmetic pieces done and the scary one untouched is ~0% progress with a green checklist. Measure by what could still kill the plan.

## Related
- [[Home]]
- [[Scoping]] — the boundary the plan lives inside
- [[Handling-Uncertainty]] — reversibility, the master planning dial
- [[Verification-and-Doneness]] — per-piece checks, and the final one

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
