# Test Plan: Edit Existing Program Details

**Feature:** Edit existing program details  
**Ticket:** DS-2 — *Edit existing program details* (Jira)  
**Scope:** Programs page (`/programs`) — row actions open **Edit Program** modal (Mantine `section`, not `role="dialog"`). Editable fields observed in test: **Program Name \***, **Description**, **Total Program Hours**, **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, plus **▸ Show AI Generation Config**. Primary actions: **Cancel**, **Save**. Row actions use accessible names **`Edit {program name}`** and **`Delete {program name}`** (icon buttons).

---

## Positive flows

### TC-001 — Edit form shows current program data

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Web Development 2026** exists on the Programs page with known Name and Description values. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Confirm **Web Development 2026** is listed.
3. Click **`Edit Web Development 2026`** on that row.

**Expected result**

The **Edit Program** modal opens. **Program Name** and **Description** match the program’s stored values. **Default Session Hours** and **Default Exam Hours** show the program defaults (e.g. `4` and `3` when not customized on create). Other extended fields reflect stored values or empty defaults.

**Gherkin**

```gherkin
Scenario: Open program for editing
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I click "Edit Web Development 2026"
  Then I see the Edit Program form pre-populated with the program's current data
```

---

### TC-002 — Updated program name appears in list after save

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and is editing **Web Development 2026**. |
| **Priority** | High |

**Steps**

1. Change **Program Name** to `Web Development 2026 - Updated`.
2. Click **Save**.

**Expected result**

The modal closes. The program list immediately shows **Web Development 2026 - Updated** and no longer shows **Web Development 2026** as the display name for that program.

**Gherkin**

```gherkin
Scenario: Successfully edit a program name
  Given I am editing "Web Development 2026"
  When I change the Name to "Web Development 2026 - Updated"
  And I click Save
  Then the modal closes
  And the program list immediately shows "Web Development 2026 - Updated"
```

---

### TC-003 — Unchanged fields stay the same when only description is edited

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program exists with Name `Data Science Fundamentals` and Description `Introductory data science track`. Edit form is open for that program. |
| **Priority** | High |

**Steps**

1. Note **Program Name**, **Default Session Hours**, **Default Exam Hours**, **Total Program Hours**, **Target Audience**, and **Focus Areas**.
2. Change **Description** to `Updated curriculum for 2026 cohort`.
3. Click **Save**.

**Expected result**

The modal closes. **Program Name** remains `Data Science Fundamentals`. **Description** reflects the new text. **Default Session Hours**, **Default Exam Hours**, and other unchanged fields match their pre-edit values.

**Gherkin**

```gherkin
Scenario: Edit preserves unchanged fields
  Given I am editing a program
  When I only change the Description
  And I click Save
  Then the Name and other fields remain unchanged
```

---

### TC-004 — Edit both name and description in one save

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Mobile Development 2026** exists. |
| **Priority** | Medium |

**Steps**

1. Open edit for **Mobile Development 2026**.
2. Set **Program Name** to `Mobile Development 2026 - Advanced`.
3. Set **Description** to `iOS and Android track with capstone project`.
4. Click **Save**.

**Expected result**

List shows **Mobile Development 2026 - Advanced** with the updated description persisted on reopen.

**Gherkin**

```gherkin
Scenario: Update name and description together
  Given I am editing "Mobile Development 2026"
  When I change the Name to "Mobile Development 2026 - Advanced"
  And I change the Description to "iOS and Android track with capstone project"
  And I click Save
  Then the modal closes
  And the program list shows "Mobile Development 2026 - Advanced"
  And reopening edit shows Description "iOS and Android track with capstone project"
```

---

### TC-005 — Dismiss edit form without saving changes

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **Web Development 2026** with original data loaded. |
| **Priority** | Medium |

**Steps**

1. Change **Program Name** to `Should Not Persist`.
2. Click **Cancel** without **Save**.

**Expected result**

Modal closes. List still shows **Web Development 2026** with original description.

**Gherkin**

```gherkin
Scenario: Cancel edit discards unsaved changes
  Given I am editing "Web Development 2026"
  When I change the Name to "Should Not Persist"
  And I dismiss the edit form without clicking Save
  Then the modal closes
  And the program list shows "Web Development 2026"
  And the program list does not show "Should Not Persist"
```

---

## Negative flows

### TC-006 — Empty name cannot be saved

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing an existing program. |
| **Priority** | High |

**Steps**

1. Clear the **Program Name** field completely.
2. Attempt to click **Save**.

**Expected result**

**Save** is **disabled** (observed in test env). Original program name remains in the list after **Cancel**.

**Gherkin**

```gherkin
Scenario: Empty program name on edit is rejected
  Given I am editing a program
  When I clear the Name field
  Then the Save button is disabled or I see a validation message
  And the program list still shows the original program name
```

