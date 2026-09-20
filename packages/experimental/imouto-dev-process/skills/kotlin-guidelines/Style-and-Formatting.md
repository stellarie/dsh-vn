---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin]
related: ["[[Naming]]", "[[Comments]]"]
---
# Style and Formatting

> [!abstract] TL;DR
> **4 spaces, ~120 columns code / ~80 columns comments, block indent, trailing commas on multi-line.** ktlint or detekt handles most of this. Know the rules so you spot what linters miss.

## Whitespace and width

| Rule | Value |
|---|---|
| Indent character | **Spaces, never tabs** |
| Indent unit | **4 spaces** |
| Max line width | **120 characters** (Android Studio default) |
| Comment-only lines | **~80 characters** — see [[Comments]] |
| Trailing whitespace | **None** |
| Blank lines | One blank line between top-level declarations. One between logical sections in a function body. Never two consecutive blank lines |

## Block indent, not visual indent

```kotlin
// Preferred
aFunctionCall(
    foo,
    bar,
)

// Discouraged
aFunctionCall(foo,
              bar)
```

Rationale: smaller diffs on renames, less rightward drift.

## Trailing commas

Use trailing commas on multi-line parameter lists, argument lists, enum entries, destructuring declarations, and collection literals.

```kotlin
class Person(
    val name: String,
    val age: Int,
)

val colors = listOf(
    "red",
    "green",
    "blue",
)
```

Single-line forms take no trailing comma.

## Braces

- Opening brace at end of the line where the construct begins.
- Closing brace on its own line, aligned with the construct.
- `else`, `catch`, `finally` on the same line as the preceding `}`.

```kotlin
if (condition) {
    doSomething()
} else {
    doOtherThing()
}
```

## Spaces

- **Around binary operators**: `a + b`, `x = y`.
- **After control keywords**: `if (`, `when (`, `for (`, `while (`.
- **No space** before `(` in function declarations/calls.
- **No space** around `.` and `?.`.
- **Space after `//`**: `// Comment`.
- **Space after `:` always**. Space before `:` only for type/supertype separation.

## Class headers

Few parameters — single line:
```kotlin
class Person(val id: Int, val name: String)
```

Long — one parameter per line:
```kotlin
class Person(
    val id: Int,
    val name: String,
    val surname: String,
) : Human(id, name) {
    // body
}
```

## Modifier order

```
public/protected/private/internal
expect/actual
final/open/abstract/sealed/const
external
override
lateinit
tailrec
vararg
suspend
inner
enum/annotation/fun
companion
inline/value
infix
operator
data
```

Annotations go before modifiers.

## Chained calls

Break before `.` or `?.`, one element per line, block-indented:

```kotlin
val result = owner
    ?.firstChild
    .siblings(forward = true)
    .dropWhile { it is PsiComment }
```

## Long function signatures

```kotlin
fun longMethodName(
    argument: ArgumentType = defaultValue,
    argument2: AnotherArgumentType,
): ReturnType {
    // body
}
```

## Expression bodies

Prefer when the function is a single expression:

```kotlin
fun square(x: Int) = x * x
```

If the expression doesn't fit, put `=` on the first line and indent the body:

```kotlin
fun f(x: String, y: String, z: String) =
    veryLongFunctionCall(x, y, z)
```

## Import ordering

ktlint default: alphabetical, no wildcards. Follow the project's linter config.

## Gotchas

- ktlint does not enforce comment width. That is a review item.
- Trailing commas are optional in Kotlin but **required by house style** on multi-line.
- Modifier order is rarely enforced by linters. Follow the list above.

## Related
- [[Naming]] — what these formatted things are called
- [[Comments]] — the ~80 char budget
- [[Home]]

---
*Last verified: 2026-08-19*
