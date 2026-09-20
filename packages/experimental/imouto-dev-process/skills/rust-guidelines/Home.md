---
created: 2026-07-27
updated: 2026-07-27
type: wiki-index
status: living
tags: [wiki, rust-guidelines, rust]
source: doc.rust-lang.org/style-guide + Safety-Critical-Rust-Consortium/safety-critical-rust-coding-guidelines
branch: main
verified_commit: 05e7794
---
# Rust Guidelines — Wiki

> [!abstract] TL;DR
> The house standard for writing Rust here. Two upstream sources — the **Rust Style Guide** (how code is *shaped*; what rustfmt encodes) and the **Safety-Critical Rust Coding Guidelines** (what code is *forbidden* to do; MISRA-style rules from the Rust Foundation consortium) — plus one local house rule on [[Comments]]. Read [[Review-Checklist]] before a review; read the rest when a specific question comes up.

> [!info] Source of truth & staleness
> **Rust Style Guide** — <https://doc.rust-lang.org/style-guide/>, fetched **2026-07-27**. Stable and slow-moving; treat as current.
> **Safety-Critical Rust Coding Guidelines** — repo `Safety-Critical-Rust-Consortium/safety-critical-rust-coding-guidelines`, branch `main`, verified at commit **`05e7794`** (2026-07-20), rendered at <https://coding-guidelines.arewesafetycriticalyet.org/> as **version 0.1**.
> ⚠️ The safety-critical guidelines are **v0.1 draft**. Every rule sampled carries `status: draft`; two carry a literal `<TODO>` category; several are unfinished stubs. See [[Safety-Critical-Overview#Maturity — read this before citing a rule]]. If HEAD is ahead of `05e7794`, re-verify [[Safety-Critical-Rules]] before quoting it at anyone.

> [!warning] These are not equals
> The Style Guide is **normative for us** — rustfmt enforces it, deviation is a choice we'd have to justify.
> The safety-critical guidelines are **advisory input** — we are not certifying to ISO 26262 or DO-178C. Use them as a high-quality checklist for undefined behaviour, arithmetic, and `unsafe`; do not treat "not compliant" as "broken".

## 🗺️ Map

**The Rust Style Guide — how code is shaped**
- [[Principles]] — the four priorities the whole style guide is derived from
- [[Formatting]] — indentation, width, whitespace, sorting, attributes, "small items"
- [[Items-and-Types]] — items, imports, generics, `where` clauses, types and bounds
- [[Expressions-and-Statements]] — blocks, closures, `match`, chains, control flow, `let`
- [[Naming-and-Cargo]] — naming conventions, expression-oriented style, `Cargo.toml`

**House rule**
- [[Comments]] — **≤30 chars, only when non-obvious.** The one place we deliberately diverge from upstream.

**Safety-Critical Rust Coding Guidelines — what code must not do**
- [[Safety-Critical-Overview]] — what the project is, guideline anatomy, categories, decidability, maturity
- [[Safety-Critical-Rules]] — the complete current rule catalogue (25 entries; 21 verified against source individually, 4 from the chapter index only)

**Operational**
- [[Review-Checklist]] — what to actually check in a Rust review, in order

## 🧩 Pages in this wiki
```dataview
LIST
FROM "wiki/rust-guidelines"
WHERE file.name != this.file.name
SORT file.name ASC
```

## Related
- [[Home]] — vault home
- `wiki/how-claude-thinks/` — the reasoning discipline these checklists plug into
- `wiki/chibipop/` — the codebase these guidelines are currently aimed at (if/when it exists)

---
*Last verified: 2026-07-27 · sources: doc.rust-lang.org/style-guide (fetched 2026-07-27); safety-critical-rust-coding-guidelines @ `05e7794`*
