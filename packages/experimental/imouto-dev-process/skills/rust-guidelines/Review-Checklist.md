---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust, review]
related: ["[[Comments]]", "[[Safety-Critical-Rules]]", "[[Formatting]]"]
---
# Review Checklist

> [!abstract] TL;DR
> The operational page. **Automate everything decidable, then spend human attention only on what tools cannot decide.** Run the tool gate first — if `cargo fmt --check` and `cargo clippy -- -D warnings` are red, there is nothing to review yet. Then work the human list: `unsafe` contracts, arithmetic, casts, error handling, comment discipline.

## 0. Order of operations

1. **Tool gate** — anything a tool can decide, a tool decides. Do not spend review comments on it.
2. **Unsafe and FFI** — the only part of a Rust codebase where a mistake is *unbounded*.
3. **Arithmetic and casts** — where correct-looking Rust silently differs between debug and release.
4. **Structure** — errors, naming, API shape.
5. **Comments** — last, because most comment problems are structure problems wearing a hat.

---

## 1. Tool gate

```bash
cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

- [ ] `cargo fmt --check` clean → every rule in [[Formatting]], [[Items-and-Types]], [[Expressions-and-Statements]] is already satisfied. Do not review formatting by eye.
- [ ] `cargo clippy -- -D warnings` clean.
- [ ] `cargo test` green.
- [ ] For `unsafe`-heavy code: `cargo +nightly miri test` where the test doesn't touch FFI Miri can't model.

### Lints worth opting into

These are **allow-by-default** — verified against the rustc lint listing — so they are off unless you enable them. On an edition-2021 crate doing FFI, all three are worth turning on:

```rust
// crate root
#![warn(missing_unsafe_on_extern)]     // extern blocks should be `unsafe extern`
#![warn(unsafe_attr_outside_unsafe)]   // #[unsafe(no_mangle)], #[unsafe(export_name)], …
#![warn(unsafe_op_in_unsafe_fn)]       // an `unsafe fn` body is not an implicit unsafe block
```

Together these implement [[Safety-Critical-Rules|gui_ZDLZzjeOwLSU]] — *required*, *decidable*, crate scope. `missing_unsafe_on_extern` is future-incompatible and becomes a hard error in Rust 2024, so enabling it early is also edition-migration work done cheaply.

Also worth considering:
- `#![warn(clippy::pedantic)]` selectively — it covers a lot of [[Naming-and-Cargo]] naming ground.
- `overflow-checks = true` in the release profile, if the workload tolerates it — see the arithmetic section.

> [!tip] Config files, not review comments
> Neither `rustfmt.toml` nor a clippy config is required for the defaults to apply. But if a project *deviates*, the deviation belongs in a config file where it applies to everyone, never in a review thread.

---

## 2. Unsafe and FFI — the human-only part

