# Test Plan: Edit Existing Program Details

**Feature:** Edit existing program details  
**Ticket:** DS-2  
**Scope:** Programs page — edit action on a program row/modal (Name, Description, Save)

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
3. Click the edit icon on **Web Development 2026**.

**Expected result**

The edit form opens. **Name** and **Description** (and any other editable fields) match the program’s stored values.

**Gherkin**

```gherkin
Scenario: Open program for editing
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I click the edit icon on "Web Development 2026"
  Then I see the edit form pre-populated with the program's current data
```

---

### TC-002 — Updated program name appears in list after save

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and is editing **Web Development 2026**. |
| **Priority** | High |

**Steps**

1. Change **Name** to `Web Development 2026 - Updated`.
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

1. Note the current **Name** and any other fields besides **Description**.
2. Change **Description** to `Updated curriculum for 2026 cohort`.
3. Click **Save**.

**Expected result**

The modal closes. **Name** remains `Data Science Fundamentals`. **Description** reflects the new text. Other fields match their pre-edit values.

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
2. Set **Name** to `Mobile Development 2026 - Advanced`.
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

1. Change **Name** to `Should Not Persist`.
2. Dismiss the form (Cancel, X, or equivalent) without **Save**.

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

1. Clear the **Name** field completely.
2. Attempt to click **Save**.

**Expected result**

**Save** is disabled or validation blocks submit. Original program name remains in the list after dismiss or failed save.

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

1. Replace **Name** with `   ` (spaces only).
2. Attempt **Save**.

**Expected result**

Save blocked; list still shows **Cybersecurity Bootcamp**.

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

Edit icon is hidden, disabled, or opening edit is denied. Program data cannot be changed via UI.

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

### TC-009 — Renaming to duplicate existing program name is handled

| Field | Value |
|-------|--------|
| **Preconditions** | Programs **Web Development 2026** and **Data Science Fundamentals** both exist. User edits **Data Science Fundamentals**. |
| **Priority** | Medium |

**Steps**

1. Change **Name** to `Web Development 2026`.
2. Click **Save** (if enabled).

**Expected result**

Clear error or validation; no ambiguous duplicate display names without policy confirmation. **Data Science Fundamentals** row remains distinct or save fails visibly.

**Gherkin**

```gherkin
Scenario: Duplicate name on edit
  Given I am editing "Data Science Fundamentals"
  And a program "Web Development 2026" already exists
  When I change the Name to "Web Development 2026"
  And I click Save
  Then I see a validation or error message about the duplicate name
  And the program list does not show two indistinguishable "Web Development 2026" entries
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

1. Set **Name** to a string of exactly 255 characters.
2. Click **Save**.

**Expected result**

Save succeeds; list displays the full name or documented truncation consistently.

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

### TC-013 — Name over maximum length is rejected

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing an existing program. |
| **Priority** | Medium |

**Steps**

1. Set **Name** to 256 characters.
2. Attempt **Save**.

**Expected result**

Validation error or disabled **Save**; previous name remains in list.

**Gherkin**

```gherkin
Scenario: Edit name over max length is rejected
  Given I am editing a program
  When I change the Name to a string of 256 characters
  Then the Save button is disabled or I see a max-length validation message
  And the program list shows the original program name
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

### TC-015 — Leading and trailing spaces in name are normalized

| Field | Value |
|-------|--------|
| **Preconditions** | User is editing **Cloud Engineering 2026**. |
| **Priority** | Low |

**Steps**

1. Set **Name** to `  Cloud Engineering 2026 - Revised  `.
2. Click **Save**.

**Expected result**

List shows `Cloud Engineering 2026 - Revised` (trimmed) or validation rejects untrimmed input—per product rules.

**Gherkin**

```gherkin
Scenario: Trim spaces on edited name
  Given I am editing "Cloud Engineering 2026"
  When I change the Name to "  Cloud Engineering 2026 - Revised  "
  And I click Save
  Then the program list shows "Cloud Engineering 2026 - Revised"
  And the program list does not show "  Cloud Engineering 2026 - Revised  "
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

Either empty description is saved, or validation requires description—behavior documented and consistent with create flow (DS-1).

**Gherkin**

```gherkin
Scenario: Empty description after edit
  Given I am editing a program with a non-empty Description
  When I clear the Description field
  And I click Save
  Then the Name remains unchanged
  And the Description is empty or validation prevents save according to product rules
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

1. **Field labels** — Create flow uses **Program Name** (DS-1); edit AC uses **Name**. Assumed same field; label consistency not specified.
2. **Admin login** — User story says admin; open-edit scenario does not repeat "logged in as admin" (TC-008 assumes role rules).
3. **Edit entry point** — Only "edit icon" is mentioned; no AC for row click, kebab menu, or keyboard access.
4. **Empty / whitespace name on edit** — Not in ACs; inferred from create validation (TC-006, TC-007).
5. **Duplicate names on rename** — Not specified (TC-009).
6. **Max length** — Limits for **Name** and **Description** on edit not stated (TC-012, TC-013).
7. **Cancel / dismiss** — Unsaved changes behavior not in ACs (TC-005).
8. **Description required** — Clearing description on edit not defined (TC-017).
9. **Immediate list update** — AC requires immediate list refresh after name edit; no AC for loading states, errors, or optimistic UI rollback.
10. **Concurrent edit** — Two admins editing the same program; last-write-wins vs. conflict detection not covered.
11. **"Other fields"** — AC mentions other fields unchanged but does not enumerate them (dates, status, IDs, etc.).
