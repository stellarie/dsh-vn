---
name: deepseek-only-dev
description: Run architecture, implementation, review, and integration with DeepSeek models only, using native Agent Teams or imouto-driver workers.
---

# DeepSeek-Only Development

Use this skill when oniichan requests a DeepSeek-only flow.

The Lead performs architecture and orchestration with the selected DeepSeek model. Workers use the same DeepSeek route or `deepseek-flash` through imouto-driver.

## Preconditions

1. Confirm the Lead model is a DeepSeek model from the runtime context.
2. If the Lead is not DeepSeek, report that the flow is not DeepSeek-only.
3. Load `verification-before-completion` before project work.
4. Read the repository instructions and relevant skills.
5. Select `low`, `high`, or `max` effort. Use `max` for Lead and architecture work.

Do not reduce verification because the context window is large. Context capacity does not license irrelevant reading.

## Transport choice

Use one coordination transport per task.

- Native Agent Teams: use when oniichan requests Agent Teams or teammates.
- Imouto-driver: use for bounded DeepSeek workers under one Lead.
- Solo: use for tightly coupled or small work.

For native Agent Teams, load `imouto-agent-team` and follow it.

For imouto-driver, load `subimouto-dev` and follow it.

Do not run two task boards for one task. The selected transport remains authoritative.

## Lead responsibilities

The DeepSeek Lead owns:

- Problem intake and acceptance.
- Architecture decisions.
- Task decomposition.
- Skill and reasoning-page routing.
- Write-scope isolation.
- Integration and repair routing.
- Independent review of worker claims.
- Final verification and completion.

Workers never declare the whole project complete.

## Task compiler

Before delegation, compile the request into this contract:

```text
Role: architect | explore | implement | review | repair | integrate
Goal: one measurable result
Acceptance: checks that fail when the result is wrong
Repository root: exact absolute path
Write scope: exact paths or none
Dependencies: exact task ids or none
Required reads: entry points, callers, tests, and decisions
Required skills: verification-before-completion plus role skills
Reasoning pages: exact `how-claude-thinks` pages or none
Commands: exact verification commands
Forbidden actions: explicit limits
Report format: concise
```

Reject a contract without measurable acceptance. Ask only for user-owned choices that inspection cannot resolve.

## Architecture contract

Architecture work produces a decision, not an exploration transcript.

Required sections:

1. `Decision`: one clear architecture choice.
2. `Requirements`: obligations the decision satisfies.
3. `Evidence`: repository citations and executed observations.
4. `Alternatives`: at least two plausible options and rejection reasons.
5. `Interfaces`: affected APIs, files, data flow, and ownership.
6. `Risks`: failure modes, migration, rollback, and unresolved facts.
7. `Verification`: tests and checks that can falsify the decision.
8. `Slices`: ordered, independently verifiable implementation work.

Use `Information-and-Evidence.md`, `Drawing-Conclusions.md`, and `Decomposition-and-Planning.md` for difficult architecture.

## Skill routing

Always load `verification-before-completion`.

Add only applicable skills:

- Unfamiliar code: `codebase-analysis`.
- Bug or failure: `systematic-debugging`.
- Behavior change: `test-driven-development`.
- Review: `code-review`.
- Rust: `rust-guidelines`.
- Kotlin: `kotlin-guidelines`.
- Technical prose: `writing-ste100`.

Load `how-claude-thinks` for intake, scope, evidence, debugging, planning, conclusions, uncertainty, and completion.

## DeepSeek execution rules

- Use `max` effort for Lead, architecture, difficult debugging, and final review.
- Use `high` for ordinary implementation and integration.
- Use `low` only for mechanical, fully specified work.
- Keep thinking mode enabled.
- Preserve tool-call reasoning content through the model adapter.
- Prefer executable evidence over additional prose.
- Use one hypothesis per debugging experiment.
- Verify each slice before starting dependent work.
- Stop and escalate after three failed fixes on one theory.

## Context use

DeepSeek supports a large context window. Use it for relevant evidence, not repository dumps.

- Read entry points, callers, tests, and decisions before editing.
- Search broadly, then read load-bearing ranges deeply.
- Keep tool output bounded and cited.
- Compact only when the runtime approaches its safe request limit.
- Preserve conclusions, open risks, changed files, and verification evidence.

## Worker report

Every worker returns exactly:

```text
## Result
- status and completed requirement

## Changed
- paths and behavior

## Checks
- commands and observed results

## Concerns
- residual risks or none

## Next
- one concrete handoff
```

Each section permits five bullets. Do not narrate commands or reproduce the diff.

## Lead review

The Lead verifies:

1. The worker changed only its scope.
2. The code satisfies the acceptance contract.
3. Tests exercise the real behavior.
4. Regression tests fail without the fix when applicable.
5. Reports match actual command output.
6. Architecture interfaces remain consistent.
7. No documentation, comments, or names became false.

Route bounded repairs. Do not silently repair large worker mistakes during integration.

## Evaluation

Record these measures for representative tasks:

- Acceptance success.
- Lead repair time.
- Scope violations.
- Verification completeness.
- Retry count.
- Cost units and elapsed time.
- Defects found during final review.

A DeepSeek-only flow passes when it completes acceptance without non-DeepSeek model work. Human approval and deterministic tools do not violate this rule.

## Completion

The Lead runs fresh integration evidence:

- Required builds.
- Affected unit and integration tests.
- Repository CI-equivalent checks.
- Original user flow or strongest available proxy.
- Final diff and debris review.
- Non-mutating conflict check.
- Blackboard and task consistency.
- Worker lifecycle closeout.

Report unavailable checks as unverified. Never inflate the completion degree.

## Provenance

This skill applies the imouto development process and the `how-claude-thinks` reasoning skill to DeepSeek-only execution.
