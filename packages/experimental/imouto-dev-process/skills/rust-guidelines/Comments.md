---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust, house-rule]
related: ["[[Formatting]]", "[[Review-Checklist]]", "[[Safety-Critical-Rules]]"]
---
# Comments

> [!abstract] TL;DR
> **House rule: the default is no comment.** Write one only when the code cannot be made obvious on its own — and when you do, keep the comment text **under 30 characters**. **This includes rustdoc** (`///`, `//!`) — it is not an escape hatch. One exemption: `// SAFETY:` blocks, which are contracts rather than explanations. The upstream Rust Style Guide's mechanical comment rules (sigils, spacing, 80-column cap) still apply on top.

> [!warning] Corrected 2026-07-29
> This page originally exempted rustdoc. Stella overruled that explicitly —
> *"do not move to rustdoc nor docs/ — change it entirely"* — after seeing the
> exemption used to keep long explanations alive under a `///`. The rule is
> **all comment forms**. A reviewer working from the earlier wording passed a
> file with 25 over-length doc comments, which is what prompted this fix.

> [!warning] This page deliberately diverges from upstream
> The Rust Style Guide says comments "should usually be complete sentences. Start with a capital letter, end with a period." Our ≤30-character budget is in tension with that. **Where they conflict, the house rule wins** — but keep the capital letter and the period when they fit, because they cost ~2 characters.

---

## The house rule

### 1. Only comment what is not obvious

Before writing a comment, try to delete the need for it:

1. **Rename** something. A comment explaining a variable is a variable with the wrong name.
2. **Extract** a function. A comment introducing a block is a function without a name.
3. **Restructure.** A comment warning about ordering is usually a missing type or a missing assertion.

Only when all three fail does the comment earn its place.

### 2. Keep it under 30 characters

The comment **text** (excluding the `// ` sigil and indentation) should be **< 30 characters**.

The budget is the point. If the explanation does not fit in 30 characters, that is a signal — either the code is too clever, or the explanation belongs somewhere with more room (a doc comment, `docs/`, a commit message, the wiki). It is not a licence to write a paragraph inline.

```rust
// Good — earns its 30 chars
let n = raw.len().saturating_sub(1); // Trailing NUL, not content.

buf.set_len(n);                      // Init'd by ReadFile above.

let dpi = unsafe { GetDpiForWindow(hwnd) }; // 0 if hwnd is dead.
```

```rust
// Bad — restates the code
let n = raw.len() - 1; // Subtract one from the length.

// Bad — a paragraph pretending to be a comment
// We use windows-numerics here rather than relying on the transitive
// dependency because render.rs needs to import Vector2 by name, and
// naming it directly does not change what gets built, only what we
// are allowed to import.
```

The second bad case is *good information in the wrong place*. Move it to `docs/`, the `Cargo.toml` entry's own docs, or the commit that introduced it.

### 3. What actually earns a comment

| Earns it | Why |
|---|---|
| A non-obvious **why** | The *what* is in the code; the *why* is not |
| A trap or footgun | `// Panics if empty.` |
| An external constraint | `// Win32 wants UTF-16LE.` |
| A deliberate deviation | `// Slower; avoids UB.` |
| A magic value's origin | `// From WM_DPICHANGED docs.` |

| Does not earn it | Instead |
|---|---|
| Restating the code | Delete |
| Section banners (`// ---- setup ----`) | Extract a function |
| Commented-out code | Delete; git remembers |
| Ownerless `// TODO` | File an issue, or delete |
| Changelog in a comment | The commit message |

## The exemptions

These are **not** subject to the 30-character budget. They are interface and contract, not commentary.

### ~~Doc comments — `///` and `//!`~~ — NOT exempt

**Rustdoc obeys the 30-character rule like everything else.** It was exempt in
the first version of this page; that exemption was removed on 2026-07-29 (see
the warning at the top).

One line, naming what the thing is. The *why* — a measured result, a rejected
alternative, a Win32 trap — goes in the commit message, which is neither
rustdoc nor `docs/`.

Upstream mechanics still apply where a doc comment exists: prefer `///` over
`/** */`, use `//!` only for module- or crate-level docs, and put doc comments
**before** attributes.

### `// SAFETY:` blocks
Every `unsafe` block gets a `// SAFETY:` comment stating **which invariants the caller is relying on and why they hold here**. This cannot be done in 30 characters and should not be attempted.

This exemption is not optional politeness — it is the only way an `unsafe` block is reviewable, and it lines up with the safety-critical guideline [[Safety-Critical-Rules|gui_ZDLZzjeOwLSU]] ("Assure visibility of `unsafe` keyword in unsafe code", *required*).

```rust
// SAFETY: `hwnd` is non-null and owned by this thread for the
// lifetime of the call — created in `create_window` and destroyed
// only in `Drop`, which cannot run while `&self` is borrowed.
unsafe { DestroyWindow(hwnd) }?;
```

---

## Upstream mechanical rules (still apply)

From the Rust Style Guide — these govern *how* a comment is written, once you've decided it earns its place.

- **Prefer line comments `//` to block comments `/* ... */`.**
- **Single space after the opening sigil**: `// Like this.`
- Block comments, if used: single-line form gets a space after the opening and before the closing sigil; multi-line form gets a newline after the opening sigil and before the closing sigil.
- **Prefer a comment on its own line.** Where a comment follows code, put a **single space** before it.
- Comments "should usually be complete sentences. Start with a capital letter, end with a period (`.`)." *(→ superseded by the house rule where they conflict.)*
- **Comment line length**: source lines that are *entirely* a comment are limited to **80 characters** (including sigils, excluding indentation) **or** the max line width (including sigils *and* indentation) — **whichever is smaller**.
- Doc comments: prefer `///` over `/** ... */`; prefer outer doc comments, using `//!` only for module/crate-level docs; **put doc comments before attributes**.

## Gotchas

- **rustfmt will not enforce any of this.** It does not reflow comments or count their characters by default. Comment discipline is a review responsibility — see [[Review-Checklist]].
- **30 characters is a budget, not a hard error.** 32 characters that says something true beats 28 that says nothing. If you're consistently over, the code is the problem.
- **Trailing comments still count toward the 100-column code limit.** A 30-char comment on a 90-column line does not fit; move it above the line.
- **Do not delete a long comment just to satisfy the rule.** Relocate the information first. Losing a hard-won *why* is far more expensive than an over-budget comment.

## Related
- [[Formatting]] — the 80/100 column rules this sits inside
- [[Review-Checklist]] — where comment discipline gets checked
- [[Safety-Critical-Overview]] — why `unsafe` gets special treatment
- [[Home]]

---
*Last verified: 2026-07-27 · sources: <https://doc.rust-lang.org/style-guide/> (Comments section) + local house rule (Stella, 2026-07-27)*
