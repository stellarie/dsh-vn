---
name: rust-guidelines
description: House Rust standard. Read before writing, reviewing, or refactoring any Rust code or Cargo.toml.
---

# Rust guidelines

Source: `~/notes/wiki/rust-guidelines/`. Seeded: 2026-09-19.
Pages are files in this skill. Read one with `skill_read` and `file`, for example `file: "Comments.md"`.
A `[[Page]]` link inside a page means the file `Page.md`.

## Which page for which task

| Task | Page |
|---|---|
| Reviewing a Rust diff | `Review-Checklist.md`, in order |
| Writing or editing any Rust | `Comments.md`, then the page for what you touch |
| Declarations, imports, generics, types | `Items-and-Types.md` |
| Function bodies, `match`, chains, `let` | `Expressions-and-Statements.md` |
| Indentation, width, sorting, attributes | `Formatting.md` |
| Naming, or editing `Cargo.toml` | `Naming-and-Cargo.md` |
| `unsafe`, FFI, or arithmetic | `Safety-Critical-Rules.md` and `Safety-Critical-Overview.md` |
| A disagreement about a rustfmt override | `Principles.md` |
| The map of all pages | `Home.md` |

## Rules most often missed

1. **Comments: the default is none.** Write one only when renaming, extracting, or restructuring cannot make the code clear.
   Keep the text **30 characters or fewer**. Rustdoc is included. Only `// SAFETY:` blocks are exempt.
   The reason for a change goes in the commit message.
2. **Every `unsafe` block has a `// SAFETY:` comment.** Name the invariants it relies on and why they hold.
3. **Never format by hand.** `cargo fmt` decides formatting.
4. **Arithmetic is not obviously correct.** Overflow panics in debug and wraps in release. `as` truncates silently.
   Prefer `checked_*`, `saturating_*`, and `TryFrom`.
5. **Follow the crate's existing style** when it differs from these pages. Mention the difference in your report.

## Tool gate

Run this before you report a Rust change as done:

```bash
cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

Use the project's own test command when the brief names one. Report the command and its result.
If the gate fails, the change is not done.
