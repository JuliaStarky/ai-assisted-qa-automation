Feature: DS-256 Valeria - Create new academic program
  As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the "New Program" dialog with fields "Program Name" and "Description"
    And I see a "Cancel" button and a disabled "Create" button

  Scenario: Successfully create a program
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the create request returns 201
    And the New Program dialog closes
    And the program list shows exactly one row named "Web Development 2026"
    And that row shows description "Full-stack web development program"

  Scenario: Create a program with an empty description
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Cybersecurity Bootcamp"
    And I leave Description empty
    Then the Create button is enabled
    When I click Create
    Then the New Program dialog closes
    And the program list shows "Cybersecurity Bootcamp"

  Scenario: Open the creation form from the empty state
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body {"data": []}
    When I navigate to the Programs page
    And I click "Create Program" in the empty state
    Then I see the "New Program" dialog with fields "Program Name" and "Description"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled

  Scenario: Whitespace-only program name keeps Create disabled and sends nothing
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "   "
    And I press Enter in the Program Name field
    Then the Create button is disabled
    And no create request is sent
    And the New Program dialog stays open

  Scenario: Cancel discards the form without saving
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Temporary Program"
    And I fill in Description with "Should not be saved"
    And I click Cancel
    Then the New Program dialog closes
    And the program list does not show "Temporary Program"

  Scenario: Save returns 503 and nothing is created
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return 503
    When I fill in Program Name with "Save Error 503"
    And I click Create
    Then the New Program dialog stays open
    And the Program Name field still contains "Save Error 503"
    And the Create button is enabled
    And no error message is rendered
    And the program list does not show "Save Error 503"

  Scenario Outline: Save returns <status> and nothing is created
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    And the create request will return <status>
    When I fill in Program Name with "Save Error <status>"
    And I click Create
    Then the New Program dialog stays open
    And the Program Name field still contains "Save Error <status>"
    And the Create button is enabled
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

  Scenario Outline: List returns <status> and the page stays usable for creating
    Given I am logged in as admin on Didaxis
    And the program list request returns <status>
    When I navigate to the Programs page
    Then I see the "Programs" heading and the "+ New Program" button
    And I see "No programs yet. Create your first program to get started."
    When I click "+ New Program"
    Then I see the "New Program" dialog

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  # Known bug DS-114 — recon shows a blank main area; expected to fail until fixed
  Scenario: List returns 200 with a malformed body and the page stays usable for creating
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body "not-json"
    When I navigate to the Programs page
    Then I see the "Programs" heading and the "+ New Program" button

  # Known bug DS-122 — duplicates are accepted (201); expected to fail until fixed
  Scenario: Duplicate program name is rejected
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Duplicate attempt"
    And I click Create
    Then the create request is not accepted (response is not 2xx)
    And the program list still shows exactly one row named "Web Development 2026"

  # Edge cases

  Scenario: Special characters in program name are saved unchanged
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Informatique & IA - Niveau 2"
    And I fill in Description with "Programme bilingue"
    And I click Create
    Then the create response saves the name as exactly "Informatique & IA - Niveau 2"
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Leading and trailing spaces in program name are trimmed on create
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "  Mobile Development 2026  "
    And I click Create
    Then the create response saves the name as exactly "Mobile Development 2026"

  Scenario: Program name of 255 characters is accepted
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with a string of exactly 255 characters
    And I click Create
    Then the New Program dialog closes
    And the program list shows the program with that 255-character name

# UI recon (2026-11-05)
# - Tool: Playwright MCP reached /login, but its browser process cannot read DIDAXIS_EMAIL / DIDAXIS_PASSWORD and passing
#   them as tool arguments would expose them, so recon ran as a scripted headless Playwright session (Playwright CLI
#   fallback) with credentials read from the environment. All recon programs were deleted afterwards.
# - Env: https://test.didaxis.studio (DIDAXIS_URL). Login OK; lands on https://test.didaxis.studio/ then /programs loads.
# - Programs page: heading level 2 "Programs", text "Manage academic programs and semesters", button "+ New Program".
# - New Program dialog: heading "New Program", textbox "Program Name" (placeholder "e.g. Computer Science BSc"),
#   textbox "Description" (placeholder "Brief description"), "▸ Show AI Generation Config", "Cancel", "Create" (disabled when empty).
#   Close (X) button has no accessible name.
# - "   " name: Create stays disabled; Enter in the field sends no POST; dialog stays open.
# - POST /api/programs returns 201 with { data: { id, name, description, ... }, message: "Program created" }.
#   The dialog takes longer than 1.5 s to close after a 201 — assert closure with a retrying matcher, not a fixed wait.
# - "Informatique & IA - Niveau 2 <suffix>": 201, name saved unchanged.
# - Duplicate name: second POST returns 201 and a second row appears; no error text (DS-122 still open).
# - Mocked POST 401 / 403 / 404 / 501 / 502 / 503 / 300: dialog stays open, name kept, Create enabled, no row added,
#   no role="alert" and no error copy anywhere (DS-116).
# - Mocked GET list 401 / 403 / 404 / 501 / 502 / 503 / 300 and 200 { data: [] }: heading and "+ New Program" visible,
#   "🎓 No programs yet. Create your first program to get started." plus button "Create Program"; no error copy.
# - Mocked GET list 200 "not-json": main area blank — no "Programs" heading, no "+ New Program" (DS-114).
# - Locator hints: getByRole('dialog').filter({ has: getByRole('heading', { name: 'New Program' }) }),
#   getByRole('textbox', { name: 'Program Name' }), getByRole('button', { name: 'Create', exact: true }),
#   getByRole('button', { name: 'Create Program' }), rows via getByRole('row').filter({ has: getByText(name, { exact: true }) }).

# Ambiguities and gaps
# 1. The shared env already holds many programs with these names (and duplicates are allowed), so specs must append a
#    unique suffix (e.g. Date.now()) to every AC name; the AC values are kept as the visible prefix.
# 2. Failed saves show no message (DS-116) and list errors render the empty state instead of an error (DS-35 / DS-72 / DS-112).
#    Scenarios assert today's observable outcome; confirm the intended error copy so Then steps can assert it.
# 3. Duplicate uniqueness rule (exact vs case-insensitive) and its error copy are not in the AC.
# 4. Maximum name length is not in the AC; 255 is accepted today and 256 is too (DS-138).
# 5. DIDAXIS_API_TOKEN is empty in this CI environment; cleanup relies on the session bearer captured by fixtures/cleanup.fixture.ts.
