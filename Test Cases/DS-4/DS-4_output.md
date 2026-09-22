# Test Plan: Delete Program with Confirmation

**Feature:** Delete program with confirmation  
**Ticket:** DS-4  
**Scope:** Programs page — delete action, confirmation dialog, confirm/cancel

---

## Positive flows

### TC-001 — Confirmed deletion removes program from list

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Test Program** exists on the Programs page. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Click the delete icon for **Test Program**.
3. Verify a confirmation dialog appears.
4. Confirm deletion (e.g. **Delete**, **Confirm**, or equivalent).

**Expected result**

**Test Program** is removed from the program list and is no longer visible after the dialog closes.

**Gherkin**

```gherkin
Scenario: Delete program with confirmation
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  When I confirm deletion
  Then "Test Program" is removed from the program list
```

---

### TC-002 — Cancel keeps program in list

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Web Development 2026** exists. |
| **Priority** | High |

**Steps**

1. Click the delete icon for **Web Development 2026**.
2. When the confirmation dialog appears, click **Cancel**.

**Expected result**

Dialog closes. **Web Development 2026** remains in the program list with unchanged details.

**Gherkin**

```gherkin
Scenario: Cancel program deletion
  Given I click the delete icon for a program
  When I see the confirmation dialog
  And I click Cancel
  Then the program still exists in the list
```

---

### TC-003 — Confirmation dialog identifies the program being deleted

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Data Science Fundamentals** exists. |
| **Priority** | Medium |

**Steps**

1. Click the delete icon for **Data Science Fundamentals**.
2. Read the confirmation dialog content.

**Expected result**

Dialog clearly references **Data Science Fundamentals** (or equivalent identifying text) so the admin confirms the correct program.

**Gherkin**

```gherkin
Scenario: Confirmation dialog shows program identity
  Given a program "Data Science Fundamentals" exists
  When I click the delete icon for "Data Science Fundamentals"
  Then I see a confirmation dialog
  And the dialog mentions "Data Science Fundamentals"
```

---

### TC-004 — List updates immediately after confirmed delete

| Field | Value |
|-------|--------|
| **Preconditions** | Programs **Test Program** and **Cloud Engineering 2026** exist. |
| **Priority** | Medium |

**Steps**

1. Delete **Test Program** and confirm.
2. Without full page reload, observe the list.

**Expected result**

**Test Program** disappears immediately; **Cloud Engineering 2026** remains visible.

**Gherkin**

```gherkin
Scenario: Program list updates after delete
  Given programs "Test Program" and "Cloud Engineering 2026" exist
  When I delete "Test Program" and confirm deletion
  Then the program list does not show "Test Program"
  And the program list shows "Cloud Engineering 2026"
```

---

### TC-005 — Dismiss dialog without confirm or cancel (e.g. close control)

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Mobile Development 2026** exists. |
| **Priority** | Medium |

**Steps**

1. Click delete for **Mobile Development 2026**.
2. Close the dialog via **X**, overlay click, or **Escape** (if supported).

**Expected result**

Same as cancel: **Mobile Development 2026** still exists in the list; no deletion occurs.

**Gherkin**

```gherkin
Scenario: Dismiss delete dialog without confirming
  Given a program "Mobile Development 2026" exists
  When I click the delete icon for "Mobile Development 2026"
  And I see a confirmation dialog
  And I dismiss the dialog without confirming deletion
  Then the program still exists in the list
```

---

## Negative flows

### TC-006 — Non-admin cannot delete a program

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as non-admin. Program **Test Program** exists. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Attempt to delete **Test Program**.

**Expected result**

Delete control is unavailable or delete/confirm flow is blocked. **Test Program** remains in the list.

**Gherkin**

```gherkin
Scenario: Non-admin cannot delete programs
  Given I am logged in as a non-admin user
  And a program "Test Program" exists
  When I navigate to the Programs page
  Then I do not see an enabled delete action for "Test Program"
  And "Test Program" remains in the program list
```

---

### TC-007 — Deletion does not complete when session expires on confirm

| Field | Value |
|-------|--------|
| **Preconditions** | Admin opened delete dialog; session expires before confirm. |
| **Priority** | Medium |

**Steps**

1. Open delete confirmation for **Test Program**.
2. Expire session (or simulate).
3. Confirm deletion.

**Expected result**

User is prompted to re-authenticate or sees an error. **Test Program** is not silently removed without successful authorized delete (verify after re-login).

**Gherkin**

```gherkin
Scenario: Expired session blocks delete confirm
  Given a program "Test Program" exists
  And I see the delete confirmation dialog for "Test Program"
  And my admin session has expired
  When I confirm deletion
  Then I am prompted to log in again or I see an authorization error
  And after failed delete "Test Program" still exists unless a successful authenticated delete occurred
```

---

### TC-008 — Confirm alone without opening dialog does not delete

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Test Program** exists. No delete dialog is open. |
| **Priority** | Low |

**Steps**

1. Attempt API or UI path to delete without confirmation step (if exposed).

**Expected result**

Program is not deleted without confirmation dialog flow (UI must require explicit confirm).

**Gherkin**

```gherkin
Scenario: Delete requires confirmation step
  Given a program "Test Program" exists
  When I attempt to remove the program without completing the confirmation dialog
  Then "Test Program" remains in the program list
```

---

### TC-009 — Failed delete shows error and preserves program

| Field | Value |
|-------|--------|
| **Preconditions** | Simulated server/network failure on delete confirm (test environment). |
| **Priority** | Medium |

