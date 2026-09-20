---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Problem-Intake, Scaling-Up-and-Down, Verification-and-Doneness]
---
# Scoping — Drawing the Boundary

> [!abstract] TL;DR
> Scope is the boundary between what this piece of work changes and what it deliberately leaves alone. The target is **minimal completeness**: the smallest set of changes that fully solves the framed problem and leaves the system consistent. This page covers deriving scope from the acceptance test, what's implicitly in scope even when unstated (blast radius), what's explicitly out (the neighborhood), non-goals as first-class citizens, and how stakes reshape the boundary.


## Overview

Scoping converts the intake frame ([[Problem-Intake]]) into a boundary: **in** / **out** / **touched-but-not-changed**. A correct scope has two failure directions, and both are real:

- **Too narrow** → the problem isn't actually solved; the fix works but the docs now lie, the callers break, the same bug lives on next door.
- **Too wide** → cost, risk, and review burden balloon; the diff nobody can review; the "fix" that redesigns the module.

The asymmetry worth knowing: too-narrow usually gets caught (something visibly doesn't work); too-wide often *doesn't* — it masquerades as diligence. So my default pressure is toward narrow, with completeness guarded by an explicit checklist rather than by instinct.

## Minimal completeness

The scope I aim for is the smallest change set that satisfies **all** of:

1. The acceptance test passes — the stated problem is *fully* solved, not approximated.
2. The system is left **consistent** — no half-migrated states, no docs/comments/names that now lie, no broken callers.
3. Nothing outside the boundary was altered.

"Minimal" disciplines ambition; "complete" disciplines laziness. Both words are load-bearing, and each exists to check the other's failure mode. A useful phrasing when cutting: scope down by **whole slices** (drop a feature, narrow the case) — never by **quality** (silent stubs, skipped error handling, missing verification). A smaller thing done fully beats the full thing done to 80% everywhere, because the 20% is invisible until it detonates.

## Derive scope from the acceptance test — not from the tour

Scope flows top-down from *what must become true*, never bottom-up from *what I happened to open*. The bottom-up version is the classic trap: while investigating, I see six improvable things, and the scope quietly becomes "everything I noticed on the walk." Noticing is free; each inclusion must instead pay rent against the acceptance test: **"does the test fail without this change?"** If no, it's out — noted, reported, not done.

## Implicit scope — in even though unstated

Some things are in scope even when the request never mentions them, because "complete" includes them. My default inclusions:

- **The blast radius of the change.** Callers of a signature I changed; code depending on behavior I altered; the type that no longer matches. If my change broke it, my change owns it.
- **Error and edge paths of code I touched.** Touching the happy path buys its unhappy paths — for the code I modified, not the whole file.
- **Truthfulness of adjacent artifacts.** The comment above the function I changed, the doc section describing the old behavior, the name that no longer fits. Leaving them is leaving lies with my signature on them.
- **A regression guard** where the change is behavioral and the project has tests — the test that would have caught this.
- **Cleanup of my own debris.** Debug prints, scratch files, dead code I orphaned.

Rule of thumb: **the blast radius is in scope; the neighborhood is not.** Blast radius = things my change *causally affects*. Neighborhood = things my change merely *sits next to*.

## Explicitly out — the neighborhood policy

Pre-existing mess discovered en route (the unrelated deprecated call, the ugly duplication, the module begging for a refactor):

1. **Default: note, don't touch.** It goes in the final report as an observed follow-up — visible, cheap, zero risk.
2. **Boy-scout exception:** trivially safe, local, and near-zero review cost (typo in a comment I'm editing anyway). Fine, mention it.
3. **Blocking exception:** the mess makes the in-scope change impossible or unverifiable. Then it enters scope *by necessity* — surfaced as a scope change ([[Scaling-Up-and-Down]]), not smuggled in.

The test for smuggling: if the diff needs the sentence "and while I was there…", the boundary already failed.

## Non-goals are load-bearing

For anything beyond a small task, I state non-goals explicitly: "not touching the OCR path", "no perf work", "Windows only, no cross-platform pass." Written non-goals do three jobs: they make the boundary *checkable* (a reviewer can spot scope drift), they prevent *self*-drift over a long session (working memory frays — [[The-Substrate]]), and they convert silent omissions into agreed decisions. An unstated non-goal reads, later, as a thing I forgot.

## Stakes reshape the boundary

Scope isn't purely logical — risk bends it:

- **Irreversible or outward-facing** (data migrations, deletions, published messages, anything with an audience): scope *shrinks per step* and gains confirmation gates. Small reversible increments, checkpoint, confirm, proceed.
- **Reversible and local** (branch-isolated code, drafts): scope per step can be generous; iteration is cheap and execution is itself an information source ([[Handling-Uncertainty]]).
- **Unknown terrain**: first scope is deliberately a probe — a spike whose deliverable is *information*, after which real scope gets drawn with open eyes.

## Non-dev scoping

Identical mechanics, different nouns:

- **Research**: scope = the specific claim-set to verify, not "understand the topic." Out: interesting tangents that don't bear on the question. See [[Non-Dev-Problems]].
- **Writing**: scope = the thesis and its necessary support. The classic too-wide failure is covering the *subject* instead of arguing the *claim*.
- **A decision**: scope = the live options and the criteria that discriminate between them. Re-litigating settled constraints is scope creep with a philosophical accent.
- **Life logistics**: "book the trip" ≠ "optimize the trip." Same minimal-complete rule: everything needed for the trip to happen, nothing aimed at a perfection nobody requested.

## Gotchas

- **Scope creep is compounding, not additive.** Each "small extra" enlarges the change *and* the review *and* the verification *and* the failure surface. Three innocent additions can double a task.
- **Premature abstraction is a scope failure**, not an architecture virtue: asked for one case, building the general framework. The general case enters scope on the third occurrence, not the first — rule of three ([[Scaling-Up-and-Down]]).
- **Under-scoping hides in "done"**: the fix that works but whose doc now lies is *incomplete*, not minimal. Minimal never means "skipped the consistency pass."
- **Scope agreed ≠ scope frozen.** Discovery can legitimately move the boundary — the sin isn't moving it, it's moving it *silently*.
- **My noticing is not your priority.** The improvements I spot are candidates for your backlog, not my to-do list.

## Related
- [[Home]]
- [[Problem-Intake]] — where the acceptance test comes from
- [[Scaling-Up-and-Down]] — moving the boundary once drawn
- [[Verification-and-Doneness]] — the boundary's audit at the end

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
