# Test Plan: Program List Filtering and Display

**Feature:** Program list filtering and display  
**Ticket:** DS-5  
**Scope:** Programs page — program list (name, description), empty state, find/manage programs

---

## Positive flows

### TC-001 — List shows each program name and description

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. At least two programs exist, e.g. **Web Development 2026** (`Full-stack web development program`) and **Data Science Fundamentals** (`Introductory data science track`). |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Review the program list.

**Expected result**

Each program row (or card) shows its **name** and **description** matching stored data.

**Gherkin**

```gherkin
Scenario: Display program list with key details
  Given programs exist in the system
  When I navigate to the Programs page
  Then I see a list showing each program's name and description
```

---

### TC-002 — Empty state message and create-first-program prompt

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. No programs exist in the system. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.

**Expected result**

A message indicates no programs have been created. A prompt or action invites the user to create the first program (e.g. **+ New Program** or equivalent CTA in empty state).

**Gherkin**

```gherkin
Scenario: Empty state when no programs exist
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I see a prompt to create the first program
```

---

### TC-003 — All existing programs appear in the list

| Field | Value |
|-------|--------|
| **Preconditions** | Programs **Web Development 2026**, **Mobile Development 2026**, and **Cybersecurity Bootcamp** exist with distinct descriptions. |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page.
2. Count and identify listed programs.

**Expected result**

All three programs appear with correct names and descriptions; none are missing from the list.

**Gherkin**

```gherkin
Scenario: Complete program catalog visible
  Given programs "Web Development 2026", "Mobile Development 2026", and "Cybersecurity Bootcamp" exist
  When I navigate to the Programs page
  Then I see "Web Development 2026" with its description
  And I see "Mobile Development 2026" with its description
  And I see "Cybersecurity Bootcamp" with its description
```

---

### TC-004 — Empty-state create prompt opens program creation

| Field | Value |
|-------|--------|
| **Preconditions** | No programs exist. User is logged in as admin. |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page.
2. Use the empty-state prompt to create the first program (click CTA).
3. Complete create for **Test Program** with description **First program**.

**Expected result**

Creation flow opens from empty state. After save, list shows **Test Program** instead of empty state.

**Gherkin**

```gherkin
Scenario: Create first program from empty state
  Given no programs exist
  When I navigate to the Programs page
  And I follow the prompt to create the first program
  And I create "Test Program" with description "First program"
  Then the program list shows "Test Program" and its description
  And I do not see the empty-state-only message as the sole content
```

---

### TC-005 — List refreshes after new program is created elsewhere in session

| Field | Value |
|-------|--------|
| **Preconditions** | User is on Programs page with **Web Development 2026** listed. |
| **Priority** | Medium |

**Steps**

1. Create **Cloud Engineering 2026** via **+ New Program** (or return to list after create).
2. View the list.

**Expected result**

**Cloud Engineering 2026** appears with its description alongside existing programs.

**Gherkin**

```gherkin
Scenario: List includes newly created program
  Given I am on the Programs page
  And "Web Development 2026" is listed
  When I create "Cloud Engineering 2026" with description "Cloud fundamentals"
  And I view the Programs page
  Then I see "Cloud Engineering 2026" with description "Cloud fundamentals"
  And I see "Web Development 2026"
```

---

## Negative flows

### TC-006 — Empty state does not show program rows

| Field | Value |
|-------|--------|
| **Preconditions** | No programs exist. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.

**Expected result**

