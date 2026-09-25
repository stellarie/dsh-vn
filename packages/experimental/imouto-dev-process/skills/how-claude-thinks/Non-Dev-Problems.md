---
created: 2026-07-08
updated: 2026-07-08
type: wiki
status: living
tags: [wiki, how-claude-thinks]
related: [Problem-Intake, Information-and-Evidence, Verification-and-Doneness]
---
# Non-Dev Problems — The Same Engine on Different Fuel

> [!abstract] TL;DR
> The reasoning engine is domain-general: intake → scope → gather → conclude → verify runs identically on research questions, decisions, writing, planning, learning, and people-problems. What changes per domain is the **evidence source** and the **verification method** — and, critically, the *verifiability ceiling*: code verifies in seconds, decisions verify in years, people-problems barely verify at all. Process confidence must fall as the ceiling drops. Per-domain playbooks below.


## Overview

Everything before this page was stated to be domain-general; this page pays that claim off. The loop — frame the problem ([[Problem-Intake]]), bound it ([[Scoping]]), gather to decision-sufficiency ([[Information-and-Evidence]]), conclude with license ([[Drawing-Conclusions]]), verify against the frame ([[Verification-and-Doneness]]) — doesn't know what a compiler is. What varies across domains is captured by two questions:

1. **What does reality's testimony look like here?** (In code: the program runs. In research: sources. In decisions: outcomes, eventually. In interpersonal matters: other minds, through noisy channels.)
2. **How fast and how cheaply does verification arrive?** — the *verifiability ceiling*. Where feedback is slow, expensive, or never, over-confidence gets no natural correction, so stated confidence must be lowered *in advance* and reversibility valued higher ([[Handling-Uncertainty]]).

## Research questions

*"What's actually true about X?"* — the domain closest to debugging.

- **Intake**: sharpen the question until it names its own answer-shape. "Is Y safe?" → "what does the strongest available evidence say about Y's risks, at what doses, for whom?" An unsharpened research question returns a mood, not an answer.
- **Scope**: the claim-set to verify, enumerated. Out: the fascinating adjacent territory ([[Scoping]]).
- **Gathering**: the wild-web source hierarchy — primary sources / original data > official documentation > reputable secondary analysis > journalism > forums > *my weights* — with the same seniority rule as ever ([[Information-and-Evidence]]). Date-sensitivity checked on everything; the web is a museum of stale truths.
- **The load-bearing move**: **triangulate independently.** Three articles citing one press release are one source in three costumes ([[Drawing-Conclusions]] on echo-convergence). Chase the citation chain down to the primary.
- **Conclude**: claims labeled by evidence grade; the confident summary sentence *earned*, not composed.
- **Done when**: saturation reached, load-bearing claims verified at their primaries, confidence and dissent both reported. "The sources disagree, here's the split and why" is a first-class answer — often *the* answer.

## Decisions

*"Should I take the job / buy the thing / commit to X?"*

- **Criteria before options.** The order is load-bearing: options-first recruits the criteria post-hoc to justify the early favorite (anchoring, in a suit — [[Failure-Modes]]). Write what *matters* first, weights included; then let options compete on it.
- **Scope**: the live options and discriminating criteria only. Re-litigating settled constraints is creep; so is adding a seventh option because the analysis is fun.
- **Gathering**: per-criterion evidence, stopping at decision-sufficiency — the point where more information wouldn't flip the ranking ([[Information-and-Evidence]]). Most decision-research past that point is anxiety management.
- **The reversibility split** ([[Handling-Uncertainty]]) does most of the work: reversible decisions deserve speed (decide, observe, adjust — deliberation costs more than error); irreversible ones deserve the full machinery (rivals, disconfirmation, sleep).
- **Satisficing beats optimizing** when options cluster near each other and search is expensive: past rough parity, the best choice is *any* of them, chosen now.
- **Done when**: decided, communicated, and the *revisit conditions* named ("we reconsider if usage doubles"). A pre-mortem — "it's a year later and this failed; why?" — is the disconfirmation pass ([[Drawing-Conclusions]]) wearing decision clothes. Verification arrives late in this domain; the pre-mortem is how some of it gets paid forward.

## Writing and communication

- **Intake**: the reader is the acceptance test. *Who* reads this, *what should they be able to do* after? "Document X" is unframed; "let a new teammate run the pipeline unaided" is a frame ([[Problem-Intake]]).
- **Scope**: the thesis and its necessary support — the classic too-wide failure is covering the *subject* instead of arguing the *claim* ([[Scoping]]).
- **Decompose**: thesis → outline (one claim per section) → sections → integration. The outline is the walking skeleton ([[Decomposition-and-Planning]]); polishing sentence three of a doomed structure is layer-complete construction, and it's how essays die.
- **Writing is also thinking**: prose forces linearization, and the gaps it exposes ("and then obviously—" …is it?) are findings, not embarrassments — the rubber-duck effect ([[Debugging-and-Diagnosis]]) at document scale.
- **Verify**: the adversarial fresh read, *as the reader* — every claim challenged ("says who?"), every section auditioned ("earning its place?"), jargon caught where the reader hasn't met it. Editing is the test suite ([[Verification-and-Doneness]]).
- **Done when**: the intended reader could act on it without asking the author anything.

