---
name: self-heal
description: >
  Heals one drifted Playwright locator in its Page Object and opens a PR once
  the suite is green with assertions unchanged. Use when the user says "the
  build is red because a locator broke", "fix the drifted selector", "the test
  broke after a UI change", or "heal the suite". Use it ONLY after triage
  classifies the red run as a test issue (drift), never for a real app bug.
---

# Self-heal

One repair per run. Every heal becomes a PR. Patch the POM locator only. Follow [pom-conventions](../pom-conventions/SKILL.md): `getByRole` first, then label / placeholder / text. No CSS, XPath, or `.first()`.

## Steps

### 1. Require triage's drift classification, else stop and route to bug-reporter

Read triage's diagnosis for this red run (delegate to the triage subagent if none exists yet; it follows [ci-failure-triage](../ci-failure-triage/SKILL.md)).

Proceed only when the classification is **test issue (drift)**: the element is still in the product, and the accessible name or role moved so the POM locator no longer matches.

Stop and route to bug-reporter when the classification is anything else — a real app bug, a missing element, env/flake, or an assertion that describes wrong product behavior. Do not patch.

### 2. From the trace, find the failing locator and its POM

From the Playwright error and trace (`npx playwright show-trace <trace.zip>`, or the log's locator line):

- failing spec path and test title
- the locator string that timed out or resolved the wrong node
- the `pages/` method or readonly locator that owns it

Do not treat a spec assertion as the repair target.

### 3. Re-discover the element via the Agent-Browser a11y tree by its role + current accessible name

Sign in with `DIDAXIS_EMAIL` / `DIDAXIS_PASSWORD` against `DIDAXIS_URL` (else `https://test.didaxis.studio`). Open the page the failing step was on, then:

```bash
agent-browser snapshot
```

In that accessibility tree, find the same control by **role** and its **current accessible name**. Record `getByRole('<role>', { name: '<accessible name>' })` (add `exact` or `.filter({ hasText })` only when the tree shows duplicates). If creds or `agent-browser` are missing, stop — do not guess a selector.

### 4. Patch the locator in the POM, minimal role-based diff, never the spec's assertions

Change only that one locator in `pages/`. Leave `tests/` assertions, feature files, and every other locator untouched. If the heal needs an assertion edit, stop: that is not drift.

### 5. Re-run and prove green WITH assertions unchanged

```bash
npx playwright test <failing-spec>
```

Confirm `git diff` shows no edits under `tests/`. Green via a weakened assertion is a bug — escalate to bug-reporter and revert the POM patch. A second identical failure stops the run (loop guard); do not attempt a second repair.

### 6. Report the old→new locator diff + the green run

Open one PR (`gh pr create`) whose body contains:

- old locator → new locator (file and line)
- role + accessible name from the Agent-Browser snapshot
- triage classification (test issue / drift) and the run or trace you healed
- the green `npx playwright test` result, and that assertions were not changed

Title: `heal: <POM file> <old role/name> → <new role/name>`.
