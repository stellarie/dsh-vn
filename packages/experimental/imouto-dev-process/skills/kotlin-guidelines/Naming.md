---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin]
related: ["[[Style-and-Formatting]]", "[[Idioms]]"]
---
# Naming

> [!abstract] TL;DR
> Kotlin naming follows JetBrains conventions. Self-documenting names are the first line of defence against unnecessary comments. If you need a comment to explain a name, the name is wrong.

## Conventions

| Kind | Case | Example |
|---|---|---|
| Packages | lowercase, no underscores | `org.example.project` |
| Classes, interfaces, objects | UpperCamelCase | `DeclarationProcessor` |
| Functions, methods | camelCase | `processDeclarations()` |
| Properties, local variables | camelCase | `declarationCount` |
| Constants (`const val`, top-level `val`) | SCREAMING_SNAKE_CASE | `MAX_COUNT` |
| Enum entries | SCREAMING_SNAKE_CASE or UpperCamelCase | `RED` or `Color.Red` |
| Backing properties | `_camelCase` | `_elementList` |
| Type parameters | Single uppercase letter or UpperCamelCase | `T`, `Key`, `Value` |

## Composable functions

`@Composable` functions returning `Unit` use UpperCamelCase — they are treated as UI components:

```kotlin
@Composable
fun DictionaryPopup(entry: DictEntry) { ... }
```

## Test method names

Backtick-enclosed descriptive names:

```kotlin
@Test
fun `lookup returns entry for valid kanji`() { ... }
```

## Acronyms

- Two-letter: both uppercase — `IOStream`.
- Three or more: capitalize first letter only — `XmlParser`, `HttpClient`.

## Factory functions

Prefer descriptive names over matching the class:

```kotlin
companion object {
    fun fromPolar(angle: Double, radius: Double) = Point(...)
}
```

## Choosing names

- **Class**: noun or noun phrase. Says what it IS.
- **Function**: verb or verb phrase. Says what it DOES.
- **Boolean property**: reads as a question. `isEmpty`, `hasContent`, `isVisible`.
- Avoid meaningless words: `Manager`, `Wrapper`, `Helper`, `Util`, `Data`, `Info`.

## Self-documenting code

Before writing a comment, try to delete the need for it:

1. **Rename** — a comment explaining a variable is a variable with the wrong name.
2. **Extract** — a comment introducing a block is a function without a name.
3. **Restructure** — a comment about ordering is a missing type or assertion.

A good name replaces three lines of comments.

## Related
- [[Comments]] — what to do when names aren't enough
- [[Style-and-Formatting]] — how these names are formatted
- [[Home]]

---
*Last verified: 2026-08-19*
