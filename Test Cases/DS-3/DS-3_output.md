# Test Plan: Program Name Validation and Duplicate Prevention

**Feature:** Program name validation and duplicate prevention  
**Ticket:** DS-3  
**Scope:** Program creation (and related name rules) — **Program Name**, **Create**, duplicate and whitespace validation

---

## Positive flows

### TC-001 — Valid program name with special characters is accepted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Enter `Informatique & IA - Niveau 2` in **Program Name**.
2. Fill other required fields (e.g. **Description**: `Programme bilingue sciences et IA`).
3. Click **Create**.

**Expected result**

Program is created successfully. The program list includes **Informatique & IA - Niveau 2**.

**Gherkin**

```gherkin
Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I enter "Informatique & IA - Niveau 2" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully
```

---

### TC-002 — Standard alphanumeric program name is accepted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; no existing program named **Cloud Engineering 2026**. |
| **Priority** | Medium |

**Steps**

1. Enter `Cloud Engineering 2026` in **Program Name**.
2. Enter `AWS and Azure fundamentals` in **Description**.
3. Click **Create**.

**Expected result**

Program is created; list shows **Cloud Engineering 2026**.

**Gherkin**

```gherkin
Scenario: Accept valid simple program name
  Given I am on the program creation form
  When I enter "Cloud Engineering 2026" as the program name
  And I fill in Description with "AWS and Azure fundamentals"
  And I click Create
  Then the program is created successfully
  And the program list shows "Cloud Engineering 2026"
```

---

### TC-003 — Trimmed name with leading and trailing spaces saves as normalized name

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; **Mobile Development 2026** does not already exist. |
| **Priority** | Medium |

**Steps**

1. Enter `  Mobile Development 2026  ` in **Program Name**.
2. Fill **Description** and click **Create**.

**Expected result**

Program is created with display name **Mobile Development 2026** (trimmed). No duplicate whitespace variant is stored.

**Gherkin**

```gherkin
Scenario: Leading and trailing spaces are trimmed on valid name
  Given I am on the program creation form
  When I enter "  Mobile Development 2026  " as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully
  And the program list shows "Mobile Development 2026"
```

---

## Negative flows

### TC-004 — Whitespace-only program name is not submitted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Enter `   ` in **Program Name**.
2. Fill **Description** if required.
3. Click **Create**.

**Expected result**

Form is not submitted. Name is trimmed and treated as empty (**Create** disabled and/or inline validation). No new program row is added.

**Gherkin**

```gherkin
Scenario: Reject program name with only whitespace
  Given I am on the program creation form
  When I enter "   " as the program name
  And I click Create
  Then the form is not submitted (name is trimmed, treated as empty)
```

---

### TC-005 — Empty program name is not submitted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin and the program creation form is open. |
| **Priority** | High |

**Steps**

1. Leave **Program Name** empty.
2. Enter text in **Description**.
3. Attempt **Create**.

**Expected result**

Form is not submitted; **Create** remains disabled or validation blocks submit.

**Gherkin**

```gherkin
Scenario: Reject empty program name
  Given I am on the program creation form
  When I leave the program name empty
  And I fill other required fields
  And I click Create
  Then the form is not submitted
  And no program is added to the program list
```

---

### TC-006 — Duplicate program name shows error and does not create second program

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. Program **Web Development 2026** already exists. |
| **Priority** | High |

**Steps**

1. Open the program creation form.
2. Enter `Web Development 2026` in **Program Name**.
3. Enter `Second program attempt` in **Description**.
4. Click **Create**.

**Expected result**

Error indicates the name already exists. Form stays open or closes with visible failure; list still has only one **Web Development 2026** program (no silent duplicate).

**Gherkin**

```gherkin
Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists
```

---

### TC-007 — Duplicate check applies after trim (whitespace-padded duplicate)

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Web Development 2026** already exists. |
| **Priority** | High |

**Steps**

1. On create form, enter `  Web Development 2026  ` in **Program Name**.
2. Fill **Description** and click **Create**.

**Expected result**

