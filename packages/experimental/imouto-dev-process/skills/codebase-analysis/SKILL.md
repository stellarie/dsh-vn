---
name: codebase-analysis
description: Read and map an unfamiliar codebase, module, or feature before changing it. Read when onboarding to a repo, tracing a flow, or preparing a plan against code you have not worked in.
---

# Codebase Analysis

Understand before you act. The deliverable is a structured understanding, not a
list of opinions.

## When to use it

- First time in a repository or module.
- Asked to read, understand, map, explain, or analyze code.
- Before planning a change that touches unfamiliar code.
- When a task depends on cross-module data flow.

## Phase 1 — Orient, broad and shallow

1. **Find the entry points.** `main`, `index`, `mod.rs`, the app class, or
   whatever boots the system.
2. **Read the shape.** The top-level directory listing, the build system, the
   language, the framework.
3. **Read the manifests.** Dependencies and their versions show what the project
   leans on.
4. **Read the existing docs first.** `README.md`, `AGENTS.md`, `CLAUDE.md`,
   `MEMORY.md`, `docs/`. Reading is faster than rediscovering.

Deliverable: one paragraph that says what this project is and how it is shaped.

## Phase 2 — Map the part that matters

Pick the subsystem the task touches, then:

1. **Trace the data flow** from entry to output, naming each layer it crosses.
2. **Find the boundaries.** Where are the module, package, or crate edges, and
   what crosses them?
3. **Learn the conventions.** Naming, error handling, test layout, logging.
   Note deviations instead of adopting them.
4. **Spot the load-bearing abstractions.** The traits, interfaces, and base
   types everything depends on. These are what a change must not break.

Deliverable: the layers, the boundaries, the key abstractions, and the
conventions.

## Phase 3 — Assess

1. **Risks**: what is fragile, untested, or tightly coupled?
2. **Patterns**: what does this codebase do consistently? Follow it.
3. **Unknowns**: what could you not determine from reading? Name it.

Deliverable: risks, patterns to follow, and open questions.

## Report shape

```
## Analysis: {module or repo}

### What it is
{one paragraph}

### Architecture
- {layer}: {purpose} ({key files})

### Data flow
{entry} -> {step} -> {step} -> {output}

### Conventions
- {pattern observed} (example: {file:line})

### Risks
- {risk}

### Open questions
- {what reading could not settle}
```

## Rules

- Read before judging. Finish Phase 1 before forming an opinion.
- Follow the data flow, not the folder order. Folders are organized for humans.
- Report what is, not what should be. Analysis is observation.
- Cite `file:line`. A claim without a location cannot be checked.
- Verify one documentation claim against the code. If it is wrong, the docs are
  stale — say so.
- Breadth first, depth only on the load-bearing parts. Do not read every file.
- Before finishing, ask: could someone act on this without asking me a follow-up
  question? If not, it is incomplete.

## Provenance

Adapted 2026-09-20 from the `codebase-analysis` skill in the Codex setup at
`~/.codex/skills/codebase-analysis/`. Rewritten for this environment; not a
copy.
