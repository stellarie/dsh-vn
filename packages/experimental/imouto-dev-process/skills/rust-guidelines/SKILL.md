---
name: rust-guidelines
description: House Rust standard. Read before writing, reviewing, or refactoring any Rust code or Cargo.toml.
---

# Rust guidelines

Source: `~/notes/wiki/rust-guidelines/`. Seeded: 2026-09-19.
Read the canonical pages before you touch Rust. Do not work from memory.
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

## Non-negotiables

1. **Comments: the default is none.**
   Write one only when renaming, extracting, or restructuring cannot make the
   code clear. Keep the text **under 30 characters**.
   **Rustdoc is included.** `Comments.md` removed the rustdoc exemption on
   2026-07-29. Only `// SAFETY:` blocks are exempt.
   The *why* belongs in the commit message.
2. **Every `unsafe` block carries a `// SAFETY:` comment.**
   Name the invariants it relies on, and state why they hold there.
3. **Never format by hand.** `cargo fmt` decides formatting.
   Spend review attention on what tools cannot decide.
4. **Arithmetic is not obviously correct.**
   Overflow panics in debug and wraps in release. `as` truncates silently.
   Prefer `checked_*`, `saturating_*`, and `TryFrom`.
5. **Cite reasoning, not rule IDs.**
   The Safety-Critical guidelines are a v0.1 draft. Use their rationales.
   Never present them as a standard the crate conforms to.
6. **Follow the crate's existing style** when it differs from these pages.
   Report the difference.

## Review order

Run the tool gate first. Then review in this order:

1. `unsafe` blocks and FFI boundaries.
2. Arithmetic and casts: overflow, truncation, sign.
3. Structure: module layout, trait design, error types.
4. Comments, last, and only when present.

## Tool gate

Run this before you report a Rust change as done:

```bash
cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

Use the project's own command when the brief names one. Report the command and its result.
If the gate fails, the change is not done.

## Staleness

`Home.md` pins the Safety-Critical guidelines at commit `05e7794` (2026-07-20).
Re-verify a load-bearing rule against upstream before you quote it.
Then bump `verified_commit` and `updated` in the wiki.

## Source hierarchy

1. Executed ground truth: build output and test results.
2. The wiki pages above.
3. Official Rust documentation.
4. Your memory, treated as a hypothesis.

## Provenance

Merged 2026-09-20 from `~/.claude/skills/rust-guidelines`,
`~/.codex/skills/rust-guidelines`, and the driver skill `rust-guidelines`.
The Codex copy exempts rustdoc. That exemption is stale.
The review order comes from the Codex copy. Rule 6 comes from the driver skill.
