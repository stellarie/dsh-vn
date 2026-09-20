---
created: 2026-08-19
updated: 2026-08-19
type: wiki
status: living
tags: [wiki, kotlin-guidelines, kotlin, android, architecture]
related: ["[[Idioms]]", "[[Review-Checklist]]"]
---
# Architecture

> [!abstract] TL;DR
> MVVM + Clean Architecture. Three layers: **domain** (pure Kotlin), **data** (implementations), **app** (Android UI + DI). Dependency flow: `app → domain ← data`. Domain never imports Android. Jetpack Compose for UI. Hilt for DI.

## Layer rules

### Domain (`:domain` module)

- **Zero Android imports.** Pure Kotlin. Testable with plain JUnit.
- Contains: models, repository interfaces, use cases.
- Use cases are single-responsibility: one public `operator fun invoke()` or `suspend operator fun invoke()`.
- Models are data classes or sealed interfaces. No framework annotations.

```kotlin
class LookupWordUseCase(
    private val dictionaryRepo: DictionaryRepository,
) {
    suspend operator fun invoke(query: String): List<DictEntry> =
        dictionaryRepo.lookup(query)
}
```

### Data (`:data` module)

- Implements domain interfaces.
- Depends on Android SDK, ML Kit, SQLite, network libraries.
- Never exposes framework types in its public API — map to domain models.

```kotlin
class JMDictRepository(
    private val db: JMDictDatabase,
) : DictionaryRepository {
    override suspend fun lookup(query: String): List<DictEntry> =
        db.queryEntries(query).map { it.toDomainModel() }
}
```

### App (`:app` module)

- Wires everything via Hilt.
- Contains: Activities, Services, Compose UI, ViewModels.
- ViewModels depend on use cases, never on repositories directly.

## Dependency flow

```
app → domain ← data
```

- `app` depends on both `domain` and `data`.
- `data` depends on `domain` (to implement interfaces).
- `domain` depends on neither.

## ViewModel conventions

- One ViewModel per screen/feature.
- Expose UI state as `StateFlow<UiState>`.
- Use sealed interface for UI state:

```kotlin
sealed interface LookupUiState {
    data object Idle : LookupUiState
    data object Loading : LookupUiState
    data class Success(val entries: List<DictEntry>) : LookupUiState
    data class Error(val message: String) : LookupUiState
}
```

- Handle events via a single `onEvent(event: UiEvent)` function.
- Never hold `Context`, `Activity`, or `View` references in a ViewModel.

## Compose conventions

- Composables are UpperCamelCase and return Unit.
- Stateless composables preferred: state hoisted to ViewModel.
- Preview functions annotated with `@Preview`.
- Use `Modifier` as the first optional parameter.

```kotlin
@Composable
fun DictionaryPopup(
    modifier: Modifier = Modifier,
    entry: DictEntry,
    onAddToAnki: (DictEntry) -> Unit,
) { ... }
```

## Service conventions

- Foreground services declare their type in the manifest.
- Keep service logic minimal — delegate to use cases.
- Use coroutine scopes tied to service lifecycle.

## Coroutine conventions

- Use `viewModelScope` in ViewModels.
- Use `lifecycleScope` in Activities/Fragments.
- Custom `CoroutineScope` in Services, cancelled in `onDestroy`.
- IO operations on `Dispatchers.IO`.
- UI updates on `Dispatchers.Main`.
- Never use `GlobalScope`.

## Testing

- Domain: plain JUnit. No Android dependencies.
- Data: JUnit + mocked dependencies or in-memory DB.
- UI: Compose testing framework (`createComposeRule`).
- Integration: Instrumented tests with Hilt.

## Gotchas

- **ViewModel holding Activity reference = memory leak.** Always.
- **`GlobalScope` is never the answer.** Tie coroutines to a lifecycle.
- **Domain module with Android imports = architecture violation.** Enforce via Gradle (no Android plugin on `:domain`).
- **Repository returning framework types** (e.g., `Cursor`, `Response`) leaks implementation into domain.

## Related
- [[Idioms]] — language features used in these layers
- [[Review-Checklist]] — architecture compliance checks
- [[Home]]

---
*Last verified: 2026-08-19*
