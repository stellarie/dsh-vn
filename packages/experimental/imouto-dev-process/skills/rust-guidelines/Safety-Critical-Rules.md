---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust, safety-critical]
related: ["[[Safety-Critical-Overview]]", "[[Review-Checklist]]"]
---
# Safety-Critical — Rule Catalogue

> [!abstract] TL;DR
> Every rule that exists in the Safety-Critical Rust Coding Guidelines at commit `05e7794` — **25 entries across 5 chapters** (Expressions 11, Macros 10, Types and Traits 2, Attributes 1, Associated Items 1). Two are format demos and two are confirmed stubs, leaving ~21 real rules. **21 of the 25 were read individually from source; 4 macro entries are titles from the chapter index only** and are marked "—". Read [[Safety-Critical-Overview#Maturity — read this before citing a rule]] first: the metadata below is copied faithfully, but the *upstream* metadata is unreliable.

> [!info] How to read this table
> **Cat.** = `category` · **Dec.** = `decidability` · **Scope** = how much code you must inspect.
> `<TODO>` and `todo` are the upstream values verbatim, not omissions on our part.
> ⚠️ = verified as a stub or template. — = **not individually verified**; title taken from the chapter index only.
> Every entry below is `status: draft`.

---

## Expressions (11)

| ID | Rule | Cat. | Dec. | Scope | Tags |
|---|---|---|---|---|---|
| `gui_dCquvqE1csI3` | **Ensure that integer operations do not result in arithmetic overflow** | required | decidable | system | security, performance, numerics |
| `gui_kMbiWbn8Z6g5` | **Do not divide by 0** | required | undecidable | system | numerics, defect |
| `gui_HDnAZ7EZ4z6G` | **Avoid `as _` pointer casts** — do not rely on inference for `var as Type` or `core::mem::transmute`; name the full target type | required | decidable | module | readability, reduce-human-error |
| `gui_LvmzGKdsAgI5` | **Avoid out-of-range shifts** | mandatory | undecidable | module | numerics, surprising-behavior, defect |
| `gui_RHvQj8BHlz9b` | **Do not shift by a negative number of bits, or by ≥ the bitwidth of the operand** | advisory | decidable | module | numerics, reduce-human-error, maintainability, surprising-behavior, subset |
| `gui_ADHABsmK9FXz` | **The `as` operator should not be used with numeric operands** — nor with `bool` or `char`; exception: raw pointer → `usize` | advisory | decidable | module | subset, reduce-human-error |
| `gui_7y0GAMmtMhch` | **Do not use an integer type as a divisor during integer division** (or remainder) when the left operand is also an integer | advisory | decidable | module | numerics, subset |
| `gui_PM8Vpf7lZ51U` | **An integer shall not be converted to a pointer** — `as` with a numeric left operand and a pointer right operand | `<TODO>` | decidable | module | subset, undefined-behavior |
| `gui_iv9yCMHRgpE0` | **An integer shall not be converted to an invalid pointer** — misaligned, not pointing at an entity of the referenced type, or an invalid representation | `<TODO>` | undecidable | system | defect, undefined-behavior |
| `gui_Bib7x9KmPq2nL` | ⚠️ *"Example guideline with bibliography"* — format demo, not a rule | — | — | — | — |
| `gui_Bob7x9KmPq2nL` | ⚠️ *"Example guideline with bibliography"* — format demo, not a rule | — | — | — | — |

> [!warning] `gui_LvmzGKdsAgI5` and `gui_RHvQj8BHlz9b` are the same rule at two strengths
> Mandatory/undecidable vs advisory/decidable, for what reads as identical intent. An upstream inconsistency, not a subtlety to reverse-engineer.

### Worked example — `gui_dCquvqE1csI3` (arithmetic overflow)

The rationale is the useful part: **overflow panics in debug but wraps in release**, so behaviour differs between profiles. The rule applies to `i8…i128`, `u8…u128`, `usize`, `isize`. Any wraparound must be *explicitly specified*.

```rust
// Non-compliant
fn add(si_a: i32, si_b: i32) {
    let _sum: i32 = si_a + si_b;
}

// Compliant — checked
fn add(si_a: i32, si_b: i32) -> Result<i32, ArithmeticError> {
    si_a.checked_add(si_b).ok_or(ArithmeticError::Overflow)
}
```

Other accepted forms: `wrapping_add` / `saturating_add`, the `std::num::Wrapping` and `std::num::Saturating` wrapper types, or manual range checking. Division additionally needs the `i64::MIN / -1` case guarded, not just the divide-by-zero case.

---

## Macros (10)

| ID | Rule | Cat. | Dec. | Scope | Tags |
|---|---|---|---|---|---|
| `gui_8hs33nyp0ipX` | **Shall ensure complete hygiene of macros** | mandatory | decidable | system | reduce-human-error |
| `gui_2jjWUoF1teOY` | **A macro should not be used in place of a function** — prefer functions unless the macro provides something functions cannot | mandatory | decidable | system | reduce-human-error |
| `gui_SJMrWDYZ0dN4` | **Names in a macro definition shall use a fully qualified path** — a global path, or one prefixed with `$crate` | required | decidable | module | reduce-human-error |
| `gui_FRLaMIMb4t3S` | **Do not hide unsafe blocks within macro expansions** | required | `todo` | `todo` | reduce-human-error |
| `gui_a1mHfjgKk4Xr` | ⚠️ **"Shall not invoke macros"** — *unfinished stub, placeholder body* | mandatory | decidable | system | reduce-human-error |
| `gui_h0uG1C9ZjryA` | ⚠️ **"Shall not use Declarative Macros"** — *unfinished stub, placeholder body* | mandatory | decidable | system | reduce-human-error |
| `gui_13XWp3mb0g2P` | "Attribute macros shall not be used" | — | — | — | — |
| `gui_66FSqzD55VRZ` | "Procedural macros should not be used" | — | — | — | — |
| `gui_WJlWqgIxmE8P` | "Shall not use Function-like Macros" | — | — | — | — |
| `gui_uuDOArzyO3Qw` | "Shall not write code that expands macros" | — | — | — | — |

> [!caution] The macro chapter is the least trustworthy
> Six of these amount to "do not use macros" in overlapping phrasings, two are confirmed placeholder templates, and one has `todo` metadata. **The three worth internalising are hygiene, `$crate`-qualified paths, and no-hidden-`unsafe`-in-macros** — those are real, specific, and correct. The blanket bans are aimed at certified-subset environments, not at us.

---

## Types and Traits (2)

| ID | Rule | Cat. | Dec. | Scope | Tags |
|---|---|---|---|---|---|
| `gui_0cuTYG8RVYjg` | **Ensure reads of union fields produce valid values for the field's type** | required | undecidable | system | defect, safety, undefined-behavior |
| `gui_xztNdXA2oFNC` | **Use strong types to differentiate between logically distinct values** — logically distinct types must be distinguishable by the type system | advisory | undecidable | module | types, safety, understandability |

### Worked example — `gui_0cuTYG8RVYjg` (union validity)

Unions do **not** track an active field. A typed read from a union field *asserts* that the underlying bytes are a valid value for that type; if they aren't, it's undefined behaviour.

Validity invariants worth memorising:

| Type | Valid values |
|---|---|
| `bool` | `0` or `1` only |
| `char` | Unicode scalar values — `0x0–0xD7FF`, `0xE000–0x10FFFF` |
| References | Non-null **and** properly aligned |
| Enums | Valid discriminants only |
| Integers, floats | **All** bit patterns valid |

```rust
// Non-compliant — 3 is not a valid bool
union IntOrBool { i: u8, b: bool }
let u = IntOrBool { i: 3 };
unsafe { u.b };  // UB

// Compliant — validate through a type with no invalid patterns
fn try_read_bool(u: &IntOrBool) -> Option<bool> {
    let raw = unsafe { u.i };   // all u8 patterns are valid
    match raw { 0 => Some(false), 1 => Some(true), _ => None }
}
```

Other compliant patterns given: an explicit active-field discriminant alongside the union; only reading the field that was written; reinterpreting only between types where all bit patterns are valid; and a `PhantomData` type-parameter approach that makes the active field a compile-time fact.

---

## Attributes (1)

| ID | Rule | Cat. | Dec. | Scope | Tags |
|---|---|---|---|---|---|
| `gui_ZDLZzjeOwLSU` | **Assure visibility of the `unsafe` keyword in unsafe code** — all code that may violate safety guarantees must be explicitly marked, *including* `extern` blocks and unsafe attributes such as `#[no_mangle]`, `#[export_name]`, `#[link_section]` | required | decidable | crate | readability, reduce-human-error |

> [!tip] This is the highest-value rule in the whole set for FFI work
> It is `decidable`, so it can be *enforced* rather than reviewed. Rust 2024 requires `unsafe extern "C" { … }`; on edition 2021 the same checks exist as **allow-by-default** lints you must opt into:
> - `missing_unsafe_on_extern` — "detects missing unsafe keyword on extern declarations". Future-incompatible; becomes a hard error in Rust 2024.
> - `unsafe_attr_outside_unsafe` — "detects a missing unsafe keyword on attributes considered unsafe", naming `no_mangle`, `export_name`, `link_section`. Fix is `#[unsafe(no_mangle)]`.
> - `unsafe_op_in_unsafe_fn` — "detects unsafe operations in unsafe functions without an explicit unsafe block".
>
> All three are **allow-by-default**, so on a 2021-edition crate they are silently off until you turn them on. See [[Review-Checklist]].

---

## Associated Items (1)

| ID | Rule | Cat. | Dec. | Scope | Tags |
|---|---|---|---|---|---|
| `gui_ot2Zt3dd6of1` | **Recursive functions are not allowed** — no function shall call itself directly or indirectly | required | undecidable | system | stack-overflow |

Rationale: unbounded stack growth → stack overflow → undefined behaviour. Note this is `undecidable` at `system` scope — genuinely checking it means the whole call graph including dependencies, so in practice it is a design constraint, not a review item.

---

## Empty chapters

No rules at `05e7794`: **Patterns · Values · Statements · Functions · Implementations · Generics · Entities and Resolution · Ownership and Destruction · Exceptions and Errors · Concurrency · Program Structure and Compilation · Unsafety · FFI · Inline Assembly.**

## Related
- [[Safety-Critical-Overview]] — what the fields mean and why the metadata is shaky
- [[Review-Checklist]] — the subset that's actually worth checking
- [[Home]]

---
*Last verified: 2026-07-27 · source: `Safety-Critical-Rust-Consortium/safety-critical-rust-coding-guidelines` @ `05e7794` — chapter indexes plus per-rule `src/coding-guidelines/**/gui_*.rst`. Rows marked "—" were read from the chapter index only.*
