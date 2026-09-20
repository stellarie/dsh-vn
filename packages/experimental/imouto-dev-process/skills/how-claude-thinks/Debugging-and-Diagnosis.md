---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Drawing-Conclusions, Information-and-Evidence, Verification-and-Doneness]
---
# Debugging and Diagnosis — Conclusions Under Fire

> [!abstract] TL;DR
> Debugging is [[Drawing-Conclusions]] applied to a hostile artifact: something *is* wrong, the evidence is partial, and the temptation to fix before understanding is enormous. The method: read the error literally → reproduce → localize by bisection → rival hypotheses → the discriminating experiment → fix the cause, not the symptom → add the guard that would have caught it. One variable per experiment, always. The same skeleton diagnoses non-dev problems — processes, plans, bodies, teams.


## Overview

The prime directive, from which the whole method follows:

> [!warning] No fixes before understanding
> A fix applied without a diagnosis is a bet — and an *evidence-destroying* bet: whether it appears to work or not, the system has changed, the original failure state is gone, and the next investigation starts from a corrupted scene. When the symptom vanishes without the cause being understood, the bug hasn't died; it has *relocated* — usually to production, always to a worse time.

Debugging under this directive is evidence work: the bug is a fact about the system, the investigation is [[Information-and-Evidence]] under adversarial conditions, and the diagnosis is a conclusion that must earn its license before any edit ([[Drawing-Conclusions]]).

## Phase 0 — Read the error. Literally. All of it.

An absurd fraction of bugs die in this phase, and it's the most-skipped one:

- **Read the entire message**, including the second half — the part after the scary hex, the `caused by:` chain, the "did you mean…?" line. Error authors put the answer in there distressingly often.
- **Read it literally.** `ECONNREFUSED` means *the connection was refused* — not "the network is flaky," not "probably the usual thing." The message is an observation; the usual thing is an interpretation, and blurring them is how twenty minutes get spent confirming a hunch the message already contradicted.
- **Read the *first* error, not the loudest.** In a cascade, everything after the first failure is weather. Scroll up.
- The stack trace's *top frames in my code* — not the framework's — mark where to look first.

## Phase 1 — Reproduce

A bug I can trigger on demand is 80% dead; a bug I can't reproduce is not yet a fixing problem — it's a *data collection* problem, and pretending otherwise produces fixes aimed at fog.

- **Get a reliable trigger first.** Any reliable trigger, however clumsy.
- **Then minimize it.** Strip the reproduction down — smaller input, fewer steps, fewer moving parts — until removing anything more makes the bug vanish. The minimal repro is half a diagnosis: everything remaining in it is *implicated*, and everything stripped is *exonerated*.
- Can't reproduce? Then the work is instrumentation and evidence capture at the scene (logs, state dumps, the exact conditions of the sighting) — turning the next natural occurrence into data instead of another anecdote. "Intermittent" means *conditional on something not yet identified* — the condition is the quarry.

## Phase 2 — Localize by bisection

The search space shrinks fastest by halving, and there are three axes to halve along:

- **Space** — along the data path. Is the value already wrong *before* stage N, or does it break inside? One probe at the midpoint of the pipeline eliminates half the system. Repeat.
- **Time** — along history. When did it last work, and what changed since? `git bisect` mechanizes this; the manual version ("what changed?" — code, config, data, environment, *anything*) is often one question long, because the recent change is the base-rate favorite ([[Drawing-Conclusions]]).
- **Input** — along the case. Which half of the failing input still fails? Which feature of it is load-bearing?

> [!tip] One variable per experiment
> Change one thing, observe, then the observation *means* something. Change three things and the experiment teaches nothing — worse, whichever of the three "worked" becomes folklore. This rule feels slow and is the fastest known way through a search space.

## Phase 3 — Rival hypotheses and the discriminating experiment

With the fault localized, abduction takes over — and abduction without rivals is anchoring ([[Drawing-Conclusions]]):

1. **List candidate causes** — plural, deliberately. "What are three different failures that would produce exactly this?"
2. **Design the discriminating experiment** — the observation that comes out *different* under H₁ vs H₂, not another observation consistent with the favorite. ("If it's the stale cache, a cold start is clean. If it's the parser, cold starts fail too.")
3. **Predict before running** ([[Decomposition-and-Planning]] — the loop) — each hypothesis states what the experiment will show; the result then executes at least one of them.
4. Base rates order the suspects: **my code, then my config, then the dependency, then the platform** — the humbler suspect first, both because it's usually guilty and because proving it innocent is cheap.