**Steps**

1. Initiate delete for **Test Program** and confirm.
2. Observe UI when backend returns error.

**Expected result**

Error message shown; **Test Program** remains in list or list reflects rollback; user is not left thinking delete succeeded.

**Gherkin**

```gherkin
Scenario: Failed delete shows error
  Given a program "Test Program" exists
  And the delete API will fail
  When I click the delete icon for "Test Program"
  And I confirm deletion
  Then I see an error message
  And "Test Program" remains in the program list
```

---

## Edge cases

### TC-010 — Delete program with special characters in name

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Informatique & IA - Niveau 2** exists. |
| **Priority** | Medium |

**Steps**

1. Click delete for **Informatique & IA - Niveau 2**.
2. Confirm deletion.

**Expected result**

Program is removed; dialog displayed the name correctly; no UI breakage.

**Gherkin**

```gherkin
Scenario: Delete program with special characters in name
  Given a program "Informatique & IA - Niveau 2" exists
  When I click the delete icon for "Informatique & IA - Niveau 2"
  And I confirm deletion
  Then "Informatique & IA - Niveau 2" is removed from the program list
```

---

### TC-011 — Delete last program in list

| Field | Value |
|-------|--------|
| **Preconditions** | **Test Program** is the only program in the list. |
| **Priority** | Medium |

**Steps**

1. Delete **Test Program** and confirm.
2. View Programs page.

**Expected result**

List is empty or shows appropriate empty state; no errors; no ghost row for **Test Program**.

**Gherkin**

```gherkin
Scenario: Delete the only program in the list
  Given "Test Program" is the only program in the program list
  When I delete "Test Program" and confirm deletion
  Then "Test Program" is removed from the program list
  And the program list shows an empty state or zero programs
```

---

### TC-012 — Double-click confirm does not cause duplicate errors or inconsistent UI

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Test Program** exists. |
| **Priority** | Low |

**Steps**

1. Open delete confirmation for **Test Program**.
2. Double-click the confirm button quickly.

**Expected result**

Single delete occurs; dialog closes cleanly; list has no duplicate empty rows or repeated error toasts.

**Gherkin**

```gherkin
Scenario: Double confirm on delete dialog
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  And I double-click confirm deletion
  Then "Test Program" is removed from the program list
  And the UI remains in a consistent state
```

---

### TC-013 — Delete program with long name in confirmation dialog

| Field | Value |
|-------|--------|
| **Preconditions** | Program exists with a 255-character name (unique). |
| **Priority** | Low |

**Steps**

1. Open delete confirmation for that program.
2. Confirm deletion.

**Expected result**

Dialog layout remains usable (truncate/wrap with tooltip if needed); delete succeeds and program is removed.

**Gherkin**

```gherkin
Scenario: Delete program with very long name
  Given a program with a 255-character name exists
  When I click the delete icon for that program
  Then I see a confirmation dialog
  When I confirm deletion
  Then that program is removed from the program list
```

---

### TC-014 — Re-create program with same name after delete

| Field | Value |
|-------|--------|
| **Preconditions** | **Test Program** was deleted successfully. |
| **Priority** | Low |

**Steps**

1. Create a new program named **Test Program** with a new description.
2. Click **Create**.

**Expected result**

Creation succeeds if name is freed on delete, or shows duplicate error if names stay reserved—document product rule (links to DS-3).

**Gherkin**

```gherkin
Scenario: Create program after delete with same name
  Given "Test Program" was deleted and is no longer in the list
  When I create a new program named "Test Program"
  Then the program is created successfully if the name is available after delete
  Or I see an error if deleted names remain reserved
```

---

### TC-015 — Delete one program does not remove others

| Field | Value |
|-------|--------|
| **Preconditions** | **Test Program** and **Web Development 2026** both exist. |
| **Priority** | High |

**Steps**

1. Delete **Test Program** only and confirm.

**Expected result**

**Web Development 2026** remains; only **Test Program** is removed.

**Gherkin**

```gherkin
Scenario: Delete is scoped to selected program
  Given programs "Test Program" and "Web Development 2026" exist
  When I delete "Test Program" and confirm deletion
  Then "Test Program" is removed from the program list
  And "Web Development 2026" remains in the program list
```

---

## AC coverage matrix

| Acceptance criteria scenario | Test case(s) |
|-----------------------------|--------------|
| Delete program with confirmation | TC-001 |
| Cancel program deletion | TC-002 |

---

## Ambiguities and gaps in acceptance criteria

1. **Stray AC text in ticket input** — Top of `DS-4_input.md` includes duplicate-name user story (DS-3); test plan follows delete scenarios only.
2. **Admin login** — User story specifies admin; Gherkin scenarios do not always state logged-in admin (TC-006 covers non-admin).
3. **Confirm control label** — Exact button text (**Delete**, **Yes**, **Confirm**) not specified.
4. **Dialog content** — Whether program name, warning text, or irreversibility note is required (TC-003).
5. **Dismiss behaviors** — Cancel is in AC; **X**, overlay, and **Escape** not specified (TC-005).
6. **Dependencies** — Whether programs with cohorts/enrollments can be deleted or are blocked is not covered.
7. **Soft delete vs hard delete** — Recovery and name reuse (TC-014) undefined.
8. **Loading and errors** — Network failure and optimistic UI not in ACs (TC-009).
9. **Accessibility** — Focus trap in dialog, keyboard confirm/cancel not specified.
10. **Immediate list update** — AC says removed from list; refresh vs optimistic update not defined (TC-004).
