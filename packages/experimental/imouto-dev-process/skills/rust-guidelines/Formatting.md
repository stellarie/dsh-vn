---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust]
related: ["[[Principles]]", "[[Comments]]", "[[Items-and-Types]]"]
---
# Formatting

> [!abstract] TL;DR
> The mechanical layer: **4 spaces, 100 columns, block indent, trailing commas, no trailing whitespace, version sorting.** rustfmt does all of this for you — the value of knowing it is spotting the places rustfmt *doesn't* reach (comment width, `derive` count, attribute placement) and knowing why a diff looks the way it does.

## Whitespace and width

| Rule | Value |
|---|---|
| Indent character | **Spaces, never tabs** |
| Indent unit | **4 spaces** — all indentation outside string literals and comments must be a multiple of 4 |
| Max line width | **100 characters** |
| Comment-only lines | **80 characters** — see [[Comments]] |
| Trailing whitespace | **None.** Applies to blank lines, comment lines, code lines, *and string literals* |
| Blank lines | Separate items and statements by **zero or one** blank lines (i.e. one or two newlines) |

Two blank lines in a row is a formatting error, not a stylistic preference.

## Block indent, not visual indent

```rust
// Preferred — block indent
a_function_call(
    foo,
    bar,
);

// Discouraged — visual indent
a_function_call(foo,
                bar);
```

> Rationale (verbatim): "This makes for smaller diffs (e.g., if `a_function_call` is renamed in the above example) and less rightward drift."

## Trailing commas

> "In comma-separated lists of any kind, use a trailing comma when followed by a newline."

```rust
function_call(
    argument,
    another_argument,
);

let array = [
    element,
    another_element,
    yet_another_element,
];
```

Rationale: moving code by copy-paste is easier, and diffs are smaller — appending or removing an item does not force an edit to a neighbouring line.

**Exceptions** (single-line forms take *no* trailing comma): single-line tuple structs, small struct literals, small enum struct-variants, single-line generic parameter lists, tuples (except one-tuples). See [[Items-and-Types]].

## Sorting — "version sorting"

The default sort throughout the guide is **version sorting**, not plain lexicographic. The algorithm:

1. Compare strings as sequences of **maximal-length chunks** — each chunk is either all non-digits or all digits.
2. **Numeric chunks** compare by *numeric value*, ignoring leading zeroes.
3. **Non-numeric chunks** compare lexicographically by Unicode code point, with two exceptions:
   - `_` sorts **immediately after space** but before any other character.
   - Unless otherwise specified, **non-lowercase characters sort before lowercase** (so `UpperCamelCase` precedes `snake_case`).

The guide's own worked example, in order:

```
_ZYXW, _abcd, A2, ABCD, Z_YXW, ZY_XW, ZYXW, ZYXW_, a1, abcd, u8, u16, u32,
u64, u128, u256, ua, usize, uz, v0, v1, v9, v10, x64, x86, x86_32, x86_64, zyxw
```

> [!tip] Why you care
> This is why `u8, u16, u32, u128` sorts correctly instead of `u128, u16, u32, u8`, and why `v9` precedes `v10`. If a hand-maintained list looks "wrongly sorted", check it against version sorting before fixing it.

## Attributes

- **One attribute per line**, indented to the level of the item.
- Inner attributes (`#!`) indent to the level of the *inside* of the item.
- **Prefer outer attributes** where possible.
- Attributes with argument lists format **like function calls**.
- Attributes with `=` get a single space either side: `#[foo = 42]`.
- **There must only be a single `derive` attribute.** Merge them; don't stack `#[derive(Clone)]` + `#[derive(Debug)]`.
- Doc comments go **before** attributes.

```rust
#[repr(C)]
#[foo(foo, bar)]
#[long_multi_line_attribute(
    split,
    across,
    lines,
)]
struct CRepr {
    #![repr(C)]
    x: f32,
    y: f32,
}
```

## "Small items"

The guide deliberately **does not define "small"**:

> "We leave it to individual tools to decide on exactly what _small_ means. In particular, tools are free to use different definitions in different circumstances."

Suggested heuristics: size in characters, or *complexity* — e.g. all components must be simple names rather than more complex sub-expressions.

```rust
// Normal formatting
Foo {
    f1: an_expression,
    f2: another_expression(),
}

// "small" formatting
Foo { f1, f2 }
```

This is why rustfmt's behaviour here can look inconsistent between two similar-length expressions: one has a call in it, the other doesn't.

## Gotchas

- **`derive` merging is a real rule, and rustfmt will not do it for you.** Multiple `derive` attributes are non-conforming and need a human.
- **Comment width (80) ≠ code width (100).** rustfmt does not reflow comments by default, so this one is entirely on the author. See [[Comments]].
- **"No trailing whitespace ... includes string literals."** A trailing space inside a `"..."` is a style violation even though it is semantically meaningful — which means if you *need* it, make it explicit (`\x20`, or a concatenation) rather than invisible.
- Version sorting means an alphabetical `sort` in your editor will produce a *different*, non-conforming order for anything with numbers in it.

## Related
- [[Principles]] — why these rules exist
- [[Comments]] — the one place we diverge
- [[Items-and-Types]] · [[Expressions-and-Statements]] — where these primitives get applied
- [[Home]]

---
*Last verified: 2026-07-27 · source: <https://doc.rust-lang.org/style-guide/> (Formatting conventions section)*
