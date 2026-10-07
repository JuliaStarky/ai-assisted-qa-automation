Feature: DS-3 Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill Description with "Programme bilingue sciences et IA"
    And I click Create
    Then the New Program modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Accept standard alphanumeric program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    Then the program list shows "Cloud Engineering 2026"

  Scenario: Program name with leading and trailing spaces is normalized on create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "  Mobile Development 2026  " as the Program Name
    And I fill Description with "Mobile track"
    And I click Create
    Then the program list shows "Mobile Development 2026" without leading or trailing spaces

  Scenario: Unicode and accented characters in program name are accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Programme été — München 2026" as the Program Name
    And I fill other required fields
    And I click Create
    Then the program is created successfully with that exact display name

  Scenario: Same program name is allowed after the original program was deleted
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" existed and was deleted successfully
    When I create a new program named "Web Development 2026" with description "Reused after delete"
    Then the program list shows exactly one program named "Web Development 2026"

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I fill Description with a valid description
    Then the Create button is disabled or the form is not submitted
    And no new program is created

  Scenario: Reject empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave Program Name empty
    And I fill Description with a valid description
    Then the Create button is disabled
    And no new program is created

  Scenario: Reject duplicate program name on create
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists in the system
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill Description with "Second program attempt"
    And I click Create
    Then I see an error indicating the name already exists
    And the program list shows exactly one program named "Web Development 2026"
    And the New Program modal remains open or shows the error without creating a duplicate row

  Scenario: Duplicate check applies after trimming whitespace-padded name
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the Program Name
    And I fill other required fields
    And I click Create
    Then I see an error indicating the name already exists
    And the program list shows exactly one program named "Web Development 2026"

  Scenario: Failed duplicate create must not corrupt or partially persist invalid data
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists with description "Stable row"
    When I attempt to create another program named "Web Development 2026"
    And the create is rejected
    Then after refreshing the Programs page
    And the existing "Web Development 2026" row still shows description "Stable row"
    And no additional duplicate row exists

  Scenario: Rename to an existing program name is rejected on edit
    Given I am logged in as admin on Didaxis
    And programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing program "Data Science Fundamentals"
    When I change Program Name to "Web Development 2026"
    And I click Save
    Then I see an error indicating the name already exists
    And the program list still shows "Data Science Fundamentals" as a distinct program

  Scenario: Program name exceeding maximum length is rejected on create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a Program Name of 256 characters
    And I fill other required fields
    Then I cannot successfully create the program
    And the program list does not contain a program with that 256-character name

  # Edge cases

  Scenario: Program name at maximum allowed length is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a Program Name of exactly the maximum allowed length
    And I fill Description with "Max length description"
    And I click Create
    Then the program is created successfully

  Scenario: Case-variant duplicate program name is rejected
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "web development 2026" as the Program Name
    And I fill other required fields
    And I click Create
    Then I see an error indicating the name already exists
    And the program list shows exactly one program matching "Web Development 2026" case-insensitively

  Scenario: Emoji in program name follows product policy
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "STEM Track 🎓 2026" as the Program Name
    And I fill other required fields
    And I click Create
    Then the program is either created with the emoji preserved or rejected with a clear validation message

  Scenario: HTML or script-like strings in program name are handled safely
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Test <b>Name</b>" as the Program Name
    And I fill other required fields
    And I click Create
    Then the program list displays the name as plain text without executing scripts
    And no script alert dialog appears

  Scenario: Tab and newline characters in program name are rejected or normalized
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a Program Name containing tab or newline characters
    And I fill other required fields
    Then Create is disabled or the name is normalized according to product rules before save

  Scenario: Duplicate name error is accessible in the create modal
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I attempt to create another program named "Web Development 2026"
    Then the duplicate-name error is visible and announced to assistive technology users

  Scenario: Double-click Create does not bypass duplicate validation
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I double-click Create
    Then at most one create request is processed
    And the program list shows exactly one program named "Web Development 2026"

  Scenario: User can correct invalid name and successfully create afterward
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name and see a duplicate error
    And I change Program Name to "Web Development 2027"
    And I click Create
    Then the program list shows "Web Development 2027"
    And the program list still shows exactly one "Web Development 2026"

# Ambiguities and gaps (resolve before automation)
# 1. Whitespace-only AC says "click Create" but UI may disable Create when trimmed name is empty — align expected UX (disabled vs submit blocked).
# 2. Maximum Program Name length not in AC; defects cite 100 vs 255 characters — confirm single product limit for DS-3.
# 3. Duplicate rejection on create is AC #3 but test env often allows duplicates (DS-13, DS-153, DS-201) — confirm error copy and whether modal stays open.
# 4. Case-insensitive uniqueness not stated in AC — defects DS-154 / DS-200 suggest it should be rejected; confirm rule.
# 5. DS-3 scope vs DS-1/DS-2: edit-time duplicate (DS-203) overlaps DS-2 — confirm whether DS-3 covers both create and edit or create only.
# 6. Trim semantics: AC implies trim for whitespace-only; DS-204 reports whitespace stored on create — confirm normalize-on-save for all names.
# 7. Emoji, tabs, internal multiple spaces (DS-67) — confirm allowed character set and normalization rules.
# 8. XSS in name (DS-66) — confirm display escaping in list vs rejection at input.
# 9. Concurrent duplicate creates (DS-180) — confirm server-side uniqueness under race conditions.
# 10. Fixed seed name "Web Development 2026" may already exist in shared env — use unique suffix or cleanup in automation.
