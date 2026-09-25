---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin, house-rule]
related: ["[[Naming]]", "[[Review-Checklist]]"]
---
# Comments

> [!abstract] TL;DR
> **House rule: the default is no comment.** Write one only when the code cannot be made obvious on its own — and when you do, keep the comment text **~80 characters**. **This includes KDoc** (`/** */`) — it is not an escape hatch. Self-documenting code is the first priority.

> [!warning] This page deliberately sets a house standard
> The Kotlin conventions say "generally, avoid redundant comments." We go further: comments are a code smell until proven otherwise. The ~80 char budget is a signal — if the explanation doesn't fit, the code is too clever or the explanation belongs elsewhere (docs/, commit message, wiki).

---

## The house rule

### 1. Self-documenting code first

Before writing a comment, try to delete the need for it:

1. **Rename** something. A comment explaining a variable is a variable with the wrong name.
2. **Extract** a function. A comment introducing a block is a function without a name.
3. **Restructure.** A comment warning about ordering is a missing type or assertion.
4. **Use types.** A comment explaining valid values is a missing enum or value class.

Only when all four fail does the comment earn its place.

### 2. Keep it under ~80 characters

The comment **text** (excluding `//` and indentation) should be **~80 characters**.

```kotlin
// Good — earns its ~80 chars
val timeout = 5000L // MediaProjection needs warmup before first capture.

// Good — external constraint
val dpi = resources.displayMetrics.densityDpi // Needed for OCR scaling.
```

```kotlin
// Bad — restates the code
val count = list.size // Get the size of the list.

// Bad — paragraph in a comment
// We use ML Kit here rather than Tesseract because the accuracy for
// CJK characters is significantly better and the model download is
// only 2MB which keeps the APK size reasonable for sideloading.
```

The second bad case is *good information in the wrong place*. Move it to `docs/`, the commit message, or the wiki.

### 3. What earns a comment

| Earns it | Why |
|---|---|
| A non-obvious **why** | The *what* is in the code; the *why* is not |
| A trap or footgun | `// Crashes if overlay permission revoked mid-capture.` |
| An external constraint | `// Android 12 requires exact alarm permission.` |
| A deliberate deviation | `// AnkiWeb returns 200 on auth failure.` |
| A magic value's origin | `// From MediaProjection docs.` |
| A performance reason | `// Bitmap.recycle() prevents OOM on repeated captures.` |

| Does not earn it | Instead |
|---|---|
| Restating the code | Delete |
| Section banners (`// ---- setup ----`) | Extract a function |
| Commented-out code | Delete; git remembers |
| Ownerless `// TODO` | File an issue, or delete |
| Changelog in a comment | The commit message |
| KDoc restating the function name | Delete; name is the doc |

## KDoc

KDoc follows the same ~80 char rule. It is not an escape hatch for long comments.

One line, naming what the thing is. Avoid `@param` and `@return` unless the explanation is genuinely long and complex.

```kotlin
/** Looks up [query] in the bundled JMdict database. */
fun lookup(query: String): List<DictEntry> { ... }
```

Not:
```kotlin
/**
 * This function takes a query string parameter and searches
 * for it in the JMdict database that is bundled with the
 * application. It returns a list of dictionary entries that
 * match the query string.
 *
 * @param query The query string to search for
 * @return A list of matching dictionary entries
 */
fun lookup(query: String): List<DictEntry> { ... }
```

## Upstream mechanical rules (still apply)

- Prefer `//` for inline comments.
- Space after `//`: `// Like this.`
- KDoc: `/** ... */` for documentation, not `/* ... */`.
- KDoc goes before annotations.
- Prefer `[paramName]` inline references over `@param` tags.

## Gotchas

- **Linters will not enforce comment length.** This is a review responsibility.
- **~80 chars is a budget, not a hard error.** 85 that says something true beats 75 that says nothing.
- **Do not delete a long comment just to satisfy the rule.** Relocate the information first.
- **Self-documenting code is not a licence for clever code.** It means clear, readable code that doesn't need a comment — not terse code that nobody can read.

## Related
- [[Naming]] — self-documenting names are the first defence
- [[Review-Checklist]] — where comment discipline gets checked
- [[Home]]

---
*Last verified: 2026-08-19 · adapted from ~/notes/wiki/rust-guidelines/Comments.md (house rule: ≤30 chars → ~80 chars for Kotlin)*
