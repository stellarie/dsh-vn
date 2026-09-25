---
name: verification-before-completion
description: Run the check before claiming success. Read before saying done, fixed, passing, or complete, and before committing or handing work to oniichan.
---

# Verification Before Completion

## The iron law

No completion claim without fresh evidence from this session.

If you did not run the check during this turn, you cannot claim it passes. A
previous run is not evidence about the current tree.

## The gate

Before any claim of status, run this in order:

1. **Identify** the command that would prove the claim.
2. **Run** it, whole and fresh.
3. **Read** the full output, including the exit status.
4. **Compare** the output against the claim.
5. **Only then** state the claim, with the evidence attached.

Skipping a step turns a report into a guess.

## Claim to evidence

| Claim | Needs | Not enough |
|---|---|---|
| Tests pass | The test command, 0 failures | An earlier run, "should pass" |
| Lint is clean | The linter output, 0 errors | A partial check |
| The build passes | The build command, exit 0 | The linter passing |
| The bug is fixed | The original symptom exercised | The code changed |
| A regression test works | The fail-if-broken step | The test passing once |
| The file is correct | The file read back | The write reporting success |
| An agent finished | The diff, inspected | The agent's own report |
| Requirements are met | A line-by-line check against the ask | The tests passing |

The house completion gate — builds, affected tests, CI-equivalent checks, and
the non-mutating conflict check — lives in `imouto-standards`. This skill owns
the claim discipline around it.

## Red flags

Stop when you catch yourself:

- Using "should", "probably", or "seems to".
- Writing "Done!" or "Perfect!" before a check.
- About to commit, push, or report without running the check.
- Trusting another agent's success report.
- Calling a partial check complete.
- Thinking "just this once".

## Excuses, and the reality

| Excuse | Reality |
|---|---|
| "It should work now" | Then run it. |
| "I am confident" | Confidence is not evidence. |
| "The linter passed" | A linter is not a compiler. |
| "The tool said success" | Check the artifact it produced. |
| "I am tired" | Fatigue does not change the standard. |
| "The check takes too long" | A wrong claim costs more. |
| "Different words, so the rule does not apply" | It applies to paraphrases too. |

## Failures earned here

Three real failures from 2026-09-20. Each one passed the check that was run, and
failed the check that was not.

- A capture tool reported `ok: true` with a 160x28 image. The status was
  correct; the artifact was wrong. **Read the artifact, not just the status.**
- A subprocess error read as empty because stderr was captured as bytes and
  discarded. The failure was real; the message was lost. **Confirm the
  diagnostic carries the cause.**
- An answer key under-counted the planted defects, so three correct findings
  would have scored as errors. **Trust the artifact over the plan, and re-derive
  the key from the files.**

## Degrees of done

Name the degree, and never inflate it: prototype, working, robust, production.
A mislabeled prototype is the failure, not the prototype.

## Provenance

Adapted 2026-09-20 from the `verification-before-completion` skill in the
Superpowers plugin under
`~/.claude/plugins/cache/claude-plugins-official/superpowers/`. The "failures
earned here" section is our own. Rewritten for this environment; not a copy.
