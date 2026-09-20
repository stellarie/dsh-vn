---
name: code-review
description: Ask for a review, and receive one with technical rigor. Read before handing work to a reviewer, before merging, and when acting on review findings or pushback.
---

# Code Review

Two directions, one standard: the review is a technical exchange, not a social
performance.

## Asking for a review

Ask after each work slice, before a merge, and when you are stuck.

Hand the reviewer crafted context. Never hand over your session history: the
reviewer must judge the work product, not your reasoning.

Give exactly this:

1. What changed, in one line.
2. The requirement or plan it must satisfy.
3. The base and head revisions.
4. The acceptance test, and the evidence already gathered.
5. The files in scope.

Use a subagent or teammate for the review, so the diff and the evaluation stay
in its context and only the findings return. For imouto work, the review route
and ownership rules live in `imouto-blackboard` and `subimouto-dev`.

Act on findings by severity:

- **Blocking** — breaks behavior, security, or data. Fix before anything else.
- **Important** — fix before proceeding.
- **Minor** — record it, then decide.

## Receiving a review

The response pattern:

1. **Read** the whole review without reacting.
2. **Restate** the requirement in your own words, or ask.
3. **Verify** the claim against the code. Do not take it on faith.
4. **Evaluate** it for this codebase, not for codebases in general.
5. **Respond** with technical reasoning, or just fix it.
6. **Implement** one item at a time, testing each.

### Forbidden

- "You're absolutely right!"
- "Great point!" or "Excellent feedback!"
- "Thanks for catching that." Gratitude is not a technical response.
- Implementing anything before verifying it.

Instead: state the fix, or state the technical reason it is wrong. The change in
the code is the acknowledgement.

### When an item is unclear

Stop. Ask about every unclear item before implementing any of them. Items in one
review are usually related, so a partial understanding produces a wrong
implementation.

Example: with items 1-6, and 4 and 5 unclear, say so. Do not implement 1, 2, 3,
and 6 first.

### Verify before you accept

For a reviewer outside this project, check every suggestion:

1. Is it correct for this codebase?
2. Does it break working behavior?
3. Is there a reason the current code does it this way?
4. Does the reviewer have the full context?
5. Does it work on every platform the code supports?

If the suggestion proposes a "proper" implementation of something, search for
its callers first. Unused code earns removal, not expansion.

### Push back when

- The suggestion breaks working behavior.
- The reviewer lacks context you have.
- It adds an unused feature.
- It is wrong for this stack or this platform.
- It conflicts with a decision oniichan already made.

Push back with evidence: a test, a call site, or the standards page. If the
decision is architectural, bring oniichan in.

### When your pushback was wrong

Say so in one sentence, factually: what you checked, what it showed, and that
you are implementing it. Do not apologize at length, and do not explain why you
pushed back.

## GitHub threads

Reply inside the review comment thread, not as a new top-level comment.

## Red flags

- Reviewing your own diff and calling it reviewed.
- Skipping review because the change is small.
- Implementing a review item you have not verified.
- Arguing with valid technical feedback.
- Matching work to a reviewer's preference against the house standard.

## Provenance

Merged and adapted 2026-09-20 from `requesting-code-review` and
`receiving-code-review` in the Superpowers plugin under
`~/.claude/plugins/cache/claude-plugins-official/superpowers/`. Rewritten for
this environment; not a copy.
