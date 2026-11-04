Feature: DS-266 Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  Background:
    Given I am logged in as admin on Didaxis
    And I am on the Programs page

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the program name
    And I fill in Description with "Programme bilingue"
    And I click Create
    Then the create request returns 201
    And the "New Program" dialog closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Accept a single-character program name
    Given I am on the program creation form
    When I enter "X" followed by a unique run suffix as the program name
    And I click Create
    Then the create request returns 201
    And the program list shows that name

  Scenario: Leading and trailing spaces are trimmed before saving
    Given I am on the program creation form
    When I enter "  Mobile Development 2026  " as the program name
    And I click Create
    Then the create response saves the name as exactly "Mobile Development 2026"

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am on the program creation form
    When I enter "   " as the program name
    Then the Create button is disabled
    And no create request is sent

  Scenario: Reject empty program name
    Given I am on the program creation form
    When I leave the program name empty
    And I fill in Description with "Name missing"
    Then the Create button is disabled

  # Known bug DS-122 / DS-133 / DS-137 — duplicate create returns 201 today
  Scenario: Reject duplicate program name
    Given a program "Web Development 2026" already exists
    When I try to create a new program with the name "Web Development 2026"
    Then I see an error indicating the name already exists
    And the create request is not accepted (response is not 2xx)
    And the program list still shows exactly one program named "Web Development 2026"

  # Known bug DS-146 / DS-190 — case-variant duplicate is accepted today
  Scenario: Reject case-variant duplicate program name
    Given a program "Web Development 2026" already exists
    When I try to create a new program with the name "web development 2026"
    Then the create request is not accepted (response is not 2xx)

  # Known bug DS-129 / DS-131 — rename to an existing name is accepted today
  Scenario: Reject renaming a program to an existing name
    Given programs "Web Development 2026" and "Data Science Fundamentals" exist
    When I edit "Data Science Fundamentals" and change its name to "Web Development 2026"
    And I click Save
    Then the update request is not accepted (response is not 2xx)
    And the program list still shows exactly one program named "Web Development 2026"

  Scenario: Whitespace-only name cannot be saved on edit
    Given a program "Web Development 2026" exists
    When I edit it and change the name to "   "
    Then the Save button is disabled

  Scenario: Save returns 503 and the form stays open
    Given I am on the program creation form
    And the create request will return 503
    When I enter "Save Error 503" as the program name
    And I click Create
    Then the "New Program" dialog stays open
    And the Program Name field still contains "Save Error 503"
    And the Create button is enabled
    And the program list does not show "Save Error 503"
    And no error message is rendered

  Scenario Outline: Save returns <status> and the form stays open
    Given I am on the program creation form
    And the create request will return <status>
    When I enter "Save Error <status>" as the program name
    And I click Create
    Then the "New Program" dialog stays open
    And the Program Name field still contains "Save Error <status>"
    And the Create button is enabled
    And the program list does not show "Save Error <status>"
    And no error message is rendered

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  # Edge cases

  Scenario: Program name of exactly 255 characters is accepted
    Given I am on the program creation form
    When I enter a 255-character program name
    And I click Create
    Then the create request returns 201
    And the program list shows that name

  # Known bug DS-138 — 256-character names are accepted today
  Scenario: Program name of 256 characters is rejected
    Given I am on the program creation form
    When I enter a 256-character program name
    And I click Create
    Then the create request is not accepted (response is not 2xx)

  Scenario: Empty program list does not block creating a new name
    Given the program list request returns 200 with an empty list
    When I open the Programs page
    Then I see "No programs yet. Create your first program to get started."
    When I click "Create Program"
    Then I see the "New Program" dialog with the Create button disabled

  Scenario: Malformed program list body renders nothing
    Given the program list request returns 200 with the body "not-json"
    When I open the Programs page
    Then the "Programs" heading is not rendered
    And the "+ New Program" button is not rendered
    And no error message is rendered

# UI recon (2026-11-04)
# - Tool: Playwright CLI (Node script with @playwright/test chromium). Playwright MCP was available, but its sandbox cannot read env vars, and the password was not pasted into tool args.
# - Env: https://test.didaxis.studio. Admin login OK; /programs lists ~1700 rows.
# - New Program dialog: Create is disabled for an empty name and for "   " (no request is sent). Edit dialog: Save is disabled for empty and "   ".
# - "Informatique & IA - Niveau 2 <ts>": POST 201, saved verbatim, row shown.
# - Duplicate "Web Development 2026 <ts>": second POST returns 201 "Program created"; list shows 2 rows; no error rendered (AC 3 fails — known DS-122 family).
# - Mocked POST 401, 403, 404, 501, 502, 503, 300: dialog stays open, name kept, Create enabled, no row, no alert/status/toast.
# - Empty GET { data: [] }: "No programs yet. Create your first program to get started." + "Create Program" (opens the New Program dialog). Malformed GET "not-json": blank main area.
# - Locator hints: getByRole('textbox', { name: 'Program Name' }); getByRole('button', { name: 'Create', exact: true }); getByRole('button', { name: 'Create Program' }).

# Ambiguities and gaps
# 1. AC 1 says "click Create" with "   "; the app disables Create instead, so the form cannot be submitted. Scenario asserts the disabled button plus no request.
# 2. AC 3 error copy is not specified and the app renders none (duplicate accepted). The duplicate scenario is an expected failure until DS-122 is fixed; the text locator is a loose /already exists/ match.
# 3. Uniqueness rule (exact vs case-insensitive, trim-aware) and the max length (255 assumed from DS-1/DS-138) need product confirmation.
# 4. Shared env already contains duplicate names; automation must use unique run suffixes and clean up both rows a duplicate test creates.
# 5. Malformed list body blanks the Programs view (suspected defect, matches DS-114).
