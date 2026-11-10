# AI-assisted QA automation

Playwright tests for Didaxis. `tests/auth.setup.ts` signs in once and saves `playwright/.auth/user.json`. The chromium project reuses that `storageState`. Page objects live in `pages/`.

| Path | Role |
| --- | --- |
| `tests/auth.setup.ts` | Signs in once and writes `playwright/.auth/user.json` |
| `playwright/.auth/user.json` | Saved `storageState` the chromium project reuses |
| `pages/` | Page objects |
| `features/` | Gherkin plans, one file per ticket (`<key>.feature`) |
| `.cursor/` | Rules, agents, and skills Cursor loads for this repo |
| `.github/workflows/` | CI: E2E runs and headless test generation |

## Install

Node 20, the version CI uses.

```bash
npm ci
npx playwright install --with-deps chromium
```

## Configure

```bash
cp .env.example .env
```

`playwright.config.ts` loads `.env`, and `.env` is gitignored. Fill in the **Run tests** variables before `npx playwright test`. The Agent / CI variables are for `.github/workflows/test-generation.yml`. In the IDE, Atlassian MCP tokens go in Cursor settings.

| Variable | Required for | Purpose |
| --- | --- | --- |
| `DIDAXIS_URL` | `npx playwright test` | Didaxis host the suite opens |
| `DIDAXIS_EMAIL` | `npx playwright test` | Admin account used by `tests/auth.setup.ts` |
| `DIDAXIS_PASSWORD` | `npx playwright test` | Password for `DIDAXIS_EMAIL` |
| `DIDAXIS_API_TOKEN` | `npx playwright test` | Bearer token for `DELETE /api/programs` |
| `DIDAXIS_ALT_EMAIL` | Permission probes | Second account; the default suite does not read it |
| `DIDAXIS_ALT_PASSWORD` | Permission probes | Password for `DIDAXIS_ALT_EMAIL` |
| `CURSOR_API_KEY` | Headless agent | API key for `agent -p` in test generation |
| `ATLASSIAN_API_TOKEN` | Headless agent | Atlassian token for the agent and the MCP server |
| `ATLASSIAN_BASE_URL` | Headless agent | Site origin; the workflow secret is `ATLASSIAN_SITE_URL` |
| `ATLASSIAN_EMAIL` | Headless agent | Account email paired with `ATLASSIAN_API_TOKEN` |

## Run tests

```bash
npm test
```

Each test carries exactly one tag on `test()`.

| Script | What it runs |
| --- | --- |
| `npm test` | Full suite |
| `npm run test:smoke` | `@smoke` |
| `npm run test:sanity` | `@sanity` |
| `npm run test:regression` | `@regression` |
| `npm run test:api` | `@api` |
| `npm run test:e2e` | `@e2e` |
| `npm run test:destructive` | `@destructive`, with `--workers=1` |
| `npm run test:a11y` | Accessibility specs |
| `npm run test:headed` | Suite in a visible browser |
| `npm run test:ui` | Playwright UI mode |
| `npm run report` | HTML report |
| `npm run test:manual:programs` | Programs API maintenance; stays out of `npm test` |

| Tag | When to use it |
| --- | --- |
| `@smoke` | Fast check of a core path |
| `@sanity` | Broader confidence run |
| `@regression` | Coverage beyond smoke and sanity |
| `@api` | API-level checks |
| `@e2e` | End-to-end UI flows |
| `@destructive` | The test changes locale, roles, flags, or settings, and restores the previous value in `afterEach` or `afterAll` |

A test that only creates and deletes its own program keeps `@smoke`, `@sanity`, `@regression`, `@api`, or `@e2e`.

## Agents and skills

| Kind | Files |
| --- | --- |
| Rules | `constitution.mdc` (always on), `playwright-conventions.mdc`, `qa-orchestration.mdc` |
| Agents | `test-writer`, `triage`, `bug-reporter` |
| Skills | `jira-ticket-to-gherkin`, `explore-and-generate`, `pom-conventions`, `api-cleanup`, `a11y-checks`, `ci-failure-triage`, `self-heal`, `jira-bug-reporter` |

| Step | What happens |
| --- | --- |
| Ticket | A Jira ticket (`DS-1`, `DS-2`, …) becomes `features/<key>.feature` |
| Spec | `test-writer` writes the Playwright spec from that plan |
| Red run | `triage` classifies the failure |
| Locator drift | Healed in the page object |
| Product bug | Left as a product bug; the test is not patched |

## CI

| Workflow | Trigger | Command |
| --- | --- | --- |
| `.github/workflows/e2e.yml` | Pull request | `npm run test:smoke` |
| `.github/workflows/e2e.yml` | Push | `npm run test:sanity` |
| `.github/workflows/e2e.yml` | Manual **E2E Tests** | `npm test` |
| `.github/workflows/test-generation.yml` | Schedule or manual | Headless Cursor agent (`agent -p`) over the Jira backlog, then `eval-report.md` |

E2E jobs use the Run tests secrets (`DIDAXIS_URL`, `DIDAXIS_EMAIL`, `DIDAXIS_PASSWORD`, `DIDAXIS_API_TOKEN`). Test generation also needs the Agent / CI values (`CURSOR_API_KEY`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_EMAIL`, `ATLASSIAN_SITE_URL`).
