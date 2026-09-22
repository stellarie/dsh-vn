---
name: prove-a-regression-test-catches-its-bug
description: Use after writing a regression test, to prove the test fails on the old behavior.
---

1. Write the fix and the regression test. Run the test: it must pass.
2. Temporarily undo the fix only (keep the test). For a one-line guard, replace the guarded line with the old unconditional line.
3. Run the one test by name:
   `cargo test -p <crate> --lib <test_name>`
   Expect FAILED with the assertion message you wrote.
4. If the test still passes, the test does not cover the bug. Rewrite the test.
5. Restore the fix exactly, then run the named test again: it must pass.
6. Run the full gate from the brief (test and clippy), and confirm the pass counts.
7. Report both results: the failure on the old behavior and the pass on the fix.
