---
name: kotlin-guidelines
description: House Kotlin standard. Read before writing, reviewing, or refactoring any Kotlin code or build.gradle.kts.
---

# Kotlin guidelines

Source: `~/notes/wiki/kotlin-guidelines/`. Seeded: 2026-09-19.
Read the canonical pages before you touch Kotlin. Do not work from memory.
Pages are files in this skill. Read one with `skill_read` and `file`, for example `file: "Comments.md"`.
A `[[Page]]` link inside a page means the file `Page.md`.

## Which page for which task

| Task | Page |
|---|---|
| Reviewing a Kotlin diff | `Review-Checklist.md`, in order |
| Writing or editing any Kotlin | `Comments.md`, then the page for what you touch |
| Formatting, indentation, width | `Style-and-Formatting.md` |
| Names, packages, classes, functions | `Naming.md` |
| Language features, null safety, idioms | `Idioms.md` |
| Layers, ViewModels, Compose, dependency injection | `Architecture.md` |
| The map of all pages | `Home.md` |

## Non-negotiables

1. **Self-documenting code first.**
   Before a comment, try: rename, extract, restructure, use types.
   Only when all four fail does the comment earn its place.
2. **Comments: the default is none.**
   Keep the text **about 80 characters**. **KDoc is included.**
   The *why* belongs in the commit message.
3. **Never format by hand.** ktlint and detekt decide formatting.
   Spend review attention on what tools cannot decide.
4. **The domain module has no Android imports.** The boundary is non-negotiable.
5. **No `!!` unless the invariant is provably held and a crash is the intent.**
   Prefer `requireNotNull()`, `?.let { }`, or `?:`.
6. **No `GlobalScope`.** Tie coroutines to a lifecycle.
7. **Immutability by default.** `val` over `var`.
   Use immutable collection interfaces in signatures.
8. **Follow the module's existing style** when it differs from these pages.
   Report the difference.

## Review order

Run the tool gate first. Then review in this order:

1. Null safety: no `!!` without justification, no `GlobalScope`.
2. Architecture: the domain module has zero Android imports, layers respected.
3. Immutability: `val` over `var`, immutable collections.
4. Structure: module layout, naming, idiomatic Kotlin.
5. Comments, last, and only when present.

## Tool gate

Run this before you report a Kotlin change as done:

```bash
./gradlew ktlintCheck detekt build test
```

Use the project's own command when the brief names one.
Keep this gate order: format check, static analysis, build, tests.
Report the command and its result. If the gate fails, the change is not done.

## Also

- Expression bodies for single-expression functions.
- Trailing commas in multi-line parameter lists and enum entries.
- Default parameters over overloads.
- Named arguments for boolean parameters.

## Source hierarchy

1. Executed ground truth: build output and test results.
2. The wiki pages above.
3. Official Kotlin documentation.
4. Your memory, treated as a hypothesis.

## Provenance

Merged 2026-09-20 from `~/.claude/skills/kotlin-guidelines`,
`~/.codex/skills/kotlin-guidelines`, and the driver skill `kotlin-guidelines`.
All three agree on the house rules. The review order comes from the Codex copy.
Rule 8 and the gate-order note come from the driver and Codex copies.
The Codex copy demands a justifying comment for `!!`; `Idioms.md` demands a
provable invariant instead. This copy follows `Idioms.md`.
