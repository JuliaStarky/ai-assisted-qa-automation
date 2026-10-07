---
name: jira-bug-reporter
description: Analyzes Playwright test failures, identifies root cause, and creates detailed Jira bug tickets. Use when a test fails and needs investigation and bug reporting.
---

# Jira Bug Reporter

Turn a Playwright failure into a Jira Bug linked to the original ticket, with steps, expected and actual results, the failing spec path, and screenshot evidence.

Each Bug must include a **title** (summary), **steps to reproduce**, **expected result**, **actual result**, **path to the failed test / source spec**, and **screenshot attachments** as evidence.

## Steps

Call getAccessibleAtlassianResources once. Reuse the returned cloudId on every Atlassian call. Pass cloudId as a top-level argument, never inside inputs.

Collect the failure from the Playwright output:

- assertion error and stack
- test title
- spec path (tests/*.spec.ts)
- browser and base URL from the run (do not read secrets)

Find the original ticket key from the test.describe name, the test title, or features/<KEY>.feature (for example DS-1). Fetch it with getJiraIssue and use its acceptance criteria for the expected result.

Decide the root cause before filing:

- Product defect — the app violated the ticket. File the Bug.
- Test, credentials, or environment — the spec, missing DIDAXIS_EMAIL / DIDAXIS_PASSWORD, or the environment failed. Explain that and stop. Do not create a product Bug.
- Duplicate — search first. If an open Bug already covers this failure, return that key and do not create another.

Create the Bug with createJiraIssue, then link it and attach screenshots.

Reply with the Bug key, URL, link to the original ticket, attached filenames, and a one-line root cause.

## Duplicate check

Search with searchJiraIssuesUsingJql before creating:

```
project = <PROJECT> AND issuetype = Bug AND issue in linkedIssues(<ORIGINAL-KEY>) AND statusCategory != Done ORDER BY created DESC
```

Reuse an open Bug whose summary or description matches this failure.

## Create the Bug

createJiraIssue:

- projectKey: prefix of the original key (DS-1 → DS)
- issueType: Bug
- summary: what failed, including the original key
- description: markdown template below
- contentFormat: markdown

The reporter is the authenticated Jira user. Never put passwords, tokens, or other .env values in the summary, description, or attachments.

```markdown
## Steps to reproduce

1. ...

## Expected result

...

## Actual result

...

## Failed test

- Path: `tests/<spec>.spec.ts`
- Test: <test title>
- Error: <assertion message>

## Environment

- URL: <base URL>
- Browser: <browser>
```

## Link to the original ticket

discover is not required for this operation name. Call executeWrite:

- name: createJiraIssueLink
- cloudId: the cached site id
- inputs.linkType: Relates
- inputs.inwardIssue: the new Bug key
- inputs.outwardIssue: the original ticket key

If Relates is rejected, call executeRead with name listJiraIssueLinkTypes and use that site's "relates to" type.

## Attach screenshots

playwright.config.ts saves a trace on first retry only. It does not save screenshots.

Use existing test-results/**/*.png from the failed run.

If none exist, re-run only the failed test:

```bash
npx playwright test <spec> -g "<exact test title>" --screenshot=only-on-failure
```

Attach each test-failed-*.png. Keep the spec path in the description as well.

Attach a file with executeWrite, name uploadAttachmentToJiraIssue:

- Phase 1: inputs { "issueIdOrKey": "<BUG-KEY>", "filePath": "<absolute png path>" }. Run the returned uploadCommand in the shell and keep the fileId.
- Phase 2: inputs { "issueIdOrKey": "<BUG-KEY>", "fileId": "<fileId>" }.

Do not change Playwright config or test code to capture the screenshot.
