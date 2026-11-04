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
    Then the Create button is enabled
    When I click Create
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

  # Known bug DS-122 / DS-133 / DS-137 — expected to fail until fixed
  Scenario: Duplicate program name is rejected
    Given I am logged in as admin on Didaxis
    And a program named "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Duplicate attempt"
    And I click Create
    Then the create request is not accepted (response is not 2xx)
    And the program list still shows exactly one program named "Web Development 2026"

  Scenario: Non-admin user cannot open program creation
    Given I am logged in as a non-admin user on Didaxis
    When I navigate to the Programs page
    Then I do not see a "+ New Program" button

  Scenario: Unauthorized save keeps the form open and saves nothing
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return 401
    When I fill in Program Name with "Session Expired Program"
    And I fill in Description with "Valid description"
    And I click Create
    Then the New Program modal stays open
    And the Program Name field still contains "Session Expired Program"
    And the Create button is enabled
    And the program list does not show "Session Expired Program"

  Scenario Outline: Failed save keeps the form open and saves nothing
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return <status>
    When I fill in Program Name with "Save Error <status>"
    And I fill in Description with "Valid description"
    And I click Create
    Then the New Program modal stays open
    And the Program Name field still contains "Save Error <status>"
    And the Create button is enabled
    And the program list does not show "Save Error <status>"

    Examples:
      | status |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 503    |
      | 300    |

  # Known bug DS-138 — expected to fail until fixed
  Scenario: Program name exceeding maximum length is rejected
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with a string of 256 characters
    And I fill in Description with "Over max length"
    And I click Create
    Then the create request is not accepted (response is not 2xx)
    And the program list does not contain a program with that 256-character name

  # Known bug DS-139 — expected to fail until fixed
  Scenario: Description exceeding maximum length is rejected
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Valid Program Name"
    And I fill in Description with a string of 2001 characters
    And I click Create
    Then the create request is not accepted (response is not 2xx)
    And the program list does not show "Valid Program Name"

  # Edge cases

  Scenario: Program name at maximum allowed length is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with a string of exactly 255 characters
    And I fill in Description with "Max length name test"
    And I click Create
    Then the New Program modal closes
    And the program list shows the program with that 255-character name

  Scenario: Special characters in program name and description are preserved
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "QA & Testing — Cohort #1 (2026)"
    And I fill in Description with "Description with \"quotes\", <tags>, and émojis 🎓"
    And I click Create
    Then the New Program modal closes
    And the program list shows "QA & Testing — Cohort #1 (2026)"
    And that row shows the description unchanged

  Scenario: Leading and trailing spaces in program name are trimmed on create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "  Mobile Development 2026  "
    And I fill in Description with "Trim behavior check"
    And I click Create
    Then the New Program modal closes
    And the create response saves the name as exactly "Mobile Development 2026"
    And the program list shows "Mobile Development 2026"

  # Known bug DS-146 / DS-190 — expected to fail until fixed
  Scenario: Case-variant duplicate program name is rejected
    Given I am logged in as admin on Didaxis
    And a program named "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in Program Name with "web development 2026"
    And I fill in Description with "Case variant duplicate"
    And I click Create
    Then the create request is not accepted (response is not 2xx)
    And the program list does not show "web development 2026"

  # Known bug DS-123 / DS-141 — expected to fail until fixed
  Scenario: Rapid double-click on Create submits only once
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Cloud Engineering 2026"
    And I fill in Description with "Double submit test"
    And I double-click Create
    Then the New Program modal closes
    And the program list shows exactly one program named "Cloud Engineering 2026"

# UI recon (2026-11-04)
# - Env: https://test.didaxis.studio, admin session from the setup project's storageState (login OK, lands on /programs).
# - New Program dialog (a11y tree): heading "New Program", textbox "Program Name" (required, placeholder "e.g. Computer Science BSc"),
#   textbox "Description" (placeholder "Brief description"), button "▸ Show AI Generation Config", button "Cancel", button "Create" (disabled when name empty).
#   Close (X) button has no accessible name (DS-246).
# - No maxlength attribute on any field. Name 256 chars: Create stays enabled, POST returns 201, 256-char name saved (DS-138 still open).
# - Description 2001 chars: Create enabled, POST returns 201, saved in full (DS-139 still open).
# - "  Recon Trim <n>  ": POST 201, saved name trimmed — DS-135 / DS-140 appear fixed.
# - Mocked POST 401 / 503 / 300: dialog stays open, Program Name value kept, Create re-enabled, no row added,
#   and no alert, status, or notification is shown (DS-116 — no user-visible error). Then steps therefore assert form state, not copy.
# - Duplicate and double-click defects still reproduce in the current suite (TC-008, TC-015 expected failures).
# - Locator hints: getByRole('dialog').filter({ has: heading 'New Program' }), getByRole('textbox', { name: 'Program Name' }),
#   getByRole('button', { name: 'Create', exact: true }), rows via getByRole('row').filter({ has: getByText(name, { exact: true }) }).
#   Note: Playwright text matching normalizes whitespace, so trim must be asserted on the POST response body, not the row text.

# Ambiguities and gaps
# 1. Max Program Name length: app accepts 255 and 256; linked bugs cite 100 and 255. Suite assumes 255 — confirm product limit.
# 2. Max Description length: bugs cite 500 and 2000. Suite uses 2001 so it exceeds either limit — confirm.
# 3. Duplicate uniqueness (exact vs case-insensitive) and error copy are not in the AC — confirm expected message.
# 4. Failed saves show no message (DS-116). Once copy exists, add it to the failed-save Then steps.
# 5. Non-admin scenario needs a non-admin test account; still skipped.
