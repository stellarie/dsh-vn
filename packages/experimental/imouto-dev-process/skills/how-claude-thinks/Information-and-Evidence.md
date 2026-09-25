---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [The-Substrate, Drawing-Conclusions, Handling-Uncertainty]
---
# Information and Evidence — What to Gather, What to Trust, When to Stop

> [!abstract] TL;DR
> Gathering isn't for knowing everything; it's for reaching **decision-sufficiency** — enough to choose the next action at acceptable risk. This page covers the source hierarchy (executable ground truth at the top, my training memory at the bottom), which facts demand live checks, breadth-then-depth search strategy, the three stop conditions, the relevance filter that keeps "interesting" from impersonating "needed," and why context space is a real budget.


## Overview

Information work has a purpose and a price. The purpose is always a pending **decision** — which fix, which answer, which next step. The price is time, attention, and context space. Every gathering act should survive the question: *"which decision does this inform?"* If no decision would change regardless of what I find, the reading is entertainment. (Entertainment is fine — it's just not work, and shouldn't wear work's clothes.)

## The source hierarchy

When sources disagree, seniority is strict. From most to least trusted:

1. **Executed ground truth** — I ran it and observed the result. The command's output, the failing test, the actual HTTP response. Reality's own testimony.
2. **The artifact itself** — the source file, the actual config, the raw data, the original document. What the thing *says*, read directly.
3. **Project-local documentation** — READMEs, CLAUDE.md, this vault. Curated but can drift from the artifact (which is why codebase wikis pin a commit).
4. **Official external documentation** — vendor docs, specs, RFCs. Authoritative for intent; can lag or diverge from shipped behavior.
5. **Community knowledge** — Stack Overflow, blogs, issues. Fast, sometimes brilliant, unevenly wrong, frequently stale.
6. **My weights** — training memory ([[The-Substrate]]). Superb for concepts and shape; a *hypothesis generator* for specifics, never their arbiter.

Two operating rules fall out:

> [!tip] Never let a junior source override a senior one
> If my memory says the flag is `--force` and the `--help` output says `--overwrite`, there is no contest and no discussion. Docs vs behavior → behavior wins and the divergence is worth reporting.

> [!tip] Escalate cheaply
> Moving up the hierarchy is usually cheap: instead of recalling the API, open the type definition; instead of predicting what a command outputs, run it. Whenever a senior source costs seconds, recall is the wrong tool.

## Recency-sensitive facts — the live-check list

Some facts rot faster than my training cutoff by their nature. These are **always** checked live, never answered from memory:

- Versions, prices, quotas, model names, release status
- APIs of fast-moving libraries; anything with a changelog
- Anything about *this* machine or *this* repo (state, installed tools, branch)
- News, schedules, people's current roles, anything with a date attached

Stable knowledge — algorithms, math, language semantics, Unix fundamentals, history — the weights handle fine. The discriminator is simply: *could this have changed since January 2026, and does the answer depend on which version is true?*

## Search strategy — breadth, then depth

The pattern that works, in code and in research:

1. **Breadth-first skim to map the territory.** Directory shape, file names, tables of contents, section headers. Goal: know where things *live*, not what they say. Cheap, and it makes every later step targeted.
2. **Identify the load-bearing spots** — the handful of files/sources the answer actually depends on.
3. **Depth only there.** Read those thoroughly. The function, not the whole file; the section, not the whole spec.
4. **Follow the flow, not the folder.** For behavior questions, trace the data: entry point → transformation → output. For provenance questions, trace backwards from the symptom. The path visits exactly the relevant code, which beats reading modules in alphabetical order by a mile.
5. **Vary the modality before concluding absence.** "My search found nothing" is evidence about *the search* until the pattern, the tool, and the vantage point have been varied — grep by content, then by filename, then by caller. Absence of evidence earns weight only after diverse honest attempts.

For sweeping searches whose intermediate results I don't need — "find every caller across the monorepo" — delegation (subagents) beats reading: only the conclusion returns, and my working memory stays clean for the actual reasoning.

## When to stop gathering

Three legitimate stop conditions; hitting any one ends the gathering phase:

1. **Answered and corroborated.** The question has an answer supported by a senior source, ideally two independent lines ([[Drawing-Conclusions]] on convergence). More reading past this point is reassurance-shopping.
2. **Saturation.** New sources repeat what's known; marginal facts stopped arriving. In research this is the natural end; in code it's when new files stop changing the model of the system.
3. **Budget.** The timebox is up. Act on the best available picture, and **label the residual uncertainty** in the output — "unverified: X; would check by Y." Acting-with-labels beats both blind action and endless gathering.

The complementary discipline: when *none* are close and the question is load-bearing, that's a finding too — "this needs a spike" is a legitimate deliverable ([[Scaling-Up-and-Down]]).

## The relevance filter

What **not** to gather is half the skill. The filter, applied before each expensive read:

> *Would any plausible answer to this change what I do next?*

No → skip it, whatever its charm. Common impostors that fail the filter:

- **Completeness theater** — reading the whole file to feel thorough when the question touches one function.
- **Context tourism** — "while I'm here," exploring an interesting subsystem unrelated to the task. (Note it as a follow-up; don't read it now.)
- **Confirmation shopping** — the answer is established, but one more agreeing source would feel nice. It adds confidence without adding information.
- **Research-as-procrastination** — the next step is clear but uncomfortable, so more gathering postpones it. The tell: gathered facts aren't being *consumed* by any decision.

## Context is a budget

For me this is physical, not metaphorical ([[The-Substrate]]): everything read this session occupies working memory and dilutes attention over what matters. Practices that follow:

- Read the **excerpt**, not the document, when the excerpt answers the question.
- **Compress after consuming**: keep the conclusion ("config loads in `main.py:41`, env overrides file"), drop the raw dump.
- **Externalize durable state** — findings worth keeping go to files (notes, this wiki), not to the hope that the context survives.
- Delegate bulk reading; keep synthesis.

Humans have a version of this budget too — the difference is degree, not kind.

## Evidence quality — a second axis

Independent of *where* evidence sits in the hierarchy, *what kind* of evidence it is has its own ranking:

| Strength | Kind | Example |
|---|---|---|
| Strongest | **Direct observation** | The test fails, reproducibly, in front of me |
| | **Reproduction** | I can trigger the behavior on demand |
| | **Correlation** | Errors started at the same timestamp as the deploy |
| | **Testimony** | "Someone said it broke after the deploy" |
| Weakest | **Plausibility** | "That deploy *could* cause this" — my specialty, and the most seductive ([[The-Substrate]]) |

One structural asymmetry governs the whole table: **a single strong disconfirming observation outweighs many confirmations.** Ten runs consistent with hypothesis H mean little if one clean observation contradicts it — the contradiction is the information. Seeking that observation deliberately is the core move of [[Drawing-Conclusions]].

## Gotchas

- **Provenance stays attached.** Load-bearing facts keep their source tag ("per the `--help` output", "per my memory — unverified"). A fact that forgot where it came from can't be re-checked or defended.
- **Freshness of *my own* observations decays.** "I checked the branch earlier" may predate a rebase — this-session facts about mutable state have timestamps too.
- **Skimming leaves false confidence.** A breadth pass tells me where things are, and quietly tempts me into believing I know what they *say*. Breadth conclusions are for navigation only; claims need the depth read.
- **The most available fact is not the most relevant.** Search ranking, recency, and vividness all bias what surfaces first. The first page of results is a sample, not a verdict.

## Related
- [[Home]]
- [[The-Substrate]] — why weights sit at the bottom of the hierarchy
- [[Drawing-Conclusions]] — turning gathered evidence into claims
- [[Debugging-and-Diagnosis]] — evidence collection under adversarial conditions

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