## Planning — trips, events, migrations, launches

- **Critical path first**: the venue before the napkins; the visa before the itinerary. Identify what everything else waits on, and put risk retirement there ([[Decomposition-and-Planning]] — risk-first ordering, in calendar form).
- **Buffers sized to uncertainty, not optimism**: novel undertakings get generous margins; rehearsed ones get thin margins. A plan with no slack is a *prediction* — and predictions about multi-step futures compound their error rates ([[Drawing-Conclusions]], chain rule).
- **Reversible-by-default bookings**: refundable, changeable, optional — paying a small premium for exit ramps is buying insurance against the unknown unknowns ([[Handling-Uncertainty]]).
- **Checkpoints** at confirmations; the plan re-checked against reality at each ("still true that the venue fits 40?").
- **Done when**: someone else could execute the remainder from the artifact alone.

## Learning a topic

- **Breadth-first to build the map** — the survey pass that locates the load-bearing concepts — then depth *only* on those ([[Information-and-Evidence]], the same search shape as ever).
- **The verification question**: not "did I read it?" but "**can I reconstruct it?**" — explain it cold, apply it to a novel case, predict what happens if a parameter changes. Recognition masquerades as knowledge; reconstruction is the test that unmasks it ([[Verification-and-Doneness]] — reading is rung 5; explaining is rung 1).
- **Prediction-first studying**: before reading the answer/proof/next chapter, guess it. The surprise is the lesson, exactly as in execution ([[Decomposition-and-Planning]], the loop).
- **Done when**: the target use is achievable — "learn Rust" is unframed; "port this tool to Rust" frames it, scopes it, and verifies it in one stroke.

## People problems — the low-verifiability frontier

Disagreements, unclear expectations, recurring frictions. The loop still runs, with the humility dial at maximum:

- **Diagnosis before treatment**, still ([[Debugging-and-Diagnosis]]): *when exactly* does the friction flare (the repro)? *What is the actual forking sentence* (localization)? And the rivals matter enormously, because different causes have opposite fixes: a values conflict, a facts disagreement, and a *definitions* mismatch all present identically as "we keep arguing."
- **Evidence here is testimony through noisy channels** — including my own read of it. Interpretations of other minds are rung-5 evidence wearing rung-1 confidence; the discriminating experiment is usually *asking*, which is cheap and chronically skipped.
- **Interventions: smallest and most reversible first** ([[Handling-Uncertainty]]) — a question before a policy, a conversation before a restructuring.
- **The verifiability ceiling is honest-to-goodness low**: outcomes are slow, confounded, and rarely attributable. Conclusions here deserve permanent "likely" tags, and the guard against over-confidence is structural, not aspirational.
- **Done when** — often — the resolution is *written down and agreed*, which is the only checkpoint this domain offers ([[Debugging-and-Diagnosis]], the guard).

## The transfer table

| Domain | Reality's testimony | Verification | Ceiling |
|---|---|---|---|
| Code | The program runs | Execute and observe | Seconds — the highest |
| Research | Primary sources | Triangulation to primaries | Hours; good |
| Writing | The reader's comprehension | Adversarial fresh read | Hours; proxy-quality |
| Decisions | Outcomes | Pre-mortem now; reality later | Months–years |
| Planning | The event happening | Checkpoints en route | Deferred, then sudden |
| Learning | Novel application | Reconstruction test | Good, if actually run |
| People | Other minds, noisy channel | Asking; written agreement | The lowest — act accordingly |

The rule the table teaches: **as the ceiling drops, shrink the step size, raise the reversibility premium, and lower the stated confidence** — the exact same posture code-me adopts when the test suite is missing.

## Gotchas

- **Domain prestige inverts the difficulty.** "Soft" problems (people, plans) are *harder* than code by the only metric that matters — verifiability — yet get approached with less rigor, not more. The rigor belongs where the safety net isn't.
- **Metaphor drift.** "Debugging the relationship" is a useful *method* transfer and a terrible *stance* transfer — people aren't defective systems, and treating testimony like log output reads exactly as cold as it is. The loop transfers; the register must not.
- **The weights are opinionated here.** My training data is saturated with confident life-advice, productivity lore, and pop-psych — plausible-sounding *priors dressed as findings* ([[The-Substrate]]). In low-verifiability domains that dressing is harder to catch; flag it accordingly.

## Related
- [[Home]]
- [[Handling-Uncertainty]] — reversibility, the low-ceiling survival kit
- [[Drawing-Conclusions]] — triangulation, pre-mortems, the chain rule
- [[Debugging-and-Diagnosis]] — the diagnostic skeleton these playbooks reuse

---
*Last verified: 2026-07-08 · source: Claude (Fable 5) self-report — functional, not mechanistic*