---

### TC-007 — Whitespace-only name is rejected on save

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **Cybersecurity Bootcamp**. |
| **Priority** | High |

**Steps**

1. Replace **Program Name** with `   ` (spaces only).
2. Attempt **Save**.

**Expected result**

**Save** is **disabled**; list still shows **Cybersecurity Bootcamp**.

**Gherkin**

```gherkin
Scenario: Whitespace-only name on edit is rejected
  Given I am editing "Cybersecurity Bootcamp"
  When I change the Name to "   "
  And I attempt to click Save
  Then the Save button is disabled or validation prevents save
  And the program list shows "Cybersecurity Bootcamp"
```

---

### TC-008 — Non-admin cannot edit program details

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as non-admin. Program **Web Development 2026** exists. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Look for edit control on **Web Development 2026**.

**Expected result**

**Edit {program name}** is hidden, disabled, or opening edit is denied. Program data cannot be changed via UI.

**Gherkin**

```gherkin
Scenario: Non-admin cannot edit programs
  Given I am logged in as a non-admin user
  And a program "Web Development 2026" exists
  When I navigate to the Programs page
  Then I do not see an enabled edit action for "Web Development 2026"
  And I cannot save changes to that program
```

---

### TC-009 — Renaming to an existing program name is allowed (current product behavior)

| Field | Value |
|-------|--------|
| **Preconditions** | Two distinct programs exist with different names. User edits the second program. |
| **Priority** | Low |

**Steps**

1. Change **Program Name** to match the first program’s name exactly.
2. Click **Save**.

**Expected result**

Save succeeds with no duplicate-name error (observed in test env). The list may show **two rows** with the same display name; rows remain distinguishable by description or internal identity.

**Gherkin**

```gherkin
Scenario: Duplicate display name on edit is allowed
  Given two programs with different names exist
  When I rename the second program to match the first program's name
  And I click Save
  Then the modal closes
  And the program list contains two rows with that display name
  And I do not see a duplicate-name validation message
```

---

### TC-010 — Save fails when session expired

| Field | Value |
|-------|--------|
| **Preconditions** | User opened edit while logged in as admin; session expires before save. |
| **Priority** | Medium |

**Steps**

1. Modify **Description** to `Session expiry test`.
2. Click **Save** after session expiry.

**Expected result**

Auth error or redirect to login. Changes are not silently persisted; list shows pre-edit data after re-login (unless product defines offline queue—then user must be notified).

**Gherkin**

```gherkin
Scenario: Expired session blocks program edit save
  Given I am editing a program
  And I change the Description to "Session expiry test"
  And my admin session has expired
  When I click Save
  Then I am prompted to log in again
  And the program list does not show "Session expiry test" until a successful authenticated save
```

---

### TC-011 — Save with no changes does not corrupt data

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **Web Development 2026** with original values loaded. |
| **Priority** | Low |

**Steps**

1. Open edit form without changing any field.
2. Click **Save**.

**Expected result**

Modal closes (or save is no-op). List still shows **Web Development 2026** with unchanged description; no duplicate rows or errors.

**Gherkin**

```gherkin
Scenario: Save without modifications
  Given I am editing "Web Development 2026"
  When I click Save without changing any fields
  Then the modal closes or I remain on a valid state
  And the program list shows "Web Development 2026" unchanged
```

---

## Edge cases

### TC-012 — Name at maximum allowed length after edit

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing a program; max **Name** length is 255 characters (assumed if unspecified). |
| **Priority** | Medium |

**Steps**

1. Set **Program Name** to a string of exactly 255 characters (unique suffix recommended so list lookup stays unambiguous).
2. Click **Save**.

**Expected result**

Save succeeds; list displays the full 255-character name.

**Gherkin**

```gherkin
Scenario: Edit name to max length
  Given I am editing a program
  When I change the Name to a string of 255 characters
  And I click Save
  Then the modal closes
  And the program list shows the program with the 255-character name
```

---

### TC-013 — Name at 256 characters is accepted (no client max-length guard)

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing an existing program. |
| **Priority** | Medium |

**Steps**

1. Set **Program Name** to 256 characters.
2. Click **Save**.

**Expected result**

**Save** remains enabled and save succeeds in test env (no max-length message). List shows the updated 256-character name. *Product gap: server/UI max length not enforced on edit.*

**Gherkin**

```gherkin
Scenario: Edit name to 256 characters succeeds without validation
  Given I am editing a program
  When I change the Program Name to a string of 256 characters
  And I click Save
  Then the modal closes
  And the program list shows the 256-character name
```

---

### TC-014 — Special characters in edited name and description

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **QA Program Pilot**. |
| **Priority** | Medium |

**Steps**

