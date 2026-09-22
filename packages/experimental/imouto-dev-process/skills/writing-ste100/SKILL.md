---
name: writing-ste100
description: House writing standard (ASD-STE100 style). Read before writing docs, READMEs, skill bodies, commit messages, code comments, PR text, or reports.
---

# Writing in STE100 style

Seeded: 2026-09-19. Based on ASD-STE100 Simplified Technical English.

## Sentences

- An instruction sentence has 20 words or fewer. A descriptive sentence has 25 words or fewer.
- Use active voice: "The driver writes the file", not "The file is written".
- Use simple tenses: present, past, and future.
- Write one instruction per sentence. Split sentences joined with "and then".
- Put conditions first: "If the test fails, stop."

## Words

- Use the same word for the same thing, every time. Do not swap synonyms for variety.
- Prefer short, common words: "use" over "utilize", "start" over "initiate".
- Remove filler: "basically", "just", "in order to", "it should be noted that".
- Drop the hedge. "Should", "probably", "seems", and "might" hide an instruction.
- Write no contractions. Avoid "there is" and "there are"; name the actor.
- Name exact things: `src/app.rs:1014`, not "the settings code".

## Structure

- One topic per paragraph. Six sentences maximum.
- Use a vertical list for three or more items.
- Put the result first, then the detail.
- Cite, do not narrate. Write the conclusion, not the search that found it.
- Never delete a caveat to meet a length limit. Split the sentence instead.

## Check

```sh
python ~/tools/ste-check/ste_check.py FILE.md
```

It reports `LONG_SENTENCE`, `LONG_PARAGRAPH`, `PASSIVE`, `HEDGE`, `EXISTENTIAL`,
and `CONTRACTION`. Add `--json` for machine output, `--limit 20` for
instruction-heavy prose, and `--skip PASSIVE` to cut noise.

## Read the output, then decide

The checker is a smell test, not a verdict. It ignores quoted examples. It
fires on stative prose that is not really passive: "is verified", "are
organized". Read every hit before you change a sentence, and keep a hit when the
sentence is already clear.

## What style does not cover

- Style never bends a fact. Accuracy comes first, always.
- One physical line per paragraph is a repo rule, not an STE rule.
- Code, tables, and frontmatter are out of scope.

## Per artifact

| Artifact | Rule |
|---|---|
| Commit message | Imperative subject of 72 characters or fewer. The body says why. |
| Code comment | Follow the language skill limit. Prefer a clear name over a comment. |
| README or doc | Put the task the reader has first. Use tables for reference data. |
| Report to your parent | The result first. Then the evidence: commands and outputs. Then what was not verified. |

## Example

Before: "It was found that the tests could possibly be failing due to the fact that the config may not have been loaded."

After: "The tests fail. The config does not load: `config.rs:42` returns early when `HOME` is unset."
