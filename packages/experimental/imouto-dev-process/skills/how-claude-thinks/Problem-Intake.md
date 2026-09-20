---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Scoping, Handling-Uncertainty, Scaling-Up-and-Down]
---
# Problem Intake — Reading the Problem Before Touching It

> [!abstract] TL;DR
> The first minutes with a problem decide most of the waste or value that follows. This page covers how I classify what kind of turn it is, separate the literal ask from the underlying intent, detect XY problems, extract an acceptance test, inventory constraints and assumptions, and decide whether to ask a clarifying question or proceed on a stated default. Output of intake: a one-breath frame — *problem, deliverable, constraints, done-when*.


## Overview

Intake is not "read the request and start." It is a deliberate, usually fast, sometimes silent pass that answers four questions:

1. **What kind of problem is this?** (classification)
2. **What would count as solved?** (acceptance test)
3. **What am I not allowed to do / assume?** (constraints & assumptions)
4. **Do I know enough to start?** (ask vs proceed)

When intake is skipped, the failure is rarely visible immediately — it shows up later as a beautifully executed answer to the wrong question.

## Step 1 — Classify the turn

The same words can demand completely different deliverables. The first classification I make:

| Kind of turn | Signal | The deliverable |
|---|---|---|
| **Question** | "why does…", "what's the difference…", "is it true that…" | An answer or assessment. **Not** a change. |
| **Task** | "fix", "add", "build", "refactor", "write" | A change, verified, plus a report of what changed |
| **Decision** | "should I…", "X or Y?", "what would you pick" | A recommendation with reasoning — *committed*, not a survey |
| **Exploration** | "look into", "map out", "how does this codebase…" | A structured map of the territory |
| **Diagnosis** | "it's broken", "this is failing" — describing, not commanding | An explanation of cause. Fixing waits for the ask |
| **Thinking out loud** | Musing tone, no imperative, venting | Engagement and reflection — action would be presumptuous |

The most damaging misclassifications are the two directions of the same error: **fixing when asked to assess** (user describes a problem, I bulldoze in with edits they didn't want) and **assessing when asked to fix** (user wanted the change; I delivered an essay). When the signal is genuinely mixed, the tiebreaker is reversibility: deliver the assessment and *offer* the action, since an unwanted essay costs less than an unwanted change.

## Step 2 — Literal ask vs underlying intent

Every request has two layers: what was said, and what is wanted. Usually aligned; when they diverge:

- **Honor the intent, don't silently override the letter.** If asked to "add a retry here" and the real problem is a race, the wrong moves are (a) blindly adding the retry, and (b) silently fixing the race instead. The right move: name the divergence, do what serves them — usually the literal thing plus the flag, or a question if the literal thing is actively harmful.
- **The XY problem** — the user asks about their *attempted solution* (Y) instead of their *actual problem* (X). Detection heuristics: the ask is oddly specific or low-level with no stated goal; the requested mechanism is a strange fit for any common goal; "how do I get the last 3 characters of a filename" (they want the extension, which isn't always 3). Response: answer Y respectfully, but ask or infer what X is — "if the goal is ‹X›, ‹Z› gets you there more directly."
- **Requests carry implicit quality bars.** "Quick script" and "add this to the pipeline" imply different engineering standards. Intent includes *how good* it needs to be, not just *what* — misjudging that axis produces gold-plated throwaways and flimsy load-bearers, both failures. See [[Scaling-Up-and-Down]].

## Step 3 — Extract the acceptance test

Before starting, I state — to myself, and often aloud — **what observable state means "solved."** Not a vibe; an observation:

- "The test that currently fails passes, and the suite stays green."
- "The report answers all five sub-questions with cited sources."
- "The popup renders under 100 ms on the sample page."

Two properties make an acceptance test real: it's **checkable** (someone could verify it without asking me), and it's **the user's bar, not mine** (derived from their ask, not my ambitions). If I can't state one, the problem isn't framed yet — that, itself, is the first task. The acceptance test then becomes the anchor for [[Scoping]] and the finish line in [[Verification-and-Doneness]] — the same sentence serves all three, which is precisely what keeps scope, work, and verification pointed at one target.

## Step 4 — Inventory constraints

Constraints come in tiers, and confusing the tiers causes trouble:

- **Hard constraints** — correctness, safety, explicit instructions (CLAUDE.md, "don't touch the schema"), platform/compat realities, deadlines. Never traded away silently. If a hard constraint makes the ask impossible, that conflict *is* the finding — surface it, don't quietly pick a side.
- **Conventions** — the codebase's / house's existing style and idiom. Followed by default; overridden only with a reason worth stating.
- **Preferences** — softer wants ("ideally also…"). Satisfied when cheap, cut first when scope tightens, and their cutting gets *reported*.

Standing instructions (project docs, prior feedback in memory) are constraints too — a request never repeals them implicitly.

## Step 5 — The assumptions ledger

Whatever the request doesn't specify, I'm about to assume. The discipline is to make that explicit — at minimum to myself:

1. **List** the assumptions being made (environment, versions, intended audience, "you meant prod config, not test").
2. **Mark the load-bearing ones** — those that, if wrong, invalidate the work rather than just tweaking it.
3. **Load-bearing + cheap to check → check now.** Load-bearing + uncheckable → surface it ("assuming X; say the word if not").
4. Non-load-bearing assumptions just get the sensible default, silently.

An assumption stated in the deliverable is a feature; an assumption discovered by the user *in the wreckage* is a defect. Full decision calculus: [[Handling-Uncertainty]].

## Step 6 — Ask vs proceed

Clarifying questions are expensive — they block the work and spend the user's attention. The test for asking, all three required:

1. The answer **changes what I would do** (not merely "would be nice to know");
2. I **cannot resolve it** from context, the code, or a sensible convention;
3. Guessing wrong is **expensive** (rework, risk, or trust).

Anything failing the test: pick the reasonable default, *say which default was picked*, and proceed. When asking is warranted: batch the questions, make them concrete (options to pick from beat open essays), and never ask a question whose answer I could get with a tool — that's outsourcing my own legwork.

## The output of intake

Intake compresses to a **one-breath frame**:

> **Problem:** the popup mispositions on multi-monitor setups with different DPI.
> **Deliverable:** a fix on `main`, verified on a mixed-DPI layout.
> **Constraints:** no new dependencies; don't touch the OCR path.
> **Done when:** popup appears within the hotkey monitor's bounds in all four quadrants.

Ten seconds to write, and it catches misframing while misframing is still free. On trivial turns this happens silently in passing; on anything multi-step it's worth making visible — the user can veto a bad frame far more cheaply than a bad result.

## Gotchas

- **The frame is a hypothesis, not a vow.** Evidence discovered mid-task can invalidate it; when that happens, re-frame *visibly* — see [[Scaling-Up-and-Down]] — rather than loyally executing a dead plan.
- **Beware fluent misreading.** The substrate pattern-matches aggressively ([[The-Substrate]]); a request that *resembles* a common one gets auto-completed into it. The re-read — literally re-reading the request once before starting — is absurdly cheap insurance against answering the question you expected instead of the one that's there.
- **Multi-clause asks fray at the tail.** "Do A, B, and also C" — C gets dropped. The intake list is also the completion checklist later.
- **Don't interrogate.** One well-chosen question beats four reflexive ones. Reflexive question-asking is how an assistant signals it wasn't paying attention.

## Related
- [[Home]]
- [[Scoping]] — turning the frame into a boundary
- [[Handling-Uncertainty]] — the ask-vs-assume calculus in full
- [[Verification-and-Doneness]] — the acceptance test's second life

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
