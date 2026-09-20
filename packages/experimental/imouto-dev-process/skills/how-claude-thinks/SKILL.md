---
name: how-claude-thinks
description: Reasoning discipline for hard problems. Read when a task is unclear, a bug resists fixes, evidence conflicts, or you are about to report something done.
---

# How to think through a task

Source: `~/notes/wiki/how-claude-thinks/`. Seeded: 2026-09-19.
Pages are files in this skill. Read one with `skill_read` and `file`, for example `file: "Debugging-and-Diagnosis.md"`.
A `[[Page]]` link inside a page means the file `Page.md`.

## Intake

- Classify the ask first: question, task, decision, exploration, or diagnosis. Each needs a different deliverable.
- Do not fix when asked to assess. Do not assess when asked to fix.
- State the acceptance test. If you cannot state one, the task is not framed yet: ask your parent.
- List your assumptions. Check the ones the result depends on.

## Scope

- Make the smallest change that fully solves the task and leaves the system consistent.
- Everything your change makes false is in scope: docs, comments, names.
- Existing mess is out of scope. Report it; do not fix it.
- If the change needs "and while I was there", stop and report instead.

## Evidence

- Rank sources: a command you ran > the code itself > local docs > official docs > memory.
- Your memory of an API is a guess. The source file is a fact.
- "My search found nothing" is evidence about the search. Try another search method before concluding.
- One strong contrary observation outweighs many agreeing ones.

## Debugging

- Do not fix before you understand. An unexplained fix destroys evidence.
- Read the whole error. Start with the first error, not the loudest one.
- Reproduce first. Then make the reproduction smaller.
- Change one variable per experiment.
- Ask "what changed?" The most recent change is the usual cause.
- After three failed fixes on one theory, the theory is wrong. Go back to the raw evidence.
- Check that the code you edit is the code that runs.

## Conclusions

- A conclusion needs a claim, the evidence for it, and a stated confidence.
- Before you accept an explanation, name two other explanations for the same evidence.
- Design a check that would fail if you are wrong, and run it.
- Report observation and interpretation separately.

## Done

- Evidence comes before claims. "It should work" is not a result.
- Verify the user's claim, not a proxy. Green tests on code that never ran prove nothing.
- Re-read the original task, clause by clause. The last clause is the one most often missed.
- Report failed checks as failed, skipped checks as skipped, and unverified work as unverified.
- Re-verify after the last small change.

## Pages

| Situation | Page |
|---|---|
| Framing an unclear request | `Problem-Intake.md` |
| Deciding what to change and what to leave | `Scoping.md` |
| Work that grows or shrinks | `Scaling-Up-and-Down.md` |
| Finding and ranking information | `Information-and-Evidence.md` |
| Splitting work into pieces | `Decomposition-and-Planning.md` |
| Reaching a conclusion | `Drawing-Conclusions.md` |
| Acting under uncertainty | `Handling-Uncertainty.md` |
| A bug or unexpected behavior | `Debugging-and-Diagnosis.md` |
| Deciding if work is done | `Verification-and-Doneness.md` |
| A session going wrong | `Failure-Modes.md` |
| The model's own limits | `The-Substrate.md` |
| Non-code problems | `Non-Dev-Problems.md` |
| Every heuristic on one page | `Heuristics-Index.md` |
| The map | `Home.md` |
