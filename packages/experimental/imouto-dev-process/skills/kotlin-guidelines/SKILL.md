---
name: kotlin-guidelines
description: House Kotlin standard. Read before writing, reviewing, or refactoring any Kotlin code or build.gradle.kts.
---

# Kotlin guidelines

Source: `~/notes/wiki/kotlin-guidelines/`. Seeded: 2026-09-19.
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

## Rules most often missed

1. **Self-documenting code first.** Before a comment, try: rename, extract, restructure, use types.
2. **Comments: the default is none.** When one is needed, keep it **about 80 characters**. KDoc is included.
   The reason for a change goes in the commit message.
3. **Never format by hand.** ktlint and detekt decide formatting.
4. **The domain module has no Android imports.**
5. **No `!!` without a reason.** Use `requireNotNull()`, `?.let { }`, or `?:`.
6. **No `GlobalScope`.** Tie coroutines to a lifecycle.
7. **Immutable by default.** `val` over `var`. Immutable collection types in signatures.
8. **Follow the module's existing style** when it differs from these pages. Mention the difference in your report.

## Tool gate

Run this before you report a Kotlin change as done:

```bash
./gradlew ktlintCheck detekt build test
```

Use the project's own command when the brief names one. Report the command and its result.
If the gate fails, the change is not done.