The safety-critical guidelines have **no Unsafety, FFI, Concurrency or Inline Assembly chapter** ([[Safety-Critical-Overview#The chapter map]]), so nothing below is quotable at anyone. It is still where the real defects are.

- [ ] **Every `unsafe` block has a `// SAFETY:` comment** naming the invariants relied on and why they hold *here*. Exempt from the 30-char budget — see [[Comments#The exemptions]].
- [ ] **The `unsafe` is minimal.** The block wraps the unsafe operation, not the surrounding 40 lines.
- [ ] **No `unsafe` hidden inside a macro expansion** — [[Safety-Critical-Rules|gui_FRLaMIMb4t3S]], *required*.
- [ ] **Every `extern` item names its ABI** — `extern "C" fn`, never bare `extern fn` ([[Items-and-Types#Macros, modules and extern items]]).
- [ ] **Raw pointer provenance**: is the pointer aligned, non-null, pointing at a live allocation of the right type, for the whole duration of the call? [[Safety-Critical-Rules|gui_iv9yCMHRgpE0]].
- [ ] **Handle/resource lifetime**: who owns it, who frees it, can it be freed twice, is `Drop` reachable on the panic path?
- [ ] **Union reads**: was the field written last, or are all bit patterns valid for the read type? [[Safety-Critical-Rules|gui_0cuTYG8RVYjg]] — the validity-invariant table there is the checklist.
- [ ] **Panics across an FFI boundary** — a panic unwinding into foreign code is UB. Catch it or make it `abort`.
- [ ] **Recursion**: unbounded recursion is a stack-overflow path — [[Safety-Critical-Rules|gui_ot2Zt3dd6of1]], *required*.

---

## 3. Arithmetic and casts

The single highest-yield section, because the code *looks* fine.

- [ ] **Overflow.** Integer overflow **panics in debug and wraps in release**. Every arithmetic op on untrusted or unbounded input should be `checked_*`, `saturating_*`, or explicitly `wrapping_*`. [[Safety-Critical-Rules|gui_dCquvqE1csI3]], *required*.
- [ ] **Division.** Divide-by-zero panics ([[Safety-Critical-Rules|gui_kMbiWbn8Z6g5]]), and `i64::MIN / -1` overflows. Both need guarding, not just the first.
- [ ] **Shifts.** Shifting by ≥ the operand's bitwidth, or by a negative amount, is out of range — [[Safety-Critical-Rules|gui_LvmzGKdsAgI5]] / `gui_RHvQj8BHlz9b`.
- [ ] **`as` casts are silent.** `as` truncates and wraps without complaint. Prefer `TryFrom`/`try_into()` and handle the error; reserve `as` for cases where the truncation is the point and say so. [[Safety-Critical-Rules|gui_ADHABsmK9FXz]].
- [ ] **No inferred cast targets.** `x as _` and an un-annotated `transmute` are non-compliant — name the full target type. [[Safety-Critical-Rules|gui_HDnAZ7EZ4z6G]], *required*.
- [ ] **Integer → pointer casts** get their own scrutiny. [[Safety-Critical-Rules|gui_PM8Vpf7lZ51U]].

---

## 4. Structure

- [ ] **Error handling**: does an error carry enough context to diagnose from a log alone? Is `unwrap`/`expect` justified, and does the `expect` message state the *invariant*, not the failure?
- [ ] **Strong types over primitives** — a `u32` that is really a DPI value, a character offset, and a pixel count in three different places is three bugs waiting. [[Safety-Critical-Rules|gui_xztNdXA2oFNC]], *advisory*.
- [ ] **Naming follows the conventions** — rustfmt does not check these. [[Naming-and-Cargo#Naming conventions]].
- [ ] **Single `derive` attribute** per item — rustfmt will not merge them. [[Formatting#Attributes]].
- [ ] **Macros**: is this a macro that should have been a function ([[Safety-Critical-Rules|gui_2jjWUoF1teOY]])? Are names inside it `$crate`-qualified or globally pathed (`gui_SJMrWDYZ0dN4`)?
- [ ] **`Cargo.toml`**: `[package]` at top, `description` last, keys version-sorted. [[Naming-and-Cargo#`Cargo.toml` conventions]].

---

## 5. Comments — last pass

Per [[Comments]]:

- [ ] **Every comment earns its place.** Could a rename, an extraction, or a restructure delete it instead?
- [ ] **Comment text is under 30 characters** — excluding `// ` and indentation.
- [ ] **Over-budget comments were *relocated*, not deleted.** Long rationale goes to a doc comment, `docs/`, or the commit message. Losing a hard-won *why* is the worse failure.
- [ ] **`// SAFETY:` on every `unsafe` block** — exempt, and required.
- [ ] **Public API has real doc comments** — exempt, and expected.
- [ ] **No commented-out code, no ownerless `// TODO`, no section banners.**
- [ ] Mechanical: `//` over `/* */`, single space after the sigil, comment-only lines ≤ 80 chars, doc comments *before* attributes.

---

## What this checklist deliberately does not do

- **It does not check formatting by hand.** That is `cargo fmt`'s job and a review comment about it is wasted.
- **It does not enforce the safety-critical guidelines as a standard.** We are not certifying to ISO 26262 / IEC 61508 / DO-178C. Rule IDs above are *citations for the reasoning*, not compliance claims — and several upstream rules are drafts or stubs ([[Safety-Critical-Overview#Maturity — read this before citing a rule]]).
- **It does not cover concurrency.** Neither upstream source has anything on it. Send/Sync soundness, lock ordering and thread-affinity (Win32 windows are thread-affine) need their own review discipline.

## Related
- [[Comments]] · [[Formatting]] · [[Items-and-Types]] · [[Expressions-and-Statements]] · [[Naming-and-Cargo]]
- [[Safety-Critical-Overview]] · [[Safety-Critical-Rules]]
- `wiki/how-claude-thinks/Verification-and-Doneness.md` — the general "is it actually done" ladder
- [[Home]]

---
*Last verified: 2026-07-27 · sources: the pages in this wiki, plus rustc lint listing (allow-by-default) at <https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html> and the Rust 2024 edition guide*
