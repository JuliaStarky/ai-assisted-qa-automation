# Test Plan: Create New Academic Program

**Feature:** Create new academic program  
**Ticket:** DS-1  
**Scope:** Programs page — "+ New Program" modal (Program Name, Description)

---

## Positive flows

### TC-001 — Program creation form displays required fields

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Click "+ New Program".

**Expected result**

The program creation form is visible with **Program Name** and **Description** fields.

**Gherkin**

```gherkin
Scenario: Navigate to program creation form
  Given I am logged in as admin
  When I navigate to the Programs page
  And I click "+ New Program"
  Then I see the program creation form with fields: Program Name, Description
```

---

### TC-002 — New program appears in list after successful create

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Enter `Web Development 2026` in **Program Name**.
2. Enter `Full-stack web development program` in **Description**.
3. Click **Create**.

**Expected result**

The modal closes. The programs list includes **Web Development 2026**.

**Gherkin**

```gherkin
Scenario: Successfully create a program
  Given I am on the program creation form
  When I fill in Program Name with "Web Development 2026"
  And I fill in Description with "Full-stack web development program"
  And I click Create
  Then the modal closes
  And the program list shows "Web Development 2026"
```

---

### TC-003 — Program can be created with description only minimally filled

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | Medium |

**Steps**

1. Enter `Data Science Fundamentals` in **Program Name**.
2. Enter `Introductory data science track` in **Description**.
3. Click **Create**.

**Expected result**

The modal closes and **Data Science Fundamentals** appears in the program list with the saved description.

**Gherkin**

```gherkin
Scenario: Create program with valid name and description
  Given I am on the program creation form
  When I fill in Program Name with "Data Science Fundamentals"
  And I fill in Description with "Introductory data science track"
  And I click Create
  Then the modal closes
  And the program list shows "Data Science Fundamentals"
```

---

### TC-004 — Cancel or close dismisses form without saving

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open with unsaved data. |
| **Priority** | Medium |

**Steps**

1. Enter `Temporary Program` in **Program Name**.
2. Enter `Should not be saved` in **Description**.
3. Close the modal (Cancel, X, or equivalent dismiss control).

**Expected result**

The modal closes. **Temporary Program** does not appear in the program list.

**Gherkin**

```gherkin
Scenario: Dismiss creation form without saving
  Given I am on the program creation form
  And I fill in Program Name with "Temporary Program"
  And I fill in Description with "Should not be saved"
  When I dismiss the program creation form without clicking Create
  Then the modal closes
  And the program list does not show "Temporary Program"
```

---

## Negative flows

### TC-005 — Create remains disabled when program name is empty

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Leave **Program Name** empty.
2. Optionally enter text in **Description**.
3. Observe the **Create** button.

**Expected result**

The **Create** button is disabled. No program is created.

**Gherkin**

```gherkin
Scenario: Validation prevents empty program name
  Given I am on the program creation form
  When I leave the Program Name field empty
  Then the Create button is disabled
```

---

### TC-006 — Whitespace-only program name does not enable create

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Enter only spaces (`   `) in **Program Name**.
2. Enter `Valid description` in **Description**.
3. Attempt to click **Create**.

**Expected result**

**Create** stays disabled or validation blocks submit; no new program with a blank-visible name is saved.

**Gherkin**

```gherkin
Scenario: Whitespace-only program name is rejected
  Given I am on the program creation form
  When I fill in Program Name with "   "
  And I fill in Description with "Valid description"
  Then the Create button is disabled
  And no program is added to the program list
```

---

### TC-007 — Non-admin user cannot create a program

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in with a non-admin role (e.g. instructor or student, if applicable). |
| **Priority** | High |

**Steps**

1. Navigate to the Programs page.
2. Attempt to open the program creation flow ("+ New Program" or equivalent).

**Expected result**

Creation is not available: button hidden, disabled, or access denied. No new program can be created via UI.