No program name/description rows are shown; only empty state (and allowed chrome such as header/**+ New Program**).

**Gherkin**

```gherkin
Scenario: No phantom programs on empty list
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I do not see any program name or description rows
```

---

### TC-007 — Non-admin empty or populated list follows access rules

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as non-admin. Programs may or may not exist per role policy. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.

**Expected result**

User sees only programs they are allowed to view, or access denied/redirect—not an admin-only empty state with create prompt if they cannot create programs.

**Gherkin**

```gherkin
Scenario: Non-admin program list access
  Given I am logged in as a non-admin user
  When I navigate to the Programs page
  Then I see programs I am permitted to view or an appropriate access restriction
  And I do not see a create-first-program prompt if I am not allowed to create programs
```

---

### TC-008 — Failed load does not show false empty state

| Field | Value |
|-------|--------|
| **Preconditions** | Programs exist; simulate API/list load failure in test environment. |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page when list API fails.

**Expected result**

Error or retry state is shown—not “no programs have been created” when programs actually exist.

**Gherkin**

```gherkin
Scenario: List load error is not shown as empty catalog
  Given programs exist in the system
  And the program list cannot be loaded
  When I navigate to the Programs page
  Then I see an error or retry message
  And I do not see the empty-state message for zero programs
```

---

### TC-009 — Deleted program no longer appears in list

| Field | Value |
|-------|--------|
| **Preconditions** | **Test Program** and **Web Development 2026** exist. **Test Program** is deleted (DS-4). |
| **Priority** | Medium |

**Steps**

1. Navigate to or refresh the Programs page.

**Expected result**

**Test Program** is absent; **Web Development 2026** still shows name and description.

**Gherkin**

```gherkin
Scenario: List reflects deleted program removal
  Given "Test Program" was deleted
  And "Web Development 2026" still exists
  When I navigate to the Programs page
  Then I do not see "Test Program" in the list
  And I see "Web Development 2026" with its description
```

---

## Edge cases

### TC-010 — Long program name and description display correctly

| Field | Value |
|-------|--------|
| **Preconditions** | Program exists with a 255-character name and a long multi-sentence description. |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page.
2. Locate the program in the list.

**Expected result**

Name and description are readable (wrap, truncate with expand/tooltip, or full text per design) without breaking layout.

**Gherkin**

```gherkin
Scenario: Long name and description in list
  Given a program with a 255-character name and a long description exists
  When I navigate to the Programs page
  Then I see that program's name and description in the list
  And the list layout remains usable
```

---

### TC-011 — Special characters render correctly in list

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Informatique & IA - Niveau 2** exists with description `Notes: "quotes", <tags>, émojis 🎓`. |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page.

**Expected result**

Name and description display as intended; no HTML injection or broken encoding.

**Gherkin**

```gherkin
Scenario: Special characters in list display
  Given a program "Informatique & IA - Niveau 2" exists with a description containing quotes and symbols
  When I navigate to the Programs page
  Then I see "Informatique & IA - Niveau 2" in the list
  And the description is displayed correctly and safely
```

---

### TC-012 — Program with empty description still shows name

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Cybersecurity Bootcamp** exists with empty **Description** (if allowed by product). |
| **Priority** | Low |

**Steps**

1. Navigate to the Programs page.

**Expected result**

**Cybersecurity Bootcamp** appears; description area shows empty placeholder, em dash, or “No description”—consistent with design.

**Gherkin**

```gherkin
Scenario: Empty description in list row
  Given a program "Cybersecurity Bootcamp" exists with an empty description
  When I navigate to the Programs page
  Then I see "Cybersecurity Bootcamp" in the list
  And the description is shown according to product rules for empty values
```

---

### TC-013 — Large number of programs in list

| Field | Value |
|-------|--------|
| **Preconditions** | 50+ programs exist (seed data). |
| **Priority** | Low |

**Steps**

1. Navigate to the Programs page.
2. Scroll or paginate through the list.

**Expected result**

All programs remain discoverable (pagination, virtual scroll, or scrollable list); each visible row shows name and description; performance acceptable.

**Gherkin**

```gherkin
Scenario: Many programs in list
  Given at least 50 programs exist in the system
  When I navigate to the Programs page
  Then I can view all programs through scrolling or pagination
  And each visible program shows its name and description
```

---

### TC-014 — Filter or search narrows list (if filtering UI exists)

| Field | Value |
|-------|--------|
| **Preconditions** | **Web Development 2026** and **Data Science Fundamentals** exist. Programs page has search/filter control (feature title). |
| **Priority** | Medium |

**Steps**

1. Navigate to the Programs page.
2. Enter `Web Development` in search/filter (if present).
3. Observe the list.

**Expected result**

Only matching programs (e.g. **Web Development 2026**) are shown with name and description; non-matching rows hidden until filter cleared.

**Gherkin**

```gherkin
Scenario: Filter programs by name text
  Given programs "Web Development 2026" and "Data Science Fundamentals" exist
  And the Programs page provides a filter or search for programs
  When I filter by "Web Development"
  Then I see "Web Development 2026" with its description
  And I do not see "Data Science Fundamentals"
```

---

### TC-015 — Filter with no matches shows appropriate empty result

| Field | Value |
|-------|--------|
| **Preconditions** | At least one program exists. Filter/search UI exists. |
| **Priority** | Low |

**Steps**

1. Apply filter text `ZZZ-No-Match-999`.
2. Review the list.

**Expected result**

No program rows match; message indicates no results for filter—not the global “no programs created” empty state unless design conflates them (document actual behavior).

**Gherkin**

```gherkin
Scenario: No filter matches
  Given programs exist in the system
  And the Programs page provides a filter or search for programs
  When I filter by "ZZZ-No-Match-999"
  Then I see no program rows matching the filter
  And I see a no-results message or cleared filter guidance
```

---

### TC-016 — Duplicate display names remain distinguishable in list

| Field | Value |
|-------|--------|
| **Preconditions** | If duplicates can exist, two programs share display name but differ by ID/description (policy-dependent). |
| **Priority** | Low |

**Steps**

1. Navigate to the Programs page.

**Expected result**

Admin can distinguish entries (description, ID, or sublabel); list does not hide duplicates ambiguously.

**Gherkin**

```gherkin
Scenario: Distinguishable duplicate names in list
  Given two programs exist with the same display name and different descriptions
  When I navigate to the Programs page
  Then I see both programs with their names and descriptions
  And I can tell them apart in the list
```

---

## AC coverage matrix

| Acceptance criteria scenario | Test case(s) |
|-----------------------------|--------------|
| Display program list with key details | TC-001 |
| Empty state when no programs exist | TC-002 |

---

## Ambiguities and gaps in acceptance criteria

1. **Stray ticket text** — `DS-5_input.md` includes DS-3/DS-4 user stories; plan uses list/display scenarios only.
2. **Filtering** — Task title mentions filtering; ACs only cover full list and empty state (TC-014, TC-015 conditional on UI).
3. **Sort order** — Order of programs (alphabetical, created date) not specified (TC-003).
4. **Admin role** — User story says admin; scenarios omit explicit login (TC-007 for other roles).
5. **Empty description** — How list renders missing description not in ACs (TC-012).
6. **Empty state vs zero filter results** — Different messages not defined (TC-015).
7. **Pagination / performance** — Large lists not in ACs (TC-013).
8. **Loading state** — Skeleton/spinner while fetching not specified.
9. **Additional columns** — Actions (edit/delete), dates, status not required by AC but affect “manage” goal.
10. **Exact copy** — Wording of empty message and create prompt not fixed in ACs.
