---
name: exploratory-charter
description: Turns a feature and a risk into an exploratory charter and an empty findings template. The thinking is human; the skill just keeps the format. Use when the user asks for an exploratory charter, a session charter, or a findings template from a feature and a risk. Do not use it to crawl the UI, invent tests, fill findings, write Gherkin, or write a Playwright spec — coverage gaps are explore-and-generate, and a Jira ticket is jira-ticket-to-gherkin.
---

# Exploratory charter

The thinking is human; the skill just keeps the format.

A feature and a risk go in. A charter and a blank findings template come out. Copy the user's words into the matching cells. Leave every other cell empty.

## When to apply

The user names a feature and a risk and wants a charter, a session charter, or a findings sheet.

Do not apply when they want coverage gaps, a Gherkin plan, or a spec.

## Procedure

1. Take the feature and the risk from the message. If either is missing, ask for that one item and stop.
2. Reply with the two blocks below. Paste the feature into **Explore** and the risk into **To discover**.
3. Leave **With**, **Time box**, and every findings cell empty. If the user already named a resource, a time box, or a finding, copy that text into the matching cell and leave the rest empty.
4. Stop. Do not open the app, suggest tests, rank risks, or file a bug.

Deliver the blocks in the reply. Write a file only if the user asks for one.

## Charter

| | |
| --- | --- |
| Explore | |
| With | |
| To discover | |
| Time box | |

## Findings

| Field | Entry |
| --- | --- |
| Charter | |
| Tester | |
| Duration | |
| Bugs | |
| Questions | |
| Observations | |
| Follow-up charters | |

The Charter cell repeats one line: `Explore <feature> to discover <risk>`.

## Example

Input: feature `program name`, risk `a duplicate name is saved`.

| | |
| --- | --- |
| Explore | program name |
| With | |
| To discover | a duplicate name is saved |
| Time box | |

| Field | Entry |
| --- | --- |
| Charter | Explore program name to discover a duplicate name is saved |
| Tester | |
| Duration | |
| Bugs | |
| Questions | |
| Observations | |
| Follow-up charters | |
