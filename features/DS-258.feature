Feature: DS-258 Valeria - Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the program name
    And I fill in Description with "Programme bilingue"
    And I click Create
    Then the create request returns 201
    And the create response saves the name as exactly "Informatique & IA - Niveau 2"
    And the New Program dialog closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Accept a unique program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Web Development 2026" as the program name
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the New Program dialog closes
    And the program list shows exactly one row named "Web Development 2026"

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "   " as the program name
    And I fill in Description with "Whitespace name attempt"
    Then the Create button is disabled
    When I press Enter in the Program Name field
    Then no create request is sent
    And the New Program dialog stays open

  Scenario: Reject empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "No name attempt"
    Then the Create button is disabled

  # Known bug DS-122 — duplicates are accepted (201, second row, no error); expected to fail until fixed
  Scenario: Reject duplicate program name
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    When I try to create a new program with the name "Web Development 2026"
    Then the create request is not accepted (response is not 2xx)
    And I see an error indicating the name already exists
    And the program list still shows exactly one row named "Web Development 2026"

  # Known bug DS-146 — case-variant duplicates are accepted; expected to fail until fixed
  Scenario: Reject case-variant duplicate program name
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    When I try to create a new program with the name "web development 2026"
    Then the create request is not accepted (response is not 2xx)
    And the program list does not show "web development 2026"

  # Known bug DS-122 — trimmed duplicates are accepted; expected to fail until fixed
  Scenario: Reject duplicate program name padded with spaces
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    When I try to create a new program with the name "  Web Development 2026  "
    Then the create request is not accepted (response is not 2xx)
    And the program list still shows exactly one row named "Web Development 2026"

  Scenario: Save returns 503 and nothing is created
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return 503
    When I enter "Save Error 503" as the program name
    And I click Create
    Then the New Program dialog stays open
    And the Program Name field still contains "Save Error 503"
    And no error message is rendered
    And the program list does not show "Save Error 503"

  Scenario Outline: Save returns <status> and nothing is created
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return <status>
    When I enter "Save Error <status>" as the program name
    And I click Create
    Then the New Program dialog stays open
    And the Program Name field still contains "Save Error <status>"
    And no error message is rendered
    And the program list does not show "Save Error <status>"

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  Scenario Outline: List returns <status> and the creation form still validates names
    Given I am logged in as admin on Didaxis
    And the program list request returns <status>
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    When I click "+ New Program"
    And I enter "   " as the program name
    Then the Create button is disabled

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  Scenario: List returns 200 with an empty list and the creation form still validates names
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body {"data": []}
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    When I click "Create Program"
    And I enter "   " as the program name
    Then the Create button is disabled

  # Known bug DS-114 — recon shows a blank main area; expected to fail until fixed
  Scenario: List returns 200 with a malformed body and the page stays usable
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body "not-json"
    When I navigate to the Programs page and the list response has been received
    Then I see the "Programs" heading and the "+ New Program" button

  # Edge cases

  Scenario: Leading and trailing spaces are trimmed from a valid name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "  Mobile Development 2026  " as the program name
    And I click Create
    Then the create response saves the name as exactly "Mobile Development 2026"

  Scenario: Program name of 255 characters is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a program name of exactly 255 characters
    And I click Create
    Then the create request returns 201
    And the program list shows the program with that 255-character name

  # Known bug DS-138 — 256 characters are accepted (201); expected to fail until fixed
  Scenario: Program name of 256 characters is rejected
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a program name of 256 characters
    And I click Create
    Then the create request is not accepted (response is not 2xx)

  Scenario: Single-character program name is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "X" plus a unique suffix as the program name
    And I click Create
    Then the create request returns 201

# UI recon (2026-11-05)
# - Tool: Playwright MCP reached /login, but its browser process cannot read DIDAXIS_EMAIL / DIDAXIS_PASSWORD and passing
#   them as tool arguments would expose them, so recon ran as a scripted headless Playwright session (Playwright CLI
#   fallback) with credentials read from the environment. All recon programs were deleted afterwards.
# - Env: https://test.didaxis.studio (DIDAXIS_URL). Login OK; /programs shows heading "Programs" and "+ New Program".
# - New Program dialog: textbox "Program Name" (placeholder "e.g. Computer Science BSc"), textbox "Description",
#   "Cancel", "Create" (disabled when name is empty).
# - "   " name: Create stays disabled; Enter in the field sends no POST; dialog stays open.
# - "Informatique & IA - Niveau 2 <suffix>": POST 201, data.name saved unchanged, row shown.
# - Duplicate "Web Development 2026 Recon <suffix>": second POST returns 201, list then shows 2 rows with that name,
#   no error copy (DS-122). The regex /duplicate|already exists/ matches many existing row names in the shared env, so
#   any duplicate-error locator must be scoped to the dialog or an alert, not the whole page.
# - Mocked POST 401 / 403 / 404 / 501 / 502 / 503 / 300: dialog stays open, name kept, Create enabled, no role="alert" (DS-116).
# - Mocked GET list 401 / 403 / 404 / 501 / 502 / 503 / 300 and 200 { data: [] }: empty state
#   "No programs yet. Create your first program to get started." plus "Create Program"; "+ New Program" still works.
# - Mocked GET list 200 "not-json": main area goes blank after the response arrives (heading briefly renders first) (DS-114).
# - Prior suite runs on 2026-11-05: 256-char names accepted (DS-138), case-variant duplicates accepted (DS-146).

# Ambiguities and gaps
# 1. AC says "I click Create" for whitespace, but Create is disabled for "   " — the scenario asserts the disabled button and
#    that Enter sends nothing, which satisfies "form is not submitted".
# 2. Duplicate error copy is not specified and none exists today — the Then step can only assert a non-2xx response and an
#    unchanged row count until copy is defined.
# 3. Uniqueness scope (case-insensitive? trimmed? per organization?) is not in the AC.
# 4. Maximum name length is not in the AC; 255 is assumed from prior tickets.
# 5. Shared env already holds many rows named "Web Development 2026 …" — specs append a unique suffix to every AC name.
