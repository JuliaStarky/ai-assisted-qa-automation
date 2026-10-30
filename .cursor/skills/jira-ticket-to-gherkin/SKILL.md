---
name: jira-ticket-to-gherkin
description: Turns a Jira ticket's acceptance criteria into structured, reviewable Gherkin test scenarios. Use this skill whenever the user references a Jira ticket (DS-1, DS-2, etc.) and asks for test cases, a test plan, scenarios, or wants to plan testing for a ticket — even if they don't say the word "Gherkin".
---

# Jira Ticket to Gherkin Test Cases

Generate reviewable test scenarios from a Jira ticket. The Gherkin output is a human-readable checkpoint — the QA reviews it before any Playwright code gets written.

## Steps

### 1. Read the Jira ticket

Using the Atlassian MCP, extract the title, description, and every acceptance criterion (see **Jira access** below).

### 2. Live UI recon

When `DIDAXIS_EMAIL` and `DIDAXIS_PASSWORD` are available (e.g. in `.env`), exercise the real app for the flows the ticket describes **before** writing final scenarios.

**Environment:** `DIDAXIS_URL` if set; otherwise `https://test.didaxis.studio` (same default as `fixtures/didaxis.helpers.ts`).

**Tool chain (use the first option that works; note which one in the UI recon block):**

1. **Playwright MCP** — `project-0-ai-assisted-qa-automation-playwright` (inspect with `GetDynamicTools`; skip if the namespace is missing or needs auth)
2. **Browser MCP** — `cursor-ide-browser` (`browser_navigate` → `browser_lock` → interact → `browser_snapshot` → unlock)
3. **agent-browser CLI** — shell-driven navigation/snapshots when neither MCP is available (`agent-browser` on PATH)
4. **Playwright CLI** — headed exploration from the repo root, e.g. `npx playwright open "$DIDAXIS_URL"` or `npx playwright codegen "$DIDAXIS_URL/login"` (load `.env` so URL and creds apply)

Do not skip recon when creds exist unless the user explicitly asks for Jira-only planning.

**Recon checklist:**

- Sign in as admin (email/password fields → submit; confirm post-login landing).
- Navigate to every page, control, or flow mentioned in the ACs; use snapshots to capture structure and labels.
- Record URL after each navigation, visible headings, card/link/button labels, and whether actions succeed or fail.
- Note locator-friendly hints for automation (`getByRole('link', { name: '…' })`, headings, etc.) — no CSS/XPath.
- Compare observations to Jira: if the app behaves differently from ACs, reflect reality in scenarios and call it out under ambiguities or as a suspected defect.

**If creds are missing:** skip live recon. Still produce Gherkin from Jira; the UI recon block must say recon was skipped and why.

### 3. Generate Gherkin

Write scenarios informed by **both** Jira and recon (when run):

- One Feature, named after the ticket
- Cover every acceptance criterion with at least one Scenario
- Add negative scenarios — what should NOT happen
- Add edge-case scenarios — boundaries, empty inputs, duplicates, special characters, max length
- For a programs list, create, edit, or delete flow, add one scenario per deterministic API case: save returns 503, the list returns 200 with an empty list, the list returns 200 with a malformed body, and the list or save returns 401, 403, 404, 501, 502, or 300. Name the UI outcome (error state, empty state, or the page stays usable). Put the exact message in the Then step only when UI recon captured it. If recon shows nothing rendered, the scenario says that. Do not invent copy.
- Given / When / Then: Given = starting state, When = action, Then = observable outcome
- Group with comments: `# Happy paths`, `# Negative`, `# Edge cases`
- Use real, specific values from the ticket and recon — never placeholders

**Comment blocks at end of file (in this order):**

1. `# UI recon (<ISO date>)` — bullets: env URL, login result, routes tested, labels seen, broken behavior, locator hints; or one line that recon was skipped
2. `# Ambiguities and gaps` — ticket gaps, recon vs AC mismatches, open questions for QA

## Output

Save as `features/<ticket-key>.feature`.

## Jira access (Atlassian MCP)

- Parse ticket keys from the user message (e.g. `DS-1`).
- Call `getAccessibleAtlassianResources` once if needed for `cloudId`, then `getJiraIssue`.
- Request summary and description; include acceptance-criteria custom fields when the site exposes them. If ACs are only in the description, extract numbered or bulleted criteria from that text.

After saving, report the file path, scenario counts by group (happy / negative / edge), and whether UI recon ran or was skipped.
