# Suite reliability report

Generated 2026-11-12 14:06 UTC (GitHub Actions) by `scripts/eval-report.py`. This file is rewritten after `.github/workflows/test-generation.yml` finishes and after a local agent or orchestrator stops. Cursor has no built-in telemetry for these four numbers.

## Flake rate

| | |
| --- | --- |
| Number | 6 / 869 finished tests (0.7%) |
| How measured | Playwright's own summary in the last 10 completed E2E Tests runs on GitHub Actions (`gh run view --log`). A test is counted when the summary says `flaky`: it failed, then passed on a CI retry (`retries: 2`). Cancelled runs are left out. The log prints the summary twice; only the first copy is counted. Cursor has no flake telemetry. |
| What it tells us | 6 tests passed only because CI retried them. The red runs are mostly hard failures, and the retries that did pass cluster on the programs axe scan. |

| Run | Event | Flaky | Passed | Failed |
| --- | --- | ---: | ---: | ---: |
| [42829751991](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42829751991) | push | 0 | 53 | 1 |
| [42829655477](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42829655477) | push | 1 | 52 | 1 |
| [42676944289](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42676944289) | push | 0 | 103 | 3 |
| [42654912825](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42654912825) | push | 0 | 103 | 3 |
| [42653402341](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42653402341) | push | 2 | 101 | 3 |
| [42638415519](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42638415519) | push | 0 | 0 | 1 |
| [42039352558](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42039352558) | push | 1 | 101 | 4 |
| [41881505839](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/41881505839) | push | 1 | 101 | 4 |
| [41880571281](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/41880571281) | pull_request | 0 | 108 | 7 |
| [41880097600](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/41880097600) | pull_request | 1 | 103 | 11 |

