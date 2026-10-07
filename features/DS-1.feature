Feature: DS-1 Create new academic program
  As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the New Program form with fields "Program Name" and "Description"
    And I see a "Create" button and a "Cancel" button

  Scenario: Successfully create a program with name and description from acceptance criteria
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the New Program modal closes
    And the program list shows exactly one row with program name "Web Development 2026"
    And that row shows description "Full-stack web development program"

  Scenario: Create a program with a unique name and optional description
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Data Science Fundamentals"
    And I fill in Description with "Introductory data science track"
    And I click Create
    Then the New Program modal closes
    And the program list shows "Data Science Fundamentals" with description "Introductory data science track"

  Scenario: Create a program with empty description when name is valid
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Cybersecurity Bootcamp"
    And I leave Description empty
    And I click Create
    Then the New Program modal closes
    And the program list shows "Cybersecurity Bootcamp"

  Scenario: Cancel dismisses the form without saving
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Temporary Program"
    And I fill in Description with "Should not be saved"
    And I click Cancel
    Then the New Program modal closes
    And the program list does not show "Temporary Program"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Optional description"
    Then the Create button is disabled

  Scenario: Whitespace-only program name does not enable Create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "   "
    And I fill in Description with "Valid description"
    Then the Create button is disabled

  Scenario: Duplicate program name is rejected with a clear error
    Given I am logged in as admin on Didaxis
    And a program named "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Duplicate attempt"
    And I click Create
    Then I see a validation or error message indicating the name is not unique
    And the program list still shows exactly one program named "Web Development 2026"

  Scenario: Non-admin user cannot open program creation
    Given I am logged in as a non-admin user on Didaxis
    When I navigate to the Programs page
    Then I do not see a "+ New Program" button
    And I cannot access the New Program creation form

  Scenario: Create does not succeed when the session is expired or unauthorized
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And my session is no longer authorized for program creation
    When I fill in Program Name with "Session Expired Program"
    And I fill in Description with "Valid description"
    And I click Create
    Then the program "Session Expired Program" is not added to the program list
    And I am prompted to sign in again or see an unauthorized or session-expired message

  Scenario: Program name exceeding maximum length is rejected
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with a string of 256 characters
    And I fill in Description with "Over max length"
    Then I cannot successfully create the program
    And the program list does not contain a program with that 256-character name

  Scenario: Description exceeding maximum length is rejected
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Valid Program Name"
    And I fill in Description with a string longer than the allowed maximum
    Then I cannot successfully create the program
    And the program list does not show "Valid Program Name"

  # Edge cases

  Scenario: Program name at maximum allowed length is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with a string of exactly the maximum allowed length
    And I fill in Description with "Max length name test"
    And I click Create
    Then the New Program modal closes
    And the program list shows the program with that maximum-length name

  Scenario: Special characters in program name and description are preserved
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "QA & Testing — Cohort #1 (2026)"
    And I fill in Description with "Description with \"quotes\", <tags>, and émojis 🎓"
    And I click Create
    Then the New Program modal closes
    And the program list shows "QA & Testing — Cohort #1 (2026)" with the description unchanged

  Scenario: Leading and trailing spaces in program name are normalized on create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "  Mobile Development 2026  "
    And I fill in Description with "Trim behavior check"
    And I click Create
    Then the New Program modal closes
    And the program list shows "Mobile Development 2026" without leading or trailing spaces

  Scenario: Case-variant duplicate program name is rejected
    Given I am logged in as admin on Didaxis
    And a program named "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in Program Name with "web development 2026"
    And I fill in Description with "Case variant duplicate"
    And I click Create
    Then I see a validation or error message indicating the name is not unique
    And the program list still shows exactly one program matching "Web Development 2026" case-insensitively

  Scenario: Rapid double-click on Create submits only once
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Cloud Engineering 2026"
    And I fill in Description with "Double submit test"
    And I double-click Create
    Then the New Program modal closes
    And the program list shows exactly one program named "Cloud Engineering 2026"

# Ambiguities and gaps (resolve before automation)
# 1. Maximum Program Name length is not specified in DS-1 AC; linked bugs cite both 100 and 255 characters — confirm product limit.
# 2. Maximum Description length is not in AC; bugs cite 500 and 2000 characters — confirm product limit.
# 3. Duplicate name uniqueness (exact vs case-insensitive) is not in AC but is implied by defect reports — confirm expected behavior and error copy.
# 4. Whether Description is optional on create is not stated in AC; empty description behavior should be confirmed.
# 5. Whether Program Name is trimmed before save is not in AC; defect DS-135 suggests trimming is expected — confirm.
# 6. Double-click / duplicate submission guard is not in AC — confirm whether Create should disable after first click or debounce server-side.
# 7. Non-admin access and session-expiry UX are out of scope in AC but affect security testing — confirm roles and error messaging.
# 8. Successful create uses literal "Web Development 2026"; repeated test runs may conflict with duplicate-name rules unless data is isolated or cleaned up.
