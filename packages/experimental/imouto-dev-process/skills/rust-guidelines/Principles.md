---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust]
related: ["[[Formatting]]", "[[Comments]]"]
---
# Principles

> [!abstract] TL;DR
> The Rust Style Guide's rules are not arbitrary — they fall out of four priorities, **in this order**: readability, aesthetics, specifics (diffs/drift/vertical space), application. When two rules seem to conflict, the higher priority wins. This page is the "why" behind every other style page; it is also the argument to reach for when someone wants to configure rustfmt away from the default.

## What the guide is

The Rust Style Guide **defines the default Rust style** and *recommends* that developers and tools follow it. Its stated payoffs:

- **Productivity** — automatic formatting saves time and mental effort.
- **Community consistency** — one style removes style debates and communication overhead.
- **Comprehension** — pattern-matching the same shapes everywhere lowers the barrier for newcomers.

It is **prescriptive but not restrictive**:

> "This should not be interpreted as forbidding developers from following a non-default style, or forbidding tools from adding any particular configuration options."

**Relationship to rustfmt:** rustfmt uses this guide as the reference for its *default* settings. Where the guide and rustfmt diverge, that divergence is a likely bug in one of them and should be reported to the respective team.

## The four guiding priorities

Listed in the guide in priority order.

### 1. Readability
- Scan-ability.
- Avoiding misleading formatting.
- **Accessibility** — readable and editable by users on the widest variety of hardware, *including non-visual accessibility interfaces*.
- Readability **without** syntax highlighting or IDE assistance — rustc error messages, diffs, `grep`, plain-text contexts.

### 2. Aesthetics
- A sense of 'beauty'.
- Consistency with other languages and tools.

### 3. Specifics
- Compatibility with version-control practices — preserving diffs, merge-friendliness.
- **Preventing rightward drift.**
- Minimising vertical space.

### 4. Application
- Ease of manual application.
- Ease of implementation (rustfmt, other tools, editors, code generators).
- Internal consistency.
- Simplicity of the formatting rules.

## Where you can see the priorities doing work

| Rule | Derived from |
|---|---|
| Block indent over visual indent | 3 — smaller diffs when a function is renamed; less rightward drift |
| Trailing commas before a newline | 3 — appending/removing an item touches exactly one line |
| Break *before* binary operators and `.` | 1 — the operator leads the line, so scanning finds it |
| Comment lines capped at 80, not 100 | 1 — prose is harder to scan at full width |
| "Small items" left to the tool | 4 — a precise definition would be complex and brittle |
| Prefer `where` over breaking bounds | 1 + 3 — keeps the signature scannable, avoids drift |

## Gotchas

- **Priority order is load-bearing.** "It looks nicer" (2) never beats "it is harder to read in a diff" (1, 3). Reach for this when arguing about a rustfmt override.
- **"Not restrictive" is not a licence to freestyle.** It permits a *deliberate, project-wide* non-default style, not per-file improvisation. Our project-wide deviation is exactly one: [[Comments]].
- The guide targets **tools as much as humans**. Several rules ("tools must not merge imports by default") only make sense read as instructions to rustfmt.

## Related
- [[Formatting]] — the concrete rules these priorities produce
- [[Home]]

---
*Last verified: 2026-07-27 · source: <https://doc.rust-lang.org/style-guide/> and `/principles.html`*