## Phase 4 — Fix at the cause, then close the class

- **Fix the cause, not the symptom.** The null check that silences the crash without asking *why null arrived* converts a loud bug into a quiet one — strictly worse currency.
- **Add the guard that would have caught it** — the regression test that fails on the old code, the assertion, the validation at the boundary where the bad value entered. A fixed bug without a guard is on parole, not rehabilitated.
- **Ask where else this pattern lives.** The same mistake was probably made in the same era, by the same hands, in sibling code. Three siblings found = a systemic issue, one altitude up ([[Scaling-Up-and-Down]]).
- Then [[Verification-and-Doneness]]: the fix demonstrated on the original repro, the suite still green, the change's own blast radius checked.

## Un-anchoring — when the investigation stalls

The signature of an anchored investigation: N failed fix attempts, each a variation on the same theory. After about the third, the theory itself is the prime suspect. The reset protocol:

- **Return to raw evidence.** Re-read the actual error, the actual logs — not the summary of them formed an hour ago. Anchored investigations run on *cached interpretations*; the cache is stale.
- **Question a layer assumption.** The bug survives all fixes because it lives below the layer being fixed: the config never loaded, the deploy never shipped, the test runs against yesterday's build, it's the wrong database. Assumptions of the form "…is even happening at all" get one explicit check each.
- **Explain it out loud** (rubber-duck; in my case, writing the state summary): forcing the full chain into words locates the step where "and then obviously—" turns out not to be obvious.
- **Verify the fix is even being executed.** The most humiliating and most common stall: editing one file while running another. A deliberately-broken print statement settles it in ten seconds.

## The bestiary of hard cases

- **Heisenbugs** (vanish under observation): the debugger/logging changes timing → the bug is timing-sensitive, which *is a clue* — look at races, buffering, initialization order.
- **Works-on-my-machine**: not a mystery, a **diff** — two environments differ in some enumerable way (version, env var, locale, data, permissions). Stop philosophizing and enumerate the diff.
- **The bug that "can't happen"**: the impossible state means an assumption in the "impossible" reasoning is false. The reasoning, not the state, is what's broken — audit its premises ([[Drawing-Conclusions]], chain rule).
- **Fixed-by-unrelated-change**: it isn't fixed and it wasn't unrelated. Memory layout, timing, or caching shifted. The bug is now *hidden*, which is worse than present.

## Diagnosis beyond code

The skeleton — symptom → literal evidence → repro/pattern → localize → rivals → discriminating check → fix cause → guard — is domain-general:

- **A process failing** (deploys break monthly): pattern of occurrences = the repro; localize along the pipeline; rivals (people? tooling? timing?); the discriminating check is usually a targeted question or one instrumented run; the guard is a checklist or automation.
- **A plan going sideways**: which *premise* failed, not which person — localize along the plan's dependency chain ([[Decomposition-and-Planning]]).
- **A recurring disagreement**: reproduce it honestly (when exactly does it flare?), localize (what's the actual sentence that forks?), rivals (different values? different facts? different definitions? — these have *different fixes*), discriminate by asking, guard by writing the resolution down.
- **Body/health patterns**: the diary *is* the instrumentation; one variable per experiment matters double where placebo effects grade the results. (And the base rate says: sleep. It's usually sleep.)

## Gotchas

- **The fix that works for the wrong reason.** It happens — the retry "fixes" the race by rescheduling it. Symptom gone + cause unexplained = investigation still open, however green the test.
- **Debugging the framework before the code.** The compiler/runtime/library *does* have bugs — at a base rate of roughly one per thousand accusations. The exchange rate on that bet is terrible; spend accordingly.
- **Repro rot.** The minimal repro built an hour ago may no longer match the current theory's requirements — repros need re-validation after big pivots, like every other cached artifact.
- **Trophy-hunting the exotic.** A subtle memory-ordering theory is more *interesting* than a typo in the config key; interest is not evidence ([[Scaling-Up-and-Down]] on the mis-calibrator). Boring first.

## Related
- [[Home]]
- [[Drawing-Conclusions]] — the inference machinery this page weaponizes
- [[Information-and-Evidence]] — evidence collection and its hierarchy
- [[Verification-and-Doneness]] — proving the fix actually fixed

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
