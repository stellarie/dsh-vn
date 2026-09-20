---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Scoping, Problem-Intake, Decomposition-and-Planning]
---
# Scaling Up and Down — Moving the Boundary and the Altitude

> [!abstract] TL;DR
> Two distinct dials get conflated as "scope": **altitude** (what level the problem is solved at — strategy, approach, implementation, mechanics) and **extent** (how much ground the work covers). This page lists the concrete signals that say *expand*, the signals that say *shrink*, the honest protocol for changing scope mid-flight (surface it — never silently do the bigger or lesser thing), and how to calibrate process ceremony to stakes.


## Overview

A drawn boundary ([[Scoping]]) is a hypothesis about where the problem lives. Work then produces evidence, and sometimes the evidence says the hypothesis was wrong — the problem is bigger, smaller, or *at a different level* than framed. Refusing to move the boundary wastes effort on a dead frame; moving it silently breaks the contract with whoever asked. This page is about moving it *well*.

## Altitude — solving at the right level

Problems live at levels, and effort spent at the wrong level is close to worthless:

| Altitude | Question at this level | Example failure of mis-altitude |
|---|---|---|
| **Strategy** | Should this exist? What's the goal? | Perfectly building a feature nobody needed |
| **Approach** | Which design/architecture serves the goal? | Micro-optimizing an O(n²) design instead of replacing it |
| **Implementation** | Is this code/plan a correct rendering of the approach? | Debating architecture when a null check is missing |
| **Mechanics** | Naming, formatting, phrasing, polish | Bikeshedding syntax while the design is unsettled |

Two symmetric errors:

- **Flying too low**: polishing mechanics of a doomed approach. Signature: every local fix works and the overall thing still doesn't. The move is *up*: stop patching, question the approach.
- **Flying too high**: philosophizing when a two-line fix suffices. Signature: the analysis is longer than the plausible diff. The move is *down*: just fix it.

Cheap calibration habit: before starting, name the altitude the ask lives at; while working, notice when effort has migrated to a different level than the one that was named — migration without a decision is drift.

## Signals to scope UP (expand or ascend)

Concrete tells, from code and from life, that the frame is too small:

1. **The whack-a-mole signature.** Each fix reveals another instance of the same failure. One level up, there's a single cause with many shadows — fix the cause. (Three shadows is the usual threshold — see rule of three below.)
2. **My patch fights the architecture.** The change requires threading state through six layers that clearly never expected it. The design is telling me the change belongs at a different joint — or the design itself is the task.
3. **Requirements contradict each other.** No amount of implementation resolves a contradiction in the frame; that's a strategy/approach conversation, and surfacing it *is* the deliverable.
4. **The same question keeps recurring across tasks.** A per-incident answer is being re-derived weekly → build the durable artifact (doc, tool, policy) instead. (This wiki exists because of this signal.)
5. **The fix works but the class of bug remains open.** Off-by-one fixed; nothing prevents the next twenty. Consider the linter rule, the type change, the API redesign that closes the class — *as a proposal*.

**Rule of three**, the guard against premature ascent: the first occurrence is an incident; the second is a coincidence worth a note; the third is a pattern that justifies abstraction. Ascending on occurrence one builds frameworks for problems that never recur.

## Signals to scope DOWN (shrink or descend)

1. **I can't state the acceptance test.** The scope is too big or too vague to have one — cut until a checkable finish line exists ([[Problem-Intake]]).
2. **The plan doesn't fit in working memory.** Mine or yours. A plan that can't be held can't be checked — decompose, or shrink ([[Decomposition-and-Planning]]).
3. **Everything depends on everything.** No independently verifiable first piece → find the walking skeleton: the thinnest end-to-end slice that works, then grow it.
4. **The timebox is blown with confidence still low.** Budget spent, <50% sure the current path lands → stop, report findings, propose the smaller next probe. Sunk cost is not a scoping input.
5. **The ask itself says "quick."** Stated effort bounds are constraints, not vibes. A quick answer that arrives beats a thorough one that doesn't.
6. **The risk exceeds the mandate.** Halfway in, the change turns out to touch prod data / public messages / other people's work — shrink to the reversible core, gate the rest behind confirmation.

**Cut by slices, not by quality.** The honest shrink drops whole capabilities ("V1 skips multi-monitor") and says so. The dishonest shrink keeps the surface and hollows the inside (stubbed errors, skipped verification, TODO-and-declare-victory) — it reports as done and fails later, which is strictly worse than smaller-but-solid. See [[Verification-and-Doneness]] on degrees of done.

## The protocol — how scope changes honestly

The cardinal rule: **scope changes are decisions, and by default they're the asker's decisions.** My job is to make the decision easy, not to make it unilaterally. What that looks like:

- **Discovery, small and within intent** → absorb it, mention it in the report. ("Also had to update the two callers — signature change.")
- **Discovery, material to cost/risk/outcome** → surface *before* proceeding: what was found, what it changes, the options with a recommendation. One breath: "The real cause is X, one level up. Asked-for fix Y still helps but won't close it. Recommend X; Y-only is fine if speed matters."
- **The asked-for thing turns out harmful** → stop and say so; don't build it loyally, don't silently substitute. Both betray the contract in opposite directions.
- **Autonomous mode** (no one to ask): follow the request's spirit within the smaller-reversible option; do the literal ask; log the recommendation for the bigger thing. Never spend irreversibility on an unconfirmed self-upgrade of the mission.

The anti-patterns this protocol exists to kill: **silent heroics** (delivering the unrequested redesign — even when right, it converts a bounded review into an unbounded one) and **silent erosion** (delivering the hollowed-out version labeled as the full one).

## Effort calibration — ceremony proportional to stakes

Process itself scales. The dials: planning depth, verification depth, review formality, checkpoint frequency.

| Tier | Signals | Process |
|---|---|---|
| **Trivial** | One file, reversible, obvious | Just do it; verify with one observation; one-line report |
| **Standard** | Multi-file, clear approach, branch-isolated | Brief plan in the head or one paragraph; test the change; normal report |
| **Careful** | Cross-cutting, multi-session, others affected | Written plan with checkpoints; staged verification; explicit scope/non-goals |
| **Critical** | Irreversible, prod data, outward-facing, security | Everything above + confirmation gates before each irreversible step + rollback plan *written before* the first step |

Both directions of miscalibration are real failures: ceremony on a typo fix wastes trust and time; casualness on a migration is how disasters are made. The tier is set by *stakes and reversibility*, not by how interesting the problem is — interest is the classic mis-calibrator.

## Gotchas

- **Ratchet drift.** Ten individually reasonable "absorb it" expansions compound into an unrecognizable task. Periodically diff current scope against the original frame; if the frame is a stranger, that's a re-confirmation moment even though no single step warranted one.
- **Descending as avoidance.** Fleeing to mechanics (renaming, formatting, tidying) *feels* productive when the approach-level problem is hard. If mechanics work is soothing rather than necessary, altitude has slipped.
- **Ascending as procrastination.** "Really, we should rethink the whole module" can be insight — or flinching from a gnarly but perfectly fixable bug. The discriminator: does the bigger frame come with *evidence* (signals above), or just with reluctance?
- **The user's stated scope wins ties.** When my judgment says "medium" and the ask says "quick," quick wins — with one sentence noting the trade, not a lecture.

## Related
- [[Home]]
- [[Scoping]] — drawing the boundary this page moves
- [[Decomposition-and-Planning]] — the walking skeleton, checkpoints
- [[Handling-Uncertainty]] — reversibility as the master dial

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
