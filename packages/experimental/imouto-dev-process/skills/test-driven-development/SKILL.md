---
name: test-driven-development
description: Write the failing test first, watch it fail, then write the smallest code that passes. Read before implementing any feature, bugfix, or behavior change, and after writing a regression test.
---

# Test-Driven Development

## The iron law

No production code without a failing test first.

If you wrote the code first, delete it and start from the test. Do not keep it
as a reference, and do not adapt it while writing the test. Adapting it is
testing after the fact.

**Why it matters:** a test you never watched fail proves nothing. It may test
the wrong thing, or the implementation instead of the behavior.

## The cycle

1. **Red** — write one small test for the behavior you want.
2. **Verify red** — run it. It must fail, and it must fail for the expected
   reason, not a typo. A test that passes immediately is testing existing
   behavior.
3. **Green** — write the smallest code that passes.
4. **Verify green** — run it. The new test passes, and the other tests still
   pass.
5. **Refactor** — clean up while green. Add no behavior.
6. Repeat for the next behavior.

## A good test

| Quality | Good | Bad |
|---|---|---|
| One thing | One behavior per test | "validates email and domain and whitespace" |
| Named for behavior | `rejects an empty email` | `test1` |
| Real code | Exercises the real path | Asserts on a mock's calls |
| Would fail without the change | You named the change that breaks it | You cannot say what would break it |

Before writing a test, name the production change that would make it fail. If
you cannot name one, the test measures nothing.

## Verify a regression test actually catches the bug

Use this procedure after you write a regression test, to prove the test fails
on the old behavior. A regression test is only proven when it fails on the old
behavior:

1. Write the fix and the regression test. Run the test: it must pass.
2. Temporarily undo the fix only. Keep the test. For a one-line guard, replace
   the guarded line with the old unconditional line.
3. Run the one test by name:
   `cargo test -p <crate> --lib <test_name>`
   Expect FAILED with the assertion message you wrote.
4. If the test still passes, the test does not cover the bug. Rewrite the test.
5. Restore the fix exactly, then run the named test again: it must pass.
6. Run the full gate from the brief (for Rust, test and clippy), and confirm
   the pass counts.
7. Report both results: the failure on the old behavior and the pass on the
   fix.

A test that passes in both states does not cover the bug.

## Common excuses, and the reality

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks too. The test is quick. |
| "I will test after" | Tests written after pass immediately, so they prove nothing. |
| "I already tested it by hand" | Manual testing leaves no record and no re-run. |
| "Deleting hours of work is wasteful" | That time is spent either way. Untrusted code is the real waste. |
| "The test is hard to write" | Hard to test usually means hard to use. Simplify the interface. |
| "I need to explore first" | Explore freely, then throw the exploration away and start with a test. |
| "This case is different" | Name the difference, or accept that it is an excuse. |

## Red flags

Stop and start over when:

- Code exists before its test.
- A test passes the first time you run it.
- You cannot explain why the test failed.
- You plan to add tests "later".
- You are adapting existing code to fit a new test.

## When stuck

| Problem | Move |
|---|---|
| You do not know how to test it | Write the assertion first, then the call you wish existed. |
| The test needs huge setup | The design is too coupled. Simplify the interface. |
| You must mock everything | Inject the dependency instead of mocking around it. |

## Environment notes

Run the project's own test command. Common ones here:

- Node: `npm test`, or `node --test`
- Python: `python test_<name>.py`
- Rust: `cargo test`
- Kotlin: `./gradlew test`

The fail-if-broken step needs the exact command in the report. See
`verification-before-completion` for the claim rules.

## Provenance

Adapted 2026-09-20 from the `test-driven-development` skill in the Superpowers
plugin under `~/.claude/plugins/cache/claude-plugins-official/superpowers/`.
Rewritten for this environment; not a copy.
