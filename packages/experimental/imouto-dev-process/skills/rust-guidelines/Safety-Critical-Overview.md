---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust, safety-critical]
related: ["[[Safety-Critical-Rules]]", "[[Review-Checklist]]", "[[Comments]]"]
---
# Safety-Critical — Overview

> [!abstract] TL;DR
> The **Safety-Critical Rust Coding Guidelines** are a MISRA-style rulebook for Rust from the Safety Critical Rust Consortium (under the Rust Foundation). Each rule carries a machine-readable header — `category`, `status`, `release`, `fls`, `decidability`, `scope`, `tags` — plus a rationale and paired non-compliant/compliant examples. **It is version 0.1 and visibly unfinished**: 5 of 19 chapters have any rules at all, everything is `status: draft`, and some entries are literal templates. Treat it as an excellent checklist, not a standard we conform to.

## What it is

| | |
|---|---|
| Owner | **Safety Critical Rust Consortium**, under the **Rust Foundation** |
| Repo | `Safety-Critical-Rust-Consortium/safety-critical-rust-coding-guidelines` |
| Rendered | <https://coding-guidelines.arewesafetycriticalyet.org/> — **version 0.1** |
| Built with | Sphinx + **Sphinx-Needs** (rules are machine-parseable into `needs.json`) |
| Licence | Code **MIT OR Apache-2.0**; documentation **CC-BY-4.0** |
| Compliance model | "We follow **MISRA Compliance 2020**" |
| Verified at | commit **`05e7794`** (2026-07-20), read 2026-07-27 |

The guidelines link each rule to a paragraph of the **Ferrocene Language Specification** via an `fls` field, which is how a rule is tied to defined language behaviour rather than folklore.

## Anatomy of a guideline

Every entry **must** carry these fields:

| Field | Allowed values | Meaning |
|---|---|---|
| `category` | `mandatory` · `required` · `advisory` · `disapplied` | Strength of the obligation (MISRA Compliance 2020 semantics) |
| `status` | `draft` · `approved` · `retired` | Where the rule is in its lifecycle |
| `release` | semicolon-separated compiler versions | Which Rust versions the rule applies to |
| `fls` | an FLS paragraph ID, e.g. `fls_oFIRXBPXu6Zv` | Anchor into the Ferrocene Language Specification |
| `decidability` | `decidable` · `undecidable` | Whether a tool can decide compliance statically |
| `scope` | `module` · `crate` · `system` | How much code must be inspected to judge compliance |
| `tags` | at least one | e.g. `numerics`, `undefined-behavior`, `reduce-human-error` |

Required child blocks, each with its own ID prefix:

- `rationale` → `rat_…`
- `non_compliant_example` → `non_compl_ex_…`
- `compliant_example` → `compl_ex_…`
- `bibliography` — optional, recommended when citing sources

Guideline IDs are prefixed `gui_` and are **machine-generated** by `generate_guideline_templates.py`.

> [!important] Normative vs non-normative
> Normative sections are the guideline text, its amplification, and its exceptions. Rationale and examples are **non-normative**. Where they conflict, "Guideline Content **MUST** take precedence."

Rust examples use the `.. rust-example::` directive with attributes (`compile_fail`, `should_panic`, `no_run`, `ignore`, `miri`). **Examples containing unsafe code MUST carry the `:miri:` option** — i.e. the project runs its own unsafe examples under Miri.

## Reading the fields in practice

**`decidability` tells you whether a tool can help.**
`decidable` → a lint, a clippy rule, or a compiler flag can enforce this; automate it.
`undecidable` → no tool can decide it in general; this one costs human review time. Spend it deliberately.

**`scope` tells you how far you have to look.**
`module` → the answer is in this file.
`crate` → you need the whole crate's call graph.
`system` → you need the whole program, including dependencies. A `system`-scope rule is *expensive* to verify honestly; be suspicious of anyone claiming they've checked one by eye.

