---
name: writing-ste100
description: House writing standard (ASD-STE100 style). Read before writing docs, READMEs, commit messages, code comments, PR text, or reports.
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
- Name exact things: `src/app.rs:1014`, not "the settings code".

## Structure

- One topic per paragraph.
- Use a vertical list for three or more items.
- Put the result first, then the detail.
- Cite, do not narrate. Write the conclusion, not the search that found it.
- Never delete a caveat to meet a length limit. Split the sentence instead.

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