Treated as duplicate of **Web Development 2026**; error shown; no second program created.

**Gherkin**

```gherkin
Scenario: Duplicate detection uses trimmed name
  Given a program "Web Development 2026" already exists
  And I am on the program creation form
  When I enter "  Web Development 2026  " as the program name
  And I fill other required fields
  And I click Create
  Then I see an error indicating the name already exists
  And the program list contains exactly one "Web Development 2026"
```

---

### TC-008 — Invalid name must not partially persist on failed create

| Field | Value |
|-------|--------|
| **Preconditions** | **Web Development 2026** exists. User submits duplicate or whitespace-only name. |
| **Priority** | Medium |

**Steps**

1. Attempt create with duplicate name **Web Development 2026**.
2. Refresh the Programs page or reopen the list.

**Expected result**

No orphan or partial records; count of programs unchanged except for successful creates.

**Gherkin**

```gherkin
Scenario: Failed validation does not create partial program
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists
  And the program list still contains exactly one "Web Development 2026"
```

---

### TC-009 — Rename to existing name is rejected on edit

| Field | Value |
|-------|--------|
| **Preconditions** | Programs **Web Development 2026** and **Data Science Fundamentals** exist. User edits **Data Science Fundamentals**. |
| **Priority** | Medium |

**Steps**

1. Open edit for **Data Science Fundamentals**.
2. Change **Name** to `Web Development 2026`.
3. Click **Save**.

**Expected result**

Duplicate error; **Data Science Fundamentals** remains unchanged in the list.

**Gherkin**

```gherkin
Scenario: Duplicate name rejected when editing program
  Given a program "Web Development 2026" already exists
  And I am editing "Data Science Fundamentals"
  When I change the Name to "Web Development 2026"
  And I click Save
  Then I see an error indicating the name already exists
  And the program list shows "Data Science Fundamentals"
```

---

## Edge cases

### TC-010 — Program name at maximum allowed length is accepted

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; assume max length 255 if not documented. Name is unique. |
| **Priority** | Medium |

**Steps**

1. Enter a 255-character **Program Name** (e.g. `N` repeated 255 times).
2. Fill **Description** and click **Create**.

**Expected result**

Program created successfully with full name stored/displayed per product rules.

**Gherkin**

```gherkin
Scenario: Max length program name accepted
  Given I am on the program creation form
  When I enter a program name of 255 characters
  And I fill other required fields
  And I click Create
  Then the program is created successfully
```

---

### TC-011 — Program name over maximum length is rejected

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin on creation form. |
| **Priority** | Medium |

**Steps**

1. Enter 256 characters in **Program Name**.
2. Attempt **Create**.

**Expected result**

Validation prevents submit; no program added.

**Gherkin**

```gherkin
Scenario: Over max length program name rejected
  Given I am on the program creation form
  When I enter a program name of 256 characters
  And I fill other required fields
  And I click Create
  Then the form is not submitted
  And I see a max-length validation message or Create is disabled
```

---

### TC-012 — Unicode and accented characters in program name

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; name is unique. |
| **Priority** | Medium |

**Steps**

1. Enter `Programme été — München 2026` in **Program Name**.
2. Fill **Description** and click **Create**.

**Expected result**

Program created; name displays correctly in the list.

**Gherkin**

```gherkin
Scenario: Unicode characters in program name
  Given I am on the program creation form
  When I enter "Programme été — München 2026" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully
  And the program list shows "Programme été — München 2026"
```

---

### TC-013 — Emoji in program name (policy-dependent)

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Low |

**Steps**

1. Enter `STEM Track 🎓 2026` as **Program Name**.
2. Fill **Description** and click **Create**.

**Expected result**

Either accepted and stored, or rejected with clear validation—document actual product policy.

**Gherkin**

```gherkin
Scenario: Emoji in program name
  Given I am on the program creation form
  When I enter "STEM Track 🎓 2026" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully or I see validation that emoji are not allowed
```

---

### TC-014 — Duplicate name case sensitivity

