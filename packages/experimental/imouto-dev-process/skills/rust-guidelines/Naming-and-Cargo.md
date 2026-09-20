---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust, cargo]
related: ["[[Items-and-Types]]", "[[Formatting]]"]
---
# Naming and Cargo

> [!abstract] TL;DR
> The non-formatting half of the style guide: **naming conventions** (which rustfmt cannot enforce — clippy partly can), a nudge toward **expression-oriented style**, and the `Cargo.toml` conventions (section order, key order, `description` last, wrap at 80).

## Expression-oriented style

Prefer Rust's expression orientation where possible.

```rust
// Preferred
let x = if y { 1 } else { 0 };

// Not preferred
let x;
if y {
    x = 1;
} else {
    x = 0;
}
```

## Naming conventions

| Kind | Case |
|---|---|
| Types | `UpperCamelCase` |
| Enum variants | `UpperCamelCase` |
| Struct fields | `snake_case` |
| Functions and methods | `snake_case` |
| Local variables | `snake_case` |
| Macro names | `snake_case` |
| Constants — `const` and immutable `static` | `SCREAMING_SNAKE_CASE` |

### Reserved words

When the name you want is a reserved word (e.g. `crate`):

- ✅ Use a raw identifier — `r#crate`
- ✅ Or a trailing underscore — `crate_`
- ❌ **Do not misspell it** — no `krate`

## Modules

**Avoid `#[path]` annotations where possible.** The file layout should be derivable from the module tree.

---

## `Cargo.toml` conventions

### Section and key ordering

- **`[package]` goes at the top of the file.**
- Blank line **after** the last key-value pair of a section; **no** blank line between a section header and its keys.

**`[package]` key order:**
1. `name`, then `version` — in that order.
2. All remaining keys **except `description`**, in alphabetical order.
3. `description` **last**.

**All other sections:** version-sort the key names (see [[Formatting#Sorting — "version sorting"]]).

### Formatting

- Line width and indentation follow the Rust code conventions ([[Formatting]]).
- Single space before and after `=`.
- Key names start at the beginning of the line — no indentation.
- Use **bare keys** for standard names; quote only non-standard keys that require it.

### Arrays

```toml
some_feature = ["feature1", "feature2"]

some_feature = [
    "another_feature",
    "yet_another_feature",
    "some_dependency?/some_feature",
]
```

### Tables (dependencies)

Inline if it fits; promote to its own section if it doesn't.

```toml
crate1 = { path = "crate1", version = "1.2.3" }

[dependencies.extremely_long_crate_name]
path = "path_here"
version = "1.0.0"
```

### Metadata

| Key | Convention |
|---|---|
| `authors` | `Full Name <email@address>` — the email is required |
| `license` | A valid **SPDX expression**, e.g. `MIT/Apache-2.0` |
| `homepage` | Complete URL **with scheme**, e.g. `https://example.org/` |
| `description` | Wrap at **80 columns**; **do not start with the crate name**; first sentence summarises, later sentences add detail; use multi-line strings for multi-line values |

## Gotchas

- **rustfmt does not check names.** Naming is a review item; `clippy` catches some of it via the `clippy::style` group, not all.
- **rustfmt does not format `Cargo.toml`.** Every rule on this page is manual (or `taplo`'s job).
- **`description` last is easy to get wrong** — most people write it second, right after `name`/`version`.
- **A long feature array is very common in Win32/FFI crates** and quickly overruns 100 columns — take the multi-line form early rather than fighting it.
- **Version-sorting dependency keys** is not the same as your editor's alphabetical sort once numbers are involved.

## Related
- [[Items-and-Types]] — what these names are attached to
- [[Formatting]] — width, indentation, version sorting
- [[Home]]

---
*Last verified: 2026-07-27 · source: <https://doc.rust-lang.org/style-guide/advice.html> and `/cargo.html`*
