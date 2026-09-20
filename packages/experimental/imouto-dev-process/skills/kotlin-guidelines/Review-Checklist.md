---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin, review]
related: ["[[Comments]]", "[[Architecture]]", "[[Idioms]]"]
---
# Review Checklist

> [!abstract] TL;DR
> **Automate everything decidable, then spend human attention on what tools cannot decide.** Run the tool gate first. Then: null safety, architecture, structure, comments — in that order.

## 0. Order of operations

1. **Tool gate** — anything a tool can decide, a tool decides.
2. **Null safety and type safety** — where Kotlin bugs hide.
3. **Architecture compliance** — layer violations, dependency direction.
4. **Structure** — error handling, naming, API shape.
5. **Comments** — last, because most comment problems are naming problems.

---

## 1. Tool gate

```bash
./gradlew ktlintCheck detekt build test
```

- [ ] ktlint clean — formatting is not a review item.
- [ ] detekt clean — code smells caught by static analysis.
- [ ] Build succeeds — no compile errors.
- [ ] Tests green.

If any of these are red, there is nothing to review yet.

---

## 2. Null safety and type safety

- [ ] **No `!!` without justification.** Each use needs a comment stating the invariant.
- [ ] **Platform types resolved.** Public functions returning Java interop results declare explicit Kotlin types (`String`, not `String!`).
- [ ] **`requireNotNull` / `checkNotNull` over `!!`** for programming errors.
- [ ] **Sealed types exhaustive.** `when` on sealed types has no `else` branch — let the compiler catch missing cases.
- [ ] **No raw types.** Generic parameters always specified.

---

## 3. Architecture compliance

- [ ] **Domain module has zero Android imports.** Check `import android.*` and `import androidx.*`.
- [ ] **Dependency direction correct.** `app → domain ← data`. No backwards references.
- [ ] **ViewModels depend on use cases**, not repositories or data sources.
- [ ] **No `Context`/`Activity` in ViewModels.**
- [ ] **Repository interfaces in domain**, implementations in data.
- [ ] **No `GlobalScope`.** Coroutines tied to a lifecycle.
- [ ] **IO on `Dispatchers.IO`**, UI on `Dispatchers.Main`.

---

## 4. Structure

- [ ] **Error handling.** Errors carry enough context to diagnose. No swallowed exceptions (`catch (e: Exception) { }`).
- [ ] **Strong types over primitives.** A `String` that is really a word, a reading, and a gloss in three places is three bugs waiting. Use value classes or distinct types.
- [ ] **Naming follows conventions.** [[Naming]].
- [ ] **Self-documenting code.** Could a rename or extraction delete a comment?
- [ ] **Immutability.** `val` over `var`. Immutable collections in signatures.
- [ ] **Single-responsibility.** Classes and functions do one thing.

---

## 5. Comments — last pass

Per [[Comments]]:

- [ ] **Every comment earns its place.** Could a rename, extraction, or restructure delete it?
- [ ] **Comment text is ~80 characters** — excluding `//` and indentation.
- [ ] **Over-budget comments were *relocated*, not deleted.** Long rationale goes to docs/, commit message, or wiki.
- [ ] **KDoc is concise.** One-line description, `[paramName]` inline. No `@param`/`@return` walls.
- [ ] **No commented-out code, no ownerless `// TODO`, no section banners.**

---

## What this checklist does not do

- **It does not check formatting by hand.** That is ktlint's job.
- **It does not cover security.** Android-specific security (intent injection, exported components, cleartext traffic) needs its own review.
- **It does not cover performance.** Bitmap handling, memory leaks, main-thread violations need profiler-backed review.

## Related
- [[Comments]] · [[Naming]] · [[Style-and-Formatting]] · [[Idioms]] · [[Architecture]]
- `~/notes/wiki/how-claude-thinks/Verification-and-Doneness.md` — "should work" is not done
- [[Home]]

---
*Last verified: 2026-08-19 · adapted from ~/notes/wiki/rust-guidelines/Review-Checklist.md*
