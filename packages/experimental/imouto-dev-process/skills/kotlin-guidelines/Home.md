---
created: 2026-08-19
updated: 2026-08-19
type: wiki-index
status: living
tags: [wiki, kotlin-guidelines, kotlin, android]
source: kotlinlang.org/docs/coding-conventions.html + ~/notes/wiki/rust-guidelines/ (adapted)
---
# Kotlin Guidelines — Wiki

> [!abstract] TL;DR
> The house standard for writing Kotlin here. Two upstream sources — the **Kotlin Coding Conventions** (official JetBrains standard) and our **Rust Guidelines** (adapted principles, comment discipline, review process) — plus one local house rule on [[Comments]]. Read [[Review-Checklist]] before a review; read the rest when a specific question comes up.

> [!info] Source of truth & staleness
> **Kotlin Coding Conventions** — <https://kotlinlang.org/docs/coding-conventions.html>, fetched **2026-08-19**. Stable.
> **Rust Guidelines (adapted)** — `~/notes/wiki/rust-guidelines/`, verified **2026-07-27**. Principles and comment discipline adapted; language-specific rules dropped.

> [!warning] Adaptation, not translation
> Kotlin is not Rust. `unsafe` blocks, lifetime annotations, `as` casts — those rules stay in Rust. What crosses over: the principles (readability > aesthetics > diffs > application), self-documenting code, comment discipline, and the review order of operations.

## Map

**Style and structure**
- [[Style-and-Formatting]] — indentation, width, whitespace, ordering, trailing commas
- [[Naming]] — packages, classes, functions, properties, acronyms
- [[Idioms]] — Kotlin-specific idioms, immutability, expression style, null safety
- [[Architecture]] — MVVM + Clean Architecture, Compose conventions, module rules

**House rule**
- [[Comments]] — **~80 chars, only when non-obvious.** Self-documenting code first.

**Operational**
- [[Review-Checklist]] — what to check in a Kotlin review, in order

## Pages in this wiki
- [[Home]] (this page)
- [[Style-and-Formatting]]
- [[Naming]]
- [[Comments]]
- [[Idioms]]
- [[Architecture]]
- [[Review-Checklist]]

## Related
- `~/notes/wiki/rust-guidelines/` — the Rust original these adapted from
- `~/notes/wiki/how-claude-thinks/` — reasoning discipline

---
*Last verified: 2026-08-19 · source: kotlinlang.org/docs/coding-conventions.html (fetched 2026-08-19); rust-guidelines wiki (2026-07-27)*
