---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust]
related: ["[[Formatting]]", "[[Items-and-Types]]", "[[Naming-and-Cargo]]"]
---
# Expressions and Statements

> [!abstract] TL;DR
> How bodies are shaped. The rule with the most day-to-day bite: **break *before* the operator** — before `.` in method chains, before binary operators, before `+` in bounds — so the operator leads the line and scans cleanly. Everything else is rustfmt's problem until it isn't.

## Blocks

- Newline after `{` and before `}`, unless the block is single-line.
- Keywords (`unsafe`, `async`) go on the **same line** as `{`, separated by a single space.
- Single-line form is allowed when: the block is in expression position (or is an `unsafe` block in statement position), the expression is single-line, and there are **no statements and no comments**.
- Single-line form is `{ expr }` — spaces inside the braces. Empty blocks are `{}`.

## Closures

- **No space before the first `|`** — unless prefixed by `move`.
- Space between the second `|` and the body expression.
- **Omit the braces where possible.** Add them when: there is a return type, the body has statements, the body has comments, or the body is multi-line control flow.

## Struct literals

- **Small** → single line, no trailing comma.
- **Large** → multi-line, one field per line, trailing comma.
- `field: value` — space after the colon only.
- Functional record update: `..expr` — no trailing comma, no space after `..`.

## Function and macro calls

No space between the function name and `(`, none before a comma, one after.

```rust
func(a, b, c)          // single line — no spaces inside the parens

a_function_call(       // multi-line — one arg per block-indented line
    arg1,
    arg2,
)
```

## Method chains

- Single line if the chain is "small" and it fits.
- Otherwise: **break before the `.`**, one element per line, block-indented.
- **If any element is multi-line, every subsequent element goes on its own line.**

```rust
x.baz?
    .qux()
```

## `match`

- **No line break inside the discriminant.**
- Always break after `{` and before `}`.
- **No leading `|`** in patterns.
- Trailing comma on an arm **only if the arm does not use a block**.
- Keep the right-hand side on the same line as the pattern when it is a single expression with no comments and is not control flow.
- Use a block when: multiple statements, comments present, or it doesn't fit.

```rust
match foo {
    pattern => single_expr,
    long_pattern | another => {
        multi_line_expr()
    }
}
```

## Control flow — `if` / `while` / `for` / `loop`

- Keyword, clauses and the opening `{` on one line if they fit.
- `else` on the same line as the closing brace: `} else {`.
- Break after `=` in `let` expressions; break **before** `in` in a `for`.
- **If the control line itself breaks, the opening `{` moves to a new line, unindented.**
- Single-line `if else` is allowed in expression position if it is small.

## Binary operators

- Spaces around them: `x + 1`, `x = y`.
- **`as` is treated as a binary operator** and gets spaces.
- **Break *before* the operator** — except assignment operators, where you break *after*.
- "Use parentheses liberally" for clarity.

## Ranges

- **No spaces**: `0..10`, `x..=y`.
- Break before the range operator if a break is needed.
- Parenthesise compound operands: `..(x + 1)`.

## Combinable expressions

A call with a **single argument** whose argument is multi-line may be formatted as a single-line call, letting the argument's own layout do the work:

```rust
foo(bar(
    expr1,
    expr2,
))
```

Applies to macros, tuple-struct literals, and a closure in final-argument position.

---

## `let` statements

- Space after `:`, spaces both sides of `=`, no space before `;`.

```rust
let pattern: Type = expr;
```

**Line-breaking priority:**
1. Single line if possible.
2. Split after `=` (block-indent the expression) if the declaration then fits on two lines.
3. Split after `:` if the type needs multiple lines.
4. Multi-line patterns/types follow the combining rules.

**Multi-line expressions:** if the *first line* of the expression fits after the `=`, keep it there and do not further indent the rest. If it doesn't fit, put the whole expression on following lines, block-indented.

**Block expressions:** if the type or pattern is multi-line, the opening brace goes on a new line, unindented; otherwise the brace follows the `=`.

## `let ... else`

Single-line form **only if all** of these hold:
- the whole statement is short;
- the `else` block holds a single-line expression and **no statements**;
- there are **no comments** in the `else` block;
- the `let` components fit on one line.

```rust
let Some(1) = opt else { return };
```

Multi-line rules:
- **Never break between `else` and `{`**; always break before `}`.
- If the `let` components fit on one line but the whole statement doesn't: put `else {` on the same line and break after `{`.
- If `else {` doesn't fit on that line, break **before** `else`.
- With a multi-line initialiser, `else {` stays on the same line **only** if the initialiser ends with a closing bracket/brace/paren whose indentation matches the `let`.

## Macros in statement position

```rust
a_macro!(...);
```

- Use parentheses or square brackets.
- Terminate with a semicolon.
- No spaces around the name, the `!`, the delimiters, or the `;`.

## Expressions in statement position

- No space between the expression and its semicolon.
- Terminate with a semicolon **unless** the expression ends with a block, or is being used as the block's value.
- Use a semicolon for void-typed expressions even where it could be propagated.

```rust
{
    an_expression();
    expr_as_value()   // no semicolon — this is the block's value
}

return foo();
```

## Gotchas

- **Break-before-operator is the opposite of many other languages' conventions.** It is the single most common hand-formatting mistake, and it applies to `.`, binary operators, and `+` in bounds — but *not* to assignment operators.
- **"If any chain element is multi-line, all subsequent ones go on their own lines"** — one long argument mid-chain reformats the whole tail of the chain.
- **`match` arm trailing commas depend on whether you used a block.** Block → no comma. Expression → comma.
- **Single-line blocks forbid comments.** Adding a `//` to a `{ expr }` forces it multi-line — a good reason the [[Comments]] budget is tight.
- **`unsafe` blocks can be single-line in statement position**, which makes it easy to sneak `unsafe` past a skimming reviewer. Pair with the mandatory `// SAFETY:` comment — see [[Comments#The exemptions]].

## Related
- [[Formatting]] — width, indent, trailing commas
- [[Items-and-Types]] — the declarations these bodies live in
- [[Comments]] — why comments change block layout
- [[Home]]

---
*Last verified: 2026-07-27 · source: <https://doc.rust-lang.org/style-guide/expressions.html> and `/statements.html`*