**Gherkin**

```gherkin
Scenario: Non-admin cannot access program creation
  Given I am logged in as a non-admin user
  When I navigate to the Programs page
  Then I do not see an enabled "+ New Program" action
  And I cannot open the program creation form
```

---

### TC-008 — Duplicate program name is not silently accepted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Web Development 2026** already exists in the list. |
| **Priority** | Medium |

**Steps**

1. Open "+ New Program".
2. Enter `Web Development 2026` in **Program Name**.
3. Enter `Duplicate attempt` in **Description**.
4. Click **Create** (if enabled).

**Expected result**

Either creation is blocked with a clear error, or a distinct policy applies (e.g. allowed duplicates with unique IDs)—but the list must not show ambiguous duplicate rows without user-visible feedback. **Expected (typical):** error message; modal stays open or closes with failure toast; list still has a single unambiguous **Web Development 2026** entry.

**Gherkin**

```gherkin
Scenario: Duplicate program name handling
  Given I am logged in as admin
  And the program list shows "Web Development 2026"
  When I open the program creation form
  And I fill in Program Name with "Web Development 2026"
  And I fill in Description with "Duplicate attempt"
  And I click Create
  Then I see a validation or error message about the duplicate name
  And the program list does not contain a second indistinguishable "Web Development 2026" without confirmation
```

---

### TC-009 — Create does not succeed when session expired

| Field | Value |
|-------|--------|
| **Preconditions** | User had been logged in as admin; session expires before submit. |
| **Priority** | Medium |

**Steps**

1. Open the program creation form and fill valid fields.
2. Wait until session expires (or simulate expired token).
3. Click **Create**.

**Expected result**

User is redirected to login or shown an auth error. Program is not partially saved without acknowledgment.

**Gherkin**

```gherkin
Scenario: Expired session blocks program creation
  Given I am on the program creation form with valid Program Name and Description
  And my admin session has expired
  When I click Create
  Then I am prompted to log in again
  And the program list does not show the unsaved program name
```

---

## Edge cases

### TC-010 — Program name at maximum allowed length

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; maximum length for **Program Name** is known (assume 255 characters if unspecified). |
| **Priority** | Medium |

**Steps**

1. Open "+ New Program".
2. Enter a **Program Name** of exactly 255 characters (e.g. `A` repeated 255 times).
3. Enter `Max length name test` in **Description**.
4. Click **Create**.

**Expected result**

Program is created successfully and the full name is stored and displayed (or truncated consistently per product rules).

**Gherkin**

```gherkin
Scenario: Program name at max length
  Given I am on the program creation form
  When I fill in Program Name with a string of 255 characters
  And I fill in Description with "Max length name test"
  And I click Create
  Then the modal closes
  And the program list shows the program with the 255-character name
```

---

### TC-011 — Program name exceeding maximum length is rejected

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Medium |

**Steps**

1. Open "+ New Program".
2. Enter 256 characters in **Program Name**.
3. Enter `Over max length` in **Description**.
4. Attempt **Create**.

**Expected result**

Validation prevents submit or shows error; no invalid-length program is saved.

**Gherkin**

```gherkin
Scenario: Program name over max length is rejected
  Given I am on the program creation form
  When I fill in Program Name with a string of 256 characters
  And I fill in Description with "Over max length"
  Then the Create button is disabled or I see a max-length validation message
  And no new program is added to the program list
```

---

### TC-012 — Special characters in program name and description

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Medium |

**Steps**

1. Open "+ New Program".
2. Enter `QA & Testing — Cohort #1 (2026)` in **Program Name**.
3. Enter `Description with "quotes", <tags>, and émojis 🎓` in **Description**.
4. Click **Create**.

**Expected result**

Values are saved and rendered safely (no broken HTML/script execution); list shows the program name as entered or with documented escaping.

**Gherkin**

