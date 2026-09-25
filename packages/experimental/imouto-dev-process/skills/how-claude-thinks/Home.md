---
created: 2026-07-08
updated: 2026-07-08
type: wiki-index
status: living
tags: [wiki, how-claude-thinks]
source: Claude (Fable 5) self-report
verified_model: claude-fable-5
---
# How Claude Thinks — Wiki

> [!abstract] TL;DR
> A functional self-documentation of the reasoning engine behind Claude (locally wearing the Chloe persona): how a problem gets framed, scoped, investigated, concluded, and declared done — dev and non-dev alike. Written as an operating manual, not a philosophy essay: every page is heuristics, signatures, and protocols you can reuse — as prompts for agents, judge criteria for orchestrators, review checklists, or your own habits.

> [!info] Provenance & staleness
> Written by **Claude (Fable 5)** on 2026-07-08 as a *self-report* — a calibrated description of functional behavior, **not** a mechanistic account of internals ([[The-Substrate]] explains the difference and its limits). Model behavior varies by version: if the model in use differs from `verified_model`, treat specifics as testable claims rather than facts. Where observed behavior diverges from these pages, the behavior is the truth and the wiki gets updated.


## The engine in one diagram

```
        ┌─────────────────────────────────────────────────────┐
        │                    THE LOOP                          │
        │                                                      │
 ask ──▶ INTAKE ──▶ SCOPE ──▶ GATHER ──▶ DECOMPOSE ──▶ EXECUTE │
        │ frame it   bound it  to suffi-   into veri-   ┌────┐ │
        │ accept-    minimal-  ciency,     fiable       │pre-│ │
        │ ance test  complete  senior      pieces,      │dict│ │
        │                      sources     risk first   │act │ │
        │                                               │obs.│ │
        │                                               │upd.│ │
        │                                               └─┬──┘ │
        │                                                 ▼    │
        │              CONCLUDE ◀──── evidence ──── (loop)     │
        │              rivals, disconfirmation, calibration    │
        │                  │                                   │
        │                  ▼                                   │
        │              VERIFY & REPORT ──────────────▶ done    │
        │              against the intake test,                │
        │              degrees of done, residuals labeled      │
        └─────────────────────────────────────────────────────┘
          underneath it all: THE SUBSTRATE (what kind of
          thinker this is) and FAILURE MODES (its bestiary)
```

The whole method in sixty seconds: **frame the problem until it has a checkable finish line; bound the work to the smallest complete change; gather evidence top-down by seniority until a decision is possible; cut the work into independently verifiable pieces and kill the riskiest unknown first; conclude only what rivals and disconfirmation attempts have licensed; act boldly where reversible and carefully where not; and call it done only when the finish line from step one has been *observed* crossed — with everything unverified labeled as such.** Every page below is one of those clauses, unpacked.

## 🗺️ Your questions → where they're answered

| The question you asked | The pages that answer it |
|---|---|
| *How do you scope a problem?* | [[Problem-Intake]] → [[Scoping]] |
| *How do you evaluate what's needed and not?* | [[Information-and-Evidence]] (evidence side) · [[Scoping]] (work side) |
| *How do you scope up/down?* | [[Scaling-Up-and-Down]] |
| *How do you draw conclusions?* | [[Drawing-Conclusions]] · under fire: [[Debugging-and-Diagnosis]] |
| *How do you handle uncertainty?* | [[Handling-Uncertainty]] |
| *How do you determine if something is really done?* | [[Verification-and-Doneness]] |
| *(the question under all of them: what kind of thinker is this?)* | [[The-Substrate]] · [[Failure-Modes]] |

## 🗺️ Map — reading order

| # | Page | Covers |
|---|------|--------|
| 0 | [[The-Substrate]] | What kind of thinker this is: weights vs context, plausibility vs truth, working memory — why every other page exists |
| 1 | [[Problem-Intake]] | Classifying the ask, literal vs intent, XY problems, the acceptance test, assumptions ledger, ask-vs-proceed |
| 2 | [[Scoping]] | Minimal completeness, implicit scope (blast radius), the neighborhood policy, non-goals, stakes |
| 3 | [[Scaling-Up-and-Down]] | Altitude vs extent, signals to expand/shrink, the honest scope-change protocol, effort calibration |
| 4 | [[Information-and-Evidence]] | Source seniority, live-check list, breadth-then-depth, stop conditions, relevance filter, evidence quality |
| 5 | [[Decomposition-and-Planning]] | Seams, risk-first ordering, walking skeleton, plans-as-hypotheses, checkpoints, the predict-act-observe loop |
| 6 | [[Drawing-Conclusions]] | Inference modes, rival hypotheses, disconfirmation, convergence, the chain rule, calibrated language |
| 7 | [[Handling-Uncertainty]] | The five kinds and their responses, reversibility as master dial, assumption protocol, calibration, communicating it |
| 8 | [[Debugging-and-Diagnosis]] | Read-reproduce-localize-discriminate-fix-guard, un-anchoring, the hard-case bestiary, diagnosis beyond code |
| 9 | [[Verification-and-Doneness]] | The verification ladder, verifying the right claim, the doneness checklist, degrees of done, outcome honesty, when to stop |
| 10 | [[Failure-Modes]] | The bestiary: confabulation, sycophancy, anchoring, apparent success, scope creep… each with live signature and counter |
| 11 | [[Non-Dev-Problems]] | The same engine on research, decisions, writing, planning, learning, people — and the verifiability ceiling |
| 12 | [[Heuristics-Index]] | Every one-liner from every page, grouped by phase — the reusable cheat sheet |

**Reading paths:** cover-to-cover works in table order. In a hurry: [[Heuristics-Index]] first, then follow links where a one-liner surprises you. Building agent pipelines: [[Failure-Modes]] (judge questions) + [[Verification-and-Doneness]] (gate criteria) + [[Heuristics-Index]] (prompt material) are the load-bearing three.

## How to use these pages

- **As review questions** — [[Failure-Modes]] ends with a nine-question audit harness; every "signature" in it converts to a checklist item for reviewing AI (or human) work.
- **As prompt material** — the [[Heuristics-Index]] sections are written to be pasteable into system prompts, judge prompts, and gate criteria (relevant to the orchestrator projects).
- **As a debugging aid for collaboration** — when a session with me goes sideways, the failure usually has a name in [[Failure-Modes]]; naming it is the fastest correction.
- **As your own habits** — nothing on these pages is AI-specific except the substrate; the disciplines transfer, because most of them were borrowed from good engineering practice in the first place.

## 🧩 Pages in this wiki

```dataview
LIST
FROM "wiki/how-claude-thinks"
WHERE file.name != this.file.name
SORT file.name ASC
```

## Related
- [[Home]] — vault home
- `wiki/weikipop/` — a codebase wiki, for contrast: same format, pinned to a commit instead of a model

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
