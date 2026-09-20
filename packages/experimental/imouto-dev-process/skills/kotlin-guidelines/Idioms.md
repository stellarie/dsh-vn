---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin]
related: ["[[Naming]]", "[[Architecture]]"]
---
# Idioms

> [!abstract] TL;DR
> Kotlin-specific idioms that produce self-documenting, concise code. Immutability by default. Expression-oriented style. Null safety without `!!`. These are the language features that replace comments.

## Immutability by default

- Declare `val` unless the variable must change. Always.
- Use immutable collection interfaces (`List`, `Set`, `Map`) in signatures.
- Use `MutableList`/`MutableSet`/`MutableMap` only where mutation is the point.

```kotlin
// Preferred
val entries: List<DictEntry> = lookup(query)

// Only when mutation is needed
val buffer: MutableList<DictEntry> = mutableListOf()
```

## Expression-oriented style

Use `if`, `when`, and `try` as expressions:

```kotlin
val result = if (x > 0) "positive" else "non-positive"

val label = when (status) {
    Status.ACTIVE -> "Running"
    Status.PAUSED -> "Paused"
    Status.STOPPED -> "Stopped"
}
```

## Null safety

- **Never use `!!`** except where the invariant is provably held AND you want a crash on violation.
- Prefer `?.let { }`, `?:` (elvis), and smart casts.
- Use `requireNotNull()` or `checkNotNull()` when the null case is a programming error.

```kotlin
// Preferred
val name = user?.name ?: "Unknown"

// When null IS a bug
val entry = requireNotNull(cache[key]) { "Cache miss for $key" }

// Avoid
val name = user!!.name
```

## Default parameters over overloads

```kotlin
// Preferred
fun lookup(query: String, limit: Int = 10): List<DictEntry>

// Avoid
fun lookup(query: String) = lookup(query, 10)
fun lookup(query: String, limit: Int): List<DictEntry>
```

## Named arguments

Use when the meaning isn't obvious from the type:

```kotlin
// Clear
drawRect(x = 10, y = 20, width = 100, height = 50)

// Unclear
drawRect(10, 20, 100, 50)
```

Always use for boolean parameters:

```kotlin
setVisible(visible = true)
```

## Scope functions

| Function | Object ref | Return | Use when |
|---|---|---|---|
| `let` | `it` | lambda result | null-check + transform |
| `run` | `this` | lambda result | object config + compute |
| `with` | `this` | lambda result | grouping calls on an object |
| `apply` | `this` | object itself | object configuration |
| `also` | `it` | object itself | side effects (logging, validation) |

Keep scope function blocks short. If it needs 10+ lines, extract a function.

## Higher-order functions over loops

```kotlin
// Preferred
val validEntries = entries
    .filter { it.isValid }
    .map { it.toDisplayModel() }

// Less preferred
val validEntries = mutableListOf<DisplayModel>()
for (entry in entries) {
    if (entry.isValid) {
        validEntries.add(entry.toDisplayModel())
    }
}
```

Exception: use `for` when the loop body has side effects or complex state.

## Type aliases

Use for repeated complex types:

```kotlin
typealias OcrCallback = (OcrResult) -> Unit
typealias EntryIndex = Map<String, List<DictEntry>>
```

## Data classes

Use for value objects. Keep them focused:

```kotlin
data class DictEntry(
    val word: String,
    val reading: String,
    val glosses: List<String>,
)
```

## Sealed classes/interfaces

Use for closed type hierarchies — they make `when` exhaustive:

```kotlin
sealed interface OcrResult {
    data class Success(val text: String, val regions: List<TextRegion>) : OcrResult
    data class Error(val cause: Throwable) : OcrResult
    data object NoText : OcrResult
}
```

## String templates

Prefer `$variable` and `${expression}` over concatenation:

```kotlin
"Found ${entries.size} entries for $query"
```

## Destructuring

Use for data classes and pairs/triples:

```kotlin
val (word, reading, glosses) = entry
```

## Gotchas

- **`!!` is a code smell.** Every use needs justification.
- **Scope function nesting kills readability.** One level deep max.
- **`also` for logging is fine. `also` for business logic is not.**
- Higher-order functions have boxing overhead in hot paths. Measure before worrying.

## Related
- [[Naming]] — self-documenting names
- [[Architecture]] — where these idioms live in the layer structure
- [[Home]]

---
*Last verified: 2026-08-19*
