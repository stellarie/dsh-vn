---
created: 2026-07-27
updated: 2026-07-27
type: wiki
status: living
tags: [wiki, rust-guidelines, rust]
related: ["[[Formatting]]", "[[Expressions-and-Statements]]", "[[Naming-and-Cargo]]"]
---
# Items and Types

> [!abstract] TL;DR
> How declarations are shaped: item ordering, `use` statements, structs/enums/traits/impls, generics and `where` clauses, and type/bound spacing. Most of this is rustfmt's job. The parts worth memorising are the ones rustfmt won't decide for you: **item order**, **prefer `where` over broken bounds**, **always name the `extern` ABI**, and **prefer unit structs over empty ones**.

## Item ordering

1. **`extern crate` statements** — first, ordered alphabetically.
2. **`use` statements and module declarations** — imports **before** module declarations, version-sorted within each group; `self` and `super` come before other names.
3. **Everything else** — functions, structs, traits, …

## Imports (`use`)

Single line where possible, **no spaces inside the braces**:

```rust
use a::b::c;
use a::b::d::*;
use a::b::{foo, bar, baz};
```

**Ordering within a group**
- Version-sorted (see [[Formatting#Sorting — "version sorting"]]).
- `self` and `super` always **first**.
- Groups (`{...}`) and globs (`*`) always **last**.
- Groups are separated by blank lines or other items.

**Multi-line imports** — break after `{`, before `}`, trailing comma, block indent:

```rust
foo::{
    long, list, of, imports, more,
    imports,
};
```

**Nested imports** use the multi-line form **even if they would fit on one line**. Each nested import gets its own line; non-nested names are packed onto as few lines as possible:

```rust
use a::b::{
    x, y, z,
    u::{...},
    w::{...},
};
```

**Normalisations tools must apply**

| Before | After |
|---|---|
| `use a::self;` | `use a;` |
| `use a::{};` | *(removed)* |
| `use a::{b};` | `use a::b;` |

**Tools must not merge or un-merge imports by default** — that may be offered as an option, but it is not the default style.

## Functions

```rust
[pub] [unsafe] [extern ["ABI"]] fn foo(arg1: i32, arg2: i32) -> i32 {
    ...
}
```

Multi-line signature — break after the opening paren, one argument per block-indented line, trailing comma:

```rust
fn foo(
    arg1: i32,
    arg2: i32,
) -> i32 {
    ...
}
```

- **Avoid comments inside signatures.**
- Keep `fn <name>` greppable — the name stays adjacent to the `fn` keyword.

## Structs and unions

```rust
struct Foo {
    a: A,
    b: B,
}
```

- Opening brace on the same line as `struct`; fields indented once with a trailing comma; closing brace unindented on its own line.
- If a field type overruns the right margin, pull it to a new line with extra indentation.
- **Prefer unit structs** — `struct Foo;` over `struct Foo();` or `struct Foo {}`.

**Tuple structs** — one line if possible, comma-space separated, **no trailing comma**:

```rust
pub struct Foo(String, u8);
```

Multi-line tuple structs use the block form *with* a trailing comma.

## Enums

One variant per line, block-indented. Variants format as structs (minus the keyword), tuple structs, or bare identifiers.

**Small struct variants** — one line, **no** trailing comma, spaces inside the braces:

```rust
enum FooBar {
    Error { err: Box<Error>, line: u32 },
}
```

**If any variant is large, all struct variants go multi-line** — consistency within the enum wins:

```rust
enum FooBar {
    First(u32),
    Second,
    Error {
        err: Box<Error>,
        line: u32,
    },
}
```

## Traits and impls

```rust
trait Foo {}                 // empty → one line
impl Foo {}                  // empty → one line

pub trait Bar {
    ...
}
```

**Bounds**: space *after* the colon, not before; spaces around each `+`.

```rust
trait Foo: Debug + Bar {}
```

**Prefer not to line-break bounds — use a `where` clause instead.** If a break is unavoidable, each bound goes on its own block-indented line, breaking **before** `+`, with the opening brace on its own line:

```rust
pub trait IndexRanges:
    Index<Range<usize>, Output=Self>
    + Index<RangeTo<usize>, Output=Self>
    + Index<RangeFull, Output=Self>
{
    ...
}
```

**Impls that must break** — break immediately before `for`, block-indent the concrete type, opening brace on its own line:

```rust
impl Bar
    for Foo
{
    ...
}
```

## Generics

**Prefer single-line generics.** Break other parts of the declaration before breaking the generics; prefer `where` clauses for large generic sets.

Spacing:
- No space before or after `<`, none before `>`.
- Space after `>` **only** if followed by a word or an opening brace — not an opening paren.
- Space after each comma; no trailing comma on a single-line list.
- Associated type bounds get spaces around `=`: `<T: Example<Item = u32>>`.
- **Prefer single-letter generic parameter names.**

```rust
fn foo<T: Display, U: Debug>(x: Vec<T>, y: Vec<U>) ...
impl<T: Display, U: Debug> SomeType<T, U> { ...

fn foo<
    T: Display,
    U: Debug,
>(x: Vec<T>, y: Vec<U>) ...
```

## `where` clauses

**Placement** — after a closing bracket of any kind, `where` goes on the same line with a space before it; otherwise on a new line at the same indentation as the item.

**Format** — each component on its own block-indented line, trailing comma (unless terminated by a semicolon), and the block or assignment starts on a new line.

```rust
fn function<T, U>(args)
where
    T: Bound,
    U: AnotherBound,
{
    body
}
```

Complex `+` bounds break **before each `+`**, block-indenting the continuations:

```rust
impl<T: ?Sized, Idx> IndexRanges<Idx> for T
where
    T: Index<Range<Idx>, Output = Self::Output>
        + Index<RangeTo<Idx>, Output = Self::Output>
        + Index<RangeFull>,
{
}
```

**Prefer inline bounds for very short `where` clauses.**

## Type aliases and associated types

```rust
pub type Foo = Bar<T>;                       // single line when possible

type VeryLongType<T, U: SomeBound>           // break before `=`, block-indent RHS
    = AnEvenLongerType<T, U, Foo<T>>;

type VeryLongType<T, U>                      // with a trailing where clause
    = AnEvenLongerType<T, U, Foo<T>>
where
    T: U::AnAssociatedType,
    U: SomeBound;

type WithPrecedingWC<T, U>                   // with a preceding where clause
where
    T: U::AnAssociatedType,
    U: SomeBound,
= AnEvenLongerType<T, U, Foo<T>>;
```

Associated types format like type aliases; space after the colon, none before: `pub type Foo: Bar;`

## Macros, modules and extern items

```rust
macro_rules! foo {           // use {} for the full definition
}

extern crate foo;            // spaces around keywords, none around the semicolon

mod foo {
}
mod foo;
```

**Always specify the ABI on extern items** — `extern "C" fn foo ...`, never bare `extern fn foo ...`.

## Types and bounds — spacing reference

| Construct | Form |
|---|---|
| Slice | `[T]` |
| Array | `[T; expr]` — space after the semicolon, e.g. `[u32; 42]` |
| Raw pointer | `*const T`, `*mut T` — no space after `*` |
| Reference | `&T`, `&'a T`, `&mut T`, `&'a mut T` |
| Never type | `!` — treated like any other type name |
| Function type | `unsafe extern "C" fn<'a, 'b, 'c>(T, U, V) -> W`, or `fn()` |
| Tuple | `(A, B, C, D)` — space after commas, no trailing comma **except one-tuples** |
| Path | `Foo::Bar`, `::Foo::Bar` — no spaces around `::` |
| Qualified path | `<Baz<T> as SomeTrait>::Foo::Bar` — single spaces around `as` |
| Parenthesised type | `(Foo)` — no spaces inside the parens |
| Generic type | `Foo::Bar<T, U, V>` — space after commas, no spaces around `<` `>` |
| Bound list | `T + T + T`, `impl T + T + T` — single spaces around `+` |
| Precise capturing | `use<'a, T>` — formats like a single path segment with angle-bracketed args |

**Breaking types**: avoid where possible; prefer to break at the **outermost** scope. `[T; expr]` breaks after the semicolon. Function types follow function-declaration rules; generic types follow generic rules. **Trait bounds break before *every* `+`** and block-indent:

```rust
impl Clone
    + Copy
    + Debug

Box<
    Clone
    + Copy
    + Debug
>
```

## Gotchas

- **`extern fn` without an ABI is non-conforming**, and it is easy to write by accident in FFI-heavy code.
- **`struct Foo {}` vs `struct Foo;`** — rustfmt will not convert one into the other. Reviewer's job.
- **Enum variant consistency is all-or-nothing**: adding one large struct variant means reformatting every struct variant in that enum.
- **Nested imports always go multi-line**, even short ones — so a "harmless" nesting change can produce a surprisingly large diff.
- **Space after `>` depends on what follows it** — a word or `{` gets a space, `(` does not. This trips up hand-formatting.

## Related
- [[Formatting]] — indentation, sorting, trailing commas
- [[Expressions-and-Statements]] — the bodies these declarations wrap
- [[Naming-and-Cargo]] — what to *call* all of this
- [[Home]]

---
*Last verified: 2026-07-27 · source: <https://doc.rust-lang.org/style-guide/items.html> and `/types.html`*
