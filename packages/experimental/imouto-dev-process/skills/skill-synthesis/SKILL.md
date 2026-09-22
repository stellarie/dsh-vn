---
name: skill-synthesis
description: Audit the skill catalog, find skills that claim one trigger, and merge them into fewer, stronger skills. Read when the catalog grows, or two skills overlap.
---

# Skill Synthesis

This skill is the inverse of skill harvesting. Harvest grows the catalog from a
repeated procedure. Synthesis shrinks the catalog by merging skills that claim
one trigger.

The catalog is a menu that every request pays for. Run this skill when the
catalog grows, when two skills overlap, or when oniichan asks for an audit.

## Roots and ranks

Measure the ranks. Never assume them. Run the deployment's skill checker first.
It prints every root, its rank, and its skill count.

Ranks move with the session root. One directory measured rank 100 in a session
rooted at the personal home, and rank 400 in a session rooted elsewhere. Two
sessions therefore load different skills for one name.

A synthesized skill must own a name that wins at the lowest rank that can hold
it. A personal file shadows a package skill in one session and does not shadow
it in another.

## Stage 0 - Inventory

Record name, root, rank, size, and description for every skill.

Reconcile two lists. The checker counts what its roots hold. The session
catalog lists what the model can load. When the two disagree, find the root the
checker does not scan before proposing any merge.

## Stage 1 - Route map

Build a trigger overlap matrix. Two skills overlap when their descriptions
claim the same situation. Record the phrases that load each skill.

Similar topics are not one trigger. Two skills about one language differ when
one covers formatting and the other covers safety.

## Stage 2 - Verdicts

Assign one verdict per cluster.

- **KEEP** - the skill earns its line.
- **MERGE into `{target}`** - one trigger, one skill. Name the target.
- **SPLIT** - one skill carries two triggers.
- **RETIRE** - the skill is superseded, unused, or its rule moved to a stricter
  home.

## Stage 3 - Independent audit

Dispatch read-only workers on disjoint slices. Give each worker the inventory
slice, the cluster, and the evidence rule. The workers return verdicts.

Add one adversarial pass. It argues against each merge. A merge survives when
the argument fails.

The author of a skill is the worst judge of its redundancy. Use a worker that
did not write the skill.

## Stage 4 - Safety gate

1. **Rank rule.** Check the measured rank of every root that holds a merged or
   retired name. A merge that assumes the wrong rank fails in one direction and
   destroys a package skill in the other.
2. **Archive rule.** Retire a body to `<root>/.retired/<name>.md`. The file is
   not named `SKILL.md`, so discovery cannot load it. Rollback is a file restore
   and a commit revert.
3. **Absorption contract.** Every normative sentence of a retired skill appears
   in the merged body, or appears in the retirement record with a reason.
4. **Reference check.** Grep every skill body, every `AGENTS.md`, the blackboard,
   and the presets for a retired name before the deletion.

## Stage 5 - Synthesize

Write the merged body. Run the checkers the deployment provides: the skill
checker for roots, caps, and structure, and the prose checker for style.

Load the new skill with the `skill` tool. Compare the returned body with the
file. Retire the old skills only after that check passes.

## Stage 6 - Report

Give oniichan the before and after catalog, every trigger that moved, the
retired list, and the rollback path. Name every trigger that lost an entry
point.

## Exit contract

1. Every skill carries a verdict.
2. The rank of every affected root is measured, not assumed.
3. The independent audit and the adversarial pass are recorded.
4. The absorption contract holds for every retirement.
5. The reference check is clean.
6. Every merged skill passed the install check.
7. oniichan approved every retirement.
8. The rollback path is named.

## Non-goals

- No new doctrine. Synthesis recombines rules that already exist. Use the
  harvest procedure for a new rule.
- No authoring from scratch. Use the skill-authoring standard of the
  deployment.
- No deletion in a package root. That is a package change with repository gates.
- No retirement without approval, and none without an archive.
- No merging across concern levels. A process skill never absorbs a domain
  standard.

## Red flags

| Thought | Reality |
|---|---|
| "These two look similar, so merge them" | Similar topics are not one trigger. Compare the descriptions. |
| "The merged skill reads better" | Measure the triggers, not the prose. |
| "Delete it, we can write it again" | A lost trigger fails silently. Archive first. |
| "The catalog is small enough" | Every line is paid on every request. |
| "The package copy is the same file" | Roots differ by rank. Check which one loads. |