**`category` is MISRA's obligation ladder**, and the guidelines defer to MISRA Compliance 2020 for the exact semantics rather than restating them. Working reading, in decreasing strength: `mandatory` (no deviations) → `required` (deviations permitted with a recorded justification) → `advisory` (recommended) → `disapplied` (deliberately not in force). **The project's own `compliance-meaning` page currently contains only the pointer to MISRA, not the definitions** — so do not quote precise MISRA semantics from this project.

## The chapter map

Nineteen chapters exist. Only **five contain any rules** at commit `05e7794`:

| Chapter | Rules |
|---|---|
| Expressions | **11** (2 of them bibliography templates) |
| Macros | **10** |
| Types and Traits | **2** |
| Attributes | **1** |
| Associated Items | **1** |
| Patterns · Values · Statements · Functions · Implementations · Generics · Entities and Resolution · Ownership and Destruction · Exceptions and Errors · Concurrency · Program Structure and Compilation · Unsafety · FFI · Inline Assembly | **0 — index stub only** |

There are also **appendices mapping to MISRA C:2025 and CERT C 2016**, a **deviation process** page, a **guideline lifecycle** page, and a `retired-guidelines/` tree mirroring every chapter.

> [!caution] The empty chapters are the ones you'd most want
> **Unsafety, FFI, Concurrency and Inline Assembly are all empty.** For a Windows-FFI codebase, that is precisely the area with no coverage — the rulebook will not help you there and you are on your own with the Rustonomicon, Miri, and review discipline.

## Maturity — read this before citing a rule

Verified directly against the source, not inferred:

- **Every rule sampled has `status: draft`.** None are `approved`.
- **Two rules carry a literal `<TODO>` as their category** — `gui_PM8Vpf7lZ51U` and `gui_iv9yCMHRgpE0`.
- **One rule has `decidability: todo` and `scope: todo`** — `gui_FRLaMIMb4t3S`.
- **Several macro entries are unfinished templates**, containing placeholder text like "Description of the guideline goes here" — confirmed for `gui_a1mHfjgKk4Xr` and `gui_h0uG1C9ZjryA`.
- **Two expressions entries are literally titled "Example guideline with bibliography"** (`gui_Bib7x9KmPq2nL`, `gui_Bob7x9KmPq2nL`) — they are format demos, not rules.
- **`overview/scope.rst`, `overview/how-to-read.rst` and `compliance/deviation-process.rst` are effectively empty** at this commit — headings with no body.
- **Rules overlap and disagree.** `gui_LvmzGKdsAgI5` ("Avoid out-of-range shifts", *mandatory* / *undecidable*) and `gui_RHvQj8BHlz9b` ("Do not shift an expression by a negative number of bits or by greater than or equal to the bitwidth", *advisory* / *decidable*) state the same rule at different strengths.

**What this means for us:** mine it for the *reasoning* — the rationales and the compliant/non-compliant example pairs are genuinely good — and ignore the metadata's authority. A rule's `category` here is not yet a reliable severity signal.

## How we use it

We are **not** certifying to ISO 26262, IEC 61508 or DO-178C. So:

1. Use the **rationales** as review prompts, especially around arithmetic, casts, and pointer provenance.
2. Use `decidable` rules to justify **turning on a lint**, not to justify a review comment.
3. Treat `undecidable` + `system` scope rules as *awareness*, not as gates.
4. **Never cite a `<TODO>`-category or stub rule at anyone.** Cite the reasoning instead.

## Related
- [[Safety-Critical-Rules]] — the actual catalogue
- [[Review-Checklist]] — how this feeds a review
- [[Comments]] — the `// SAFETY:` exemption, and `gui_ZDLZzjeOwLSU`
- [[Home]]

---
*Last verified: 2026-07-27 · source: `Safety-Critical-Rust-Consortium/safety-critical-rust-coding-guidelines` @ `05e7794`, `src/process/style-guideline.rst`, `src/compliance/`, `src/overview/`, and the rendered site v0.1*