| Run | Passed only on retry |
| --- | --- |
| [42829655477](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42829655477) | tests/ds264-create-new-academic-program.spec.ts:54:9 › DS-264 Create new academic program › Happy paths › TC-003 — Newly created program appears at the top of the list @sanity |
| [42653402341](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42653402341) | tests/ds5-program-list-display.spec.ts:19:9 › DS-5 Program list display › Positive flows › TC-001 — Display program list with key details |
| [42653402341](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42653402341) | tests/programs.a11y.spec.ts:8:7 › Programs page accessibility › axe scan of Programs page (wcag2a, wcag2aa) |
| [42039352558](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/42039352558) | tests/programs.a11y.spec.ts:8:7 › Programs page accessibility › axe scan of Programs page (wcag2a, wcag2aa) |
| [41881505839](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/41881505839) | tests/programs.a11y.spec.ts:8:7 › Programs page accessibility › axe scan of Programs page (wcag2a, wcag2aa) |
| [41880097600](https://github.com/JuliaStarky/ai-assisted-qa-automation/actions/runs/41880097600) | tests/programs.a11y.spec.ts:8:7 › Programs page accessibility › axe scan of Programs page (wcag2a, wcag2aa) |

## Heal success rate

| | |
| --- | --- |
| Number | 0 / 1 drift heals were locator-only |
| Masked regressions | 1 (must be 0) |
| How measured | `git log --grep=heal` for commits that touch `pages/` or `tests/`, plus `gh pr list --search "heal in:title"`. A heal is clean when that diff does not add or remove an `expect(`. A masked regression is a heal diff that does. Commits that only edit the workflow or the rules are not drift heals. Cursor has no heal telemetry. |
| What it tells us | 0 of 1 drift heals left the assertions alone. The masked-regression count is 1; the bar is 0. |

| Commit | Subject | Files | Clean | Masked regression |
| --- | --- | --- | --- | --- |
| `2269635` | self healing | pages/ProgramsPage.ts, tests/ds3-program-name-validation-and-duplicate-prevention.spec.ts | no | yes |

No pull request title contains `heal`.

## Generation-gate pass rate

| | |
| --- | --- |
| Number | 0 / 7 first pull requests |
| How measured | Every merged or open pull request whose commits are authored or co-authored by `cursoragent` and that adds a `tests/*.spec.ts`. Pass means all three, on the first commit: the earliest E2E check (`test`, `Smoke`, `Sanity`, or `Regression`) is `SUCCESS`; the spec has an `expect(`, one allowed tag per `test()`, and no `waitForTimeout`, `any`, or CSS/XPath `page.locator`; every Gherkin `Scenario` shares a content word with a test title. Cursor has no generation telemetry. |
| What it tells us | 0 of 7 generated specs were green, conforming, and mapped to acceptance criteria on the first pull request. |

| PR | First E2E check | Conforming | Maps to AC | Gate |
| --- | --- | --- | --- | --- |
| [#7](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/7) | no check | tests/ds266-program-name-validation-and-duplicate-prevention.spec.ts: 0 tags for 22 tests; tests/ds266-program-name-validation.a11y.spec.ts: 0 tags for 2 tests | yes | fail |
| [#6](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/6) | failure | tests/ds265-edit-existing-program-details.spec.ts: 0 tags for 19 tests | yes | fail |
| [#5](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/5) | failure | tests/ds264-create-new-academic-program.spec.ts: 0 tags for 19 tests | yes | fail |
| [#4](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/4) | failure | tests/ds263-selected-row-actions-visible.spec.ts: 0 tags for 19 tests | yes | fail |
| [#3](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/3) | failure | tests/ds262-double-click-delete-dialog.spec.ts: 0 tags for 17 tests | yes | fail |
| [#2](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/2) | failure | tests/ds261-no-error-on-failed-delete.spec.ts: 0 tags for 16 tests | yes | fail |
| [#1](https://github.com/JuliaStarky/ai-assisted-qa-automation/pull/1) | failure | tests/programs-add-semester.spec.ts: 0 tags for 2 tests | yes | fail |

## Ask vs guess

<!-- ask-vs-guess:start -->
Kept from the last machine that had IDE transcripts. This run is GitHub Actions, which has no Cursor session store.

Kept from the last machine that had IDE transcripts. This run is GitHub Actions, which has no Cursor session store.

Kept from the last machine that had IDE transcripts. This run is GitHub Actions, which has no Cursor session store.

| | |
| --- | --- |
| Asked | 5 |
| Invented a value | 2 |
| How measured | Session review of `/Users/jstarovska/.cursor/projects/Users-My-folder-Ucheba-ai-assisted-qa-automation/agent-transcripts` (70 transcript files). An ask is an `AskQuestion` call, or an assistant turn with no tool call that says it will not invent a value and tells the user to choose. A guess is a credential, email, or site assignment in a tool call whose value is not in the earlier transcript and not in `.env.example`. Values are not copied into this report. Cursor has no telemetry for this. |
| What it tells us | The agent stopped to ask 5 times and introduced 2 values that were not already in the prompt or `.env.example`. |

Asked:

- 4e44d0d6 line 3: AskQuestion
- b144ec56 line 39: from a shared module (no duplication).  Tell me which you prefer and I’ll apply it.  [REDACTED]
- b94ba541 line 40: not changed.  `locale` is still unset. Tell me which one to pin if you want date formatting locked as well.
- c77dd00c line 3: AskQuestion
- c77dd00c line 5: AskQuestion

Invented:

- a2f2befb line 13: invented `ATLASSIAN_EMAIL` (value omitted)
- e074503d line 6: invented `DIDAXIS_PASSWORD` (value omitted)
<!-- ask-vs-guess:end -->

## Top reliability risk

The masked-regression count is 1. It must be 0. Commit 2269635 is labeled as a heal and changes an `expect(` in `tests/`.

## Next action

A human reviews that assertion diff before any heal is treated as clean. If the new expectation is the acceptance criterion, record it as a test correction outside self-heal. If the old expectation was the one that should fail the product, revert the assertion. Do not open another heal that touches `expect(`.