| Field | Value |
|-------|--------|
| **Preconditions** | Program **Web Development 2026** exists. |
| **Priority** | Medium |

**Steps**

1. Create new program with name `web development 2026` (different casing).
2. Click **Create**.

**Expected result**

Behavior is consistent: either rejected as duplicate (case-insensitive) or allowed (case-sensitive)—must match documented rule; test records outcome.

**Gherkin**

```gherkin
Scenario: Duplicate check and letter casing
  Given a program "Web Development 2026" already exists
  And I am on the program creation form
  When I enter "web development 2026" as the program name
  And I fill other required fields
  And I click Create
  Then I see an error indicating the name already exists
  Or the program is created only if names are case-sensitive by design
```

---

### TC-015 — HTML or script-like strings are handled safely

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin; unique name. |
| **Priority** | Medium |

**Steps**

1. Enter `<script>alert('x')</script>` or `Test <b>Name</b>` as **Program Name**.
2. Fill **Description** and click **Create** (if validation allows).

**Expected result**

No script execution in list/modal; name stored escaped or rejected by validation with message.

**Gherkin**

```gherkin
Scenario: Script-like program name handled safely
  Given I am on the program creation form
  When I enter "Test <b>Name</b>" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created with safe display in the list
  And no script runs in the UI
```

---

### TC-016 — Tabs and newline characters in program name

| Field | Value |
|-------|--------|
| **Preconditions** | User is logged in as admin. |
| **Priority** | Low |

**Steps**

1. Enter a name containing tab or newline (e.g. `QA\tProgram` or paste multiline).
2. Attempt **Create**.

**Expected result**

Rejected, normalized to single line, or trimmed—no broken layout or accidental duplicate bypass.

**Gherkin**

```gherkin
Scenario: Tab and newline in program name
  Given I am on the program creation form
  When I enter a program name containing tab or newline characters
  And I fill other required fields
  And I click Create
  Then the form is not submitted or the name is normalized per validation rules
```

---

### TC-017 — Same name allowed after original program deleted (if delete exists)

| Field | Value |
|-------|--------|
| **Preconditions** | **Web Development 2026** existed and was deleted (feature-dependent). |
| **Priority** | Low |

**Steps**

1. Create program **Web Development 2026** again with new description.
2. Click **Create**.

**Expected result**

If delete is supported, reuse of name succeeds; if soft-delete retains uniqueness, duplicate error—document behavior.

**Gherkin**

```gherkin
Scenario: Reuse program name after deletion
  Given a program "Web Development 2026" was deleted
  And I am on the program creation form
  When I enter "Web Development 2026" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully if name is freed on delete
  Or I see an error if deleted names remain reserved
```

---

## AC coverage matrix

| Acceptance criteria scenario | Test case(s) |
|-----------------------------|--------------|
| Reject program name with only whitespace | TC-004 |
| Accept program name with special characters | TC-001 |
| Reject duplicate program name | TC-006 |

---

## Ambiguities and gaps in acceptance criteria

1. **Create vs edit** — ACs focus on creation form; duplicate/whitespace rules on **edit** are implied for data integrity but not listed (TC-009).
2. **Empty name** — Whitespace scenario implies trim-to-empty; explicit empty field behavior not in ACs (TC-005).
3. **Case sensitivity** — Duplicate check may be case-sensitive or not; AC uses exact string **Web Development 2026** (TC-014).
4. **Error UX** — Message text, field highlight, and whether modal stays open are unspecified (TC-006).
5. **"Fill other required fields"** — Which fields are required besides name is not defined in DS-3 ACs.
6. **Max length** — Not mentioned in ACs (TC-010, TC-011).
7. **Allowed character set** — Special characters example given; emoji, HTML, tabs/newlines not specified (TC-013, TC-015, TC-016).
8. **Trim-only duplicate** — Padding spaces around existing name not in ACs (TC-007).
9. **Deleted / archived programs** — Whether names remain reserved is undefined (TC-017).
10. **Admin role** — Stated in user story but not repeated in each Gherkin scenario precondition.
