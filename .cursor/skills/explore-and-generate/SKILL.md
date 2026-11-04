---
name: explore-and-generate
description: Explores the live Didaxis UI via the Playwright MCP, diffs the flows it supports against what tests/ already covers, and outputs a Gherkin test plan for the single highest-value untested flow. Use this skill whenever the user says "find what we're not testing", "explore <page> for untested flows", "expand coverage", "what's missing from our tests", "coverage gaps", or asks to discover new test scenarios without a ticket — even if they don't say "explore" or "Gherkin". Do NOT use it when a Jira ticket already exists (DS-1, DS-2, etc.) — that's jira-ticket-to-gherkin; this skill is only for when there is no ticket.
---

# Explore and Generate

Find a coverage gap by comparing the real UI against the existing suite, then hand the test-writer one reviewable Gherkin plan. One flow per run.

**Read-only exploration.** Do not edit `tests/`, `pages/`, `fixtures/`, or app source. Do not create, edit, or delete data in the app. Exploration stops at the last step before a persistent change (e.g. open the form, don't submit it). The only file written is the Gherkin plan.

## Steps

### 1. Map covered flows

Read every spec under `tests/` (skip `tests/manual/` and `tests/support/`) plus `features/*.feature`. Build a list of flows already covered, one line each: page/route → user action → asserted outcome. Note which spec covers it.

### 2. Crawl the target via the Playwright MCP

Use the `project-0-ai-assisted-qa-automation-playwright` namespace (inspect with `GetDynamicTools` first). If it's missing or needs auth, fall back to `cursor-ide-browser` and say so in the output.

- **Environment:** `DIDAXIS_URL` if set, else `https://test.didaxis.studio`. Sign in with `DIDAXIS_EMAIL` / `DIDAXIS_PASSWORD` from `.env`. If creds are missing, stop and tell the user — this skill needs the live app.
- Start at the page the user named (or the post-login landing page if none).
- Read structure with `browser_snapshot` (the accessibility tree), not screenshots. Roles, accessible names, states (disabled, expanded, checked), and headings are the source of truth.
- Follow links, menus, tabs, dialogs, and filters one level deep from the target page. Record the URL after each navigation.

### 3. Enumerate real user flows

From the a11y tree, list every flow the UI actually supports on the target: navigation, create/edit/delete entry points, search/filter/sort, pagination, empty and error states, form validation, keyboard paths, dialogs (confirm/cancel). Only list flows backed by an element you saw — no guesses.

### 4. Diff to find the gap

Compare step 3 against step 1. Mark each flow as covered, partially covered (exercised but key outcome not asserted), or uncovered.

### 5. Pick one flow

Choose the single highest-value uncovered (or partially covered) flow. Rank by:

1. User impact if it breaks (data loss, blocked core task > cosmetic)
2. Likelihood of regression (complex state, validation, multi-step)
3. Testability (deterministic, no external dependency)

State the pick and the reason in one or two sentences. List the runners-up so the next run can pick them up.

### 6. Output a Gherkin test plan

- One Feature named after the flow
- `# Happy path` — one positive Scenario
- `# Edge case` — one edge Scenario (boundary, empty, cancel, invalid input, special characters)
- Given = starting state, When = action, Then = observable outcome
- **Every Then must be assertable** by Playwright: a visible role/name, URL, text captured during recon, count, or element state. No "works correctly", "looks right", or invented copy.
- Use real labels and values seen in the a11y tree — never placeholders

Append comment blocks at the end, in this order:

1. `# Exploration (<ISO date>)` — env URL, tool used, routes visited, locator hints (`getByRole('button', { name: '…' })` style, no CSS/XPath)
2. `# Coverage diff` — covered / partial / uncovered flows with the covering spec for each covered one
3. `# Why this flow` — the pick reason and the runners-up

## Output

Save as `features/explore-<page-slug>.feature` (e.g. `features/explore-programs.feature`). If the file exists, append a new Feature rather than overwriting.

Report the file path, the chosen flow and why, and the runners-up. The plan is ready for the test-writer subagent once a human reviews it.