```gherkin
Scenario: Special characters in program fields
  Given I am on the program creation form
  When I fill in Program Name with "QA & Testing — Cohort #1 (2026)"
  And I fill in Description with "Description with \"quotes\", <tags>, and émojis 🎓"
  And I click Create
  Then the modal closes
  And the program list shows "QA & Testing — Cohort #1 (2026)"
```

---

### TC-013 — Empty description with valid program name

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Low |

**Steps**

1. Open "+ New Program".
2. Enter `Cybersecurity Bootcamp` in **Program Name**.
3. Leave **Description** empty.
4. Click **Create** (if enabled).

**Expected result**

Behavior matches product rules: either program is created with empty description, or **Create** is disabled / validation message shown. AC does not specify description as required—test documents actual behavior.

**Gherkin**

```gherkin
Scenario: Empty description with valid program name
  Given I am on the program creation form
  When I fill in Program Name with "Cybersecurity Bootcamp"
  And I leave the Description field empty
  Then the Create button is enabled or disabled according to description requirement
  And if I click Create and it is enabled
  Then the program list shows "Cybersecurity Bootcamp"
```

---

### TC-014 — Leading and trailing spaces in program name are normalized

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Low |

**Steps**

1. Open "+ New Program".
2. Enter `  Mobile Development 2026  ` in **Program Name**.
3. Enter `Trim behavior check` in **Description**.
4. Click **Create**.

**Expected result**

Stored/displayed name is trimmed to `Mobile Development 2026`, or validation rejects untrimmed input—consistent with app rules.

**Gherkin**

```gherkin
Scenario: Leading and trailing spaces in program name
  Given I am on the program creation form
  When I fill in Program Name with "  Mobile Development 2026  "
  And I fill in Description with "Trim behavior check"
  And I click Create
  Then the program list shows "Mobile Development 2026"
  And the program list does not show "  Mobile Development 2026  "
```

---

### TC-015 — Rapid double-click on Create does not duplicate program

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; program creation form open. |
| **Priority** | Medium |

**Steps**

1. Fill **Program Name** with `Cloud Engineering 2026` and **Description** with `Double submit test`.
2. Double-click **Create** quickly.

**Expected result**

Exactly one **Cloud Engineering 2026** program exists in the list; no duplicate rows from double submit.

**Gherkin**

```gherkin
Scenario: Double submit on Create
  Given I am on the program creation form
  And I fill in Program Name with "Cloud Engineering 2026"
  And I fill in Description with "Double submit test"
  When I double-click Create
  Then the modal closes
  And the program list contains exactly one "Cloud Engineering 2026"
```

---

## AC coverage matrix

| Acceptance criteria scenario | Test case(s) |
|-----------------------------|--------------|
| Navigate to program creation form | TC-001 |
| Successfully create a program | TC-002 |
| Validation prevents empty program name | TC-005 |

---

## Ambiguities and gaps in acceptance criteria

1. **Description required?** AC only mandates validation for empty **Program Name**. Whether **Description** is optional, optional-but-recommended, or required is undefined (TC-013).
2. **Duplicate program names** — No rule for unique names vs. allowed duplicates (TC-008).
3. **Max length** — No limits stated for **Program Name** or **Description** (TC-010, TC-011).
4. **Whitespace validation** — "Empty" name may or may not include whitespace-only strings (TC-006).
5. **Trimming** — Unclear if leading/trailing spaces are trimmed on save (TC-014).
6. **Modal dismiss** — No AC for Cancel/X; expected unsaved behavior not specified (TC-004).
7. **Roles** — Only admin is mentioned in navigation AC; other roles and permissions are unspecified (TC-007).
8. **List sort/order** — After create, position of new program in the list is not defined.
9. **Edit/delete** — Out of scope for create ACs but may affect duplicate-name tests.
10. **Accessibility** — Keyboard navigation and screen reader labels for **Program Name**, **Description**, and **Create** are not covered in ACs.
