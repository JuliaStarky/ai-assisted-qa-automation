---
name: jira-ticket-to-gherkin
description: Turns a Jira ticket's acceptance criteria into structured, reviewable Gherkin test scenarios. Use this skill whenever the user references a Jira ticket (DS-1, DS-2, etc.) and asks for test cases, a test plan, scenarios, or wants to plan testing for a ticket — even if they don't say the word "Gherkin".
---

# Jira Ticket to Gherkin Test Cases

Generate reviewable test scenarios from a Jira ticket. The Gherkin output is a human-readable checkpoint — the QA reviews it before any Playwright code gets written.

## Steps

Read the referenced Jira ticket using the Atlassian MCP. Extract the title, description, and every acceptance criterion.

Generate test scenarios as a Gherkin .feature file:

- One Feature, named after the ticket
- Cover every acceptance criterion with at least one Scenario
- Add negative scenarios — what should NOT happen
- Add edge-case scenarios — boundaries, empty inputs, duplicates, special characters, max length
- Write each scenario in Given / When / Then form. Given sets the starting state, When is the action under test, Then is the observable expected outcome.

Group scenarios with comments: `# Happy paths`, `# Negative`, `# Edge cases`.

Use real, specific values from the ticket — never placeholders.

End the file with a comment block listing any ambiguities or gaps found in the ticket's acceptance criteria, so the QA can resolve them.

## Output

Save as `features/<ticket-key>.feature`.

## Jira access (Atlassian MCP)

- Parse ticket keys from the user message (e.g. `DS-1`).
- Call `getAccessibleAtlassianResources` once if needed for `cloudId`, then `getJiraIssue`.
- Request summary and description; include acceptance-criteria custom fields when the site exposes them. If ACs are only in the description, extract numbered or bulleted criteria from that text.

After saving, report the file path and scenario counts by group (happy / negative / edge).
