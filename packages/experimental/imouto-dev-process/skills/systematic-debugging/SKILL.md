---
name: systematic-debugging
description: Find the root cause before proposing any fix. Read on any bug, test failure, crash, or unexpected behavior, and especially after a fix that did not work.
---

# Systematic Debugging

## The iron law

No fix without a root-cause investigation.

A fix whose cause is unknown destroys the evidence. If you cannot explain why
the change works, you have a coincidence, not a repair.

## When to use it

Any technical failure: a test failure, a crash, wrong output, a build error, a
performance problem, a flaky result.

Use it most when the fix looks obvious, or when you already tried a fix. Use it
when time pressure pushes toward guessing, or when you do not fully understand
the failure.

## Phase 1 — Investigate

1. **Read the whole error.** Take the first error of a cascade, not the loudest.
   Note the file, the line, and the code.
2. **Reproduce it.** Are the steps exact? Does it fail every time? A
   reproducible failure is nearly understood. An unreproducible one is a
   data-collection problem: add observation instead of guessing.
3. **Ask what changed.** The recent change is the base-rate favorite. Check
   commits, dependencies, configuration, and environment.
4. **Instrument the boundaries.** In a multi-part system, record what enters and
   leaves each part. Run once. The break sits between the last good boundary and
   the first bad one.
5. **Trace the bad value backwards.** Where did it originate? What produced it?
   Keep going up until you reach the source.

Do not propose a fix until this phase ends with a stated cause.

## Phase 2 — Compare

1. Find working code that does something similar.
2. Read the reference implementation completely. Do not skim it.
3. List every difference between the working and the broken case. Test before
   dismissing a difference as irrelevant.
4. Name the assumptions the failing code makes about its inputs and its
   environment.

## Phase 3 — Hypothesize and test

1. State one hypothesis: "X causes this, because Y."
2. Change one variable. Make the smallest change that tests the hypothesis.
3. Observe the result. A failure means a new hypothesis, not a second fix
   stacked on an unverified first.
4. If you do not know, say so plainly, then gather more evidence.

## Phase 4 — Fix at the source

1. Write a test that fails on the current behavior. See
   `test-driven-development`.
2. Make one change that addresses the cause, not the symptom.
3. Verify: the new test passes, the old tests still pass, the reported symptom
   is gone.
4. Confirm the fix is executing. The commonest stall is editing one file while
   running another.

## Three failed fixes means the theory is wrong

Stop after three attempts when each one revealed a new problem elsewhere, or
required broad refactoring, or created a new symptom. That pattern is an
architectural signal, not a run of bad luck. Go up one level, name the
assumption that keeps failing, and raise it with oniichan.

## Red flags

Return to Phase 1 when you catch yourself:

- Proposing fixes before tracing the data.
- Saying "just try changing X and see".
- Changing several things at once.
- Saying "it is probably X, let me fix that".
- Attempting "one more fix" after two failures.
- Claiming "it should work now" without running a test.

## Excuses, and the reality

| Excuse | Reality |
|---|---|
| "Too simple to need this" | Simple failures have causes too. |
| "No time" | One structured pass beats guessing. |
| "I already know the fix" | Then state the cause first, and test it. |
| "I will investigate after the fix" | The fix destroys the evidence. |
| "The symptom is gone" | An unexplained success leaves the work open. |
| "The test passes now" | Confirm the test would fail without the fix. |

## Provenance

Adapted 2026-09-20 from the `systematic-debugging` skill in the Superpowers
plugin under `~/.claude/plugins/cache/claude-plugins-official/superpowers/`.
Rewritten for this environment; not a copy.