1. Set **Name** to `QA & Testing — Cohort #1 (2026)`.
2. Set **Description** to `Notes: "updated", <review>, émojis 🎓`.
3. Click **Save**.

**Expected result**

Values persist and render safely in list and on reopen; no script injection or broken markup.

**Gherkin**

```gherkin
Scenario: Special characters on edit
  Given I am editing "QA Program Pilot"
  When I change the Name to "QA & Testing — Cohort #1 (2026)"
  And I change the Description to "Notes: \"updated\", <review>, émojis 🎓"
  And I click Save
  Then the modal closes
  And the program list shows "QA & Testing — Cohort #1 (2026)"
```

---

### TC-015 — Leading and trailing spaces in name are preserved

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **Cloud Engineering 2026**. |
| **Priority** | Low |

**Steps**

1. Set **Name** to `  Cloud Engineering 2026 - Revised  `.
2. Click **Save**.

**Expected result**

List shows the name **with leading/trailing spaces preserved** (not trimmed on save in test env).

**Gherkin**

```gherkin
Scenario: Leading and trailing spaces are kept on edited name
  Given I am editing "Cloud Engineering 2026"
  When I change the Program Name to "  Cloud Engineering 2026 - Revised  "
  And I click Save
  Then the program list shows "  Cloud Engineering 2026 - Revised  "
  And the program list does not show the original name without padding
```

---

### TC-016 — Double-click Save does not create duplicate programs

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing a single program row. |
| **Priority** | Medium |

**Steps**

1. Change **Description** to `Double save test`.
2. Double-click **Save** rapidly.

**Expected result**

Exactly one program row for that entity; description updated once; no duplicate list entries.

**Gherkin**

```gherkin
Scenario: Double submit on Save
  Given I am editing "Web Development 2026"
  When I change the Description to "Double save test"
  And I double-click Save
  Then the modal closes
  And the program list contains exactly one program named "Web Development 2026"
  And that program's description is "Double save test"
```

---

### TC-017 — Clear description only if allowed by product rules

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing a program with a non-empty **Description**. |
| **Priority** | Low |

**Steps**

1. Clear **Description** entirely; leave **Name** unchanged.
2. Click **Save** (if enabled).

**Expected result**

Empty **Description** is **saved**; **Save** stays enabled (confirmed in test env, consistent with optional description on create).

**Gherkin**

```gherkin
Scenario: Empty description after edit
  Given I am editing a program with a non-empty Description
  When I clear the Description field
  And I click Save
  Then the Name remains unchanged
  And the Description is empty in the list and on reopen
```

---

### TC-018 — Edit modal exposes extended program fields

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin on the Programs page. |
| **Priority** | Medium |

**Steps**

1. Open **Edit Program** for any existing program.

**Expected result**

Modal shows **Program Name \***, **Description**, **Total Program Hours**, **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, and **▸ Show AI Generation Config**, with **Cancel** and **Save**.

**Gherkin**

```gherkin
Scenario: Edit modal shows all program fields
  Given I am on the Programs page
  When I open Edit Program for an existing program
  Then I see Program Name, Description, and the extended hour and metadata fields
  And I see Cancel and Save actions
```

---

## AC coverage matrix

| Acceptance criteria scenario | Test case(s) |
|-----------------------------|--------------|
| Open program for editing | TC-001 |
| Successfully edit a program name | TC-002 |
| Edit preserves unchanged fields | TC-003 |

---

## Ambiguities and gaps in acceptance criteria

1. **Field labels** — Jira AC says **Name**; UI label is **Program Name \*** (same field as DS-1 create).
2. **Admin login** — User story says admin; open-edit scenario does not repeat "logged in as admin" (TC-008 assumes role rules).
3. **Edit entry point** — AC says "edit icon"; UI exposes **`Edit {program name}`** (and **Delete {program name}`**) as icon buttons with accessible names.
4. **Extended fields** — AC only mentions name/description; edit modal includes hours and metadata fields (TC-018, TC-003).
5. **Duplicate names on rename** — Not in ACs; test env **allows** duplicate display names (TC-009).
6. **Max length** — No client-side max on edit for **Program Name** up to at least 256 characters (TC-013); 255-char save verified (TC-012).
7. **Cancel / dismiss** — Unsaved changes behavior not in ACs (TC-005 uses **Cancel**).
8. **Description required** — Optional on edit; empty description saves (TC-017).
9. **Immediate list update** — AC requires immediate list refresh after name edit; no AC for loading states, errors, or optimistic UI rollback.
10. **Concurrent edit** — Two admins editing the same program; last-write-wins vs. conflict detection not covered.
11. **Default hours** — **Default Session Hours** / **Default Exam Hours** may show defaults (`4` / `3`) when not set on create; persistence rules for **Total Program Hours** unclear.
