Feature: DS-264 Create new academic program
  As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  Background:
    Given I am logged in as admin on Didaxis
    And I am on the Programs page

  # Happy paths

  Scenario: Navigate to program creation form
    When I click "+ New Program"
    Then I see the "New Program" dialog
    And I see the fields "Program Name" and "Description"
    And I see a "Create" button and a "Cancel" button

  Scenario: Successfully create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the create request returns 201
    And the "New Program" dialog closes
    And the program list shows one row "Web Development 2026" with description "Full-stack web development program"

  Scenario: Newly created program appears at the top of the list
    Given I am on the program creation form
    When I create the program "Data Science Fundamentals" with description "Introductory data science track"
    Then the first program row in the list is "Data Science Fundamentals"

  Scenario: Create a program with an empty description
    Given I am on the program creation form
    When I fill in Program Name with "Cybersecurity Bootcamp"
    And I leave Description empty
    Then the Create button is enabled
    When I click Create
    Then the "New Program" dialog closes
    And the program list shows "Cybersecurity Bootcamp"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Optional description"
    Then the Create button is disabled

  Scenario: Whitespace-only program name keeps Create disabled
    Given I am on the program creation form
    When I fill in Program Name with "   "
    Then the Create button is disabled

  Scenario: Clearing a typed program name disables Create again
    Given I am on the program creation form
    When I fill in Program Name with "Cloud Engineering 2026"
    Then the Create button is enabled
    When I clear the Program Name field
    Then the Create button is disabled

  Scenario: Cancel dismisses the form without saving
    Given I am on the program creation form
    When I fill in Program Name with "Temporary Program"
    And I fill in Description with "Should not be saved"
    And I click Cancel
    Then the "New Program" dialog closes
    And no create request is sent
    And the program list does not show "Temporary Program"

  Scenario: Save returns 503 and the form stays open
    Given I am on the program creation form
    And the create request will return 503
    When I fill in Program Name with "Save Error 503"
    And I click Create
    Then the "New Program" dialog stays open
    And the Program Name field still contains "Save Error 503"
    And the Create button is enabled
    And the program list does not show "Save Error 503"
    And no error message is rendered

  Scenario Outline: Save returns <status> and the form stays open
    Given I am on the program creation form
    And the create request will return <status>
    When I fill in Program Name with "Save Error <status>"
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

  Scenario: Empty program list still allows creating the first program
    Given the program list request returns 200 with an empty list
    When I open the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And I see a "Create Program" button
    When I click "+ New Program"
    Then I see the "New Program" dialog

  Scenario: Malformed program list body renders nothing
    Given the program list request returns 200 with the body "not-json"
    When I open the Programs page
    Then the "Programs" heading is not rendered
    And the "+ New Program" button is not rendered
    And no error message is rendered

  Scenario: Special characters in name and description are preserved
    Given I am on the program creation form
    When I create the program "Informatique & IA — Cohorte #1 (2026)" with description "Programme \"bilingue\" <FR/EN> 🎓"
    Then the "New Program" dialog closes
    And the program list shows "Informatique & IA — Cohorte #1 (2026)" with description "Programme \"bilingue\" <FR/EN> 🎓"

  Scenario: Leading and trailing spaces in the name are trimmed
    Given I am on the program creation form
    When I create the program "  Mobile Development 2026  " with description "Trim check"
    Then the create response saves the name as exactly "Mobile Development 2026"

# UI recon (2026-11-04)
# - Tool: Playwright CLI (Node script with @playwright/test chromium). Playwright MCP was available, but its sandbox cannot read env vars, and the password was not pasted into tool args.
# - Env: https://test.didaxis.studio. Admin login (Email / Password / "Sign In") OK; landing https://test.didaxis.studio/ then /programs.
# - Programs page: heading "Programs" (h2), subtitle "Manage academic programs and semesters", button "+ New Program", columnheaders "Program" and an unnamed actions column, ~1630 rows, no search or filter.
# - New Program dialog: heading "New Program" (h2), unnamed close (X) button, textbox "Program Name" (placeholder "e.g. Computer Science BSc"),
#   textbox "Description" (placeholder "Brief description"), "▸ Show AI Generation Config", "Cancel", "Create" (disabled when name is empty or "   ").
# - Create "Web Development 2026 <ts>" / "Full-stack web development program": POST /api/programs 201, body { data: { id, name, ... }, message: "Program created" }, dialog closes, new row is the first row.
# - Mocked POST 401, 403, 404, 501, 502, 503, 300: dialog stays open, name kept, Create enabled, no row added, no alert/status/toast rendered.
# - Mocked GET 200 { data: [] }: "🎓", "No programs yet. Create your first program to get started.", button "Create Program"; "+ New Program" still visible.
# - Mocked GET 200 "not-json" (and { data: "oops" }): main area is empty — no heading, no button, no error copy.
# - Locator hints: getByRole('dialog').filter({ has: getByRole('heading', { name: 'New Program' }) }); getByRole('textbox', { name: 'Program Name' });
#   getByRole('button', { name: 'Create', exact: true }); getByRole('row').filter({ has: getByText(name, { exact: true }) }); getByRole('button', { name: 'Create Program' }).

# Ambiguities and gaps
# 1. Shared env holds ~1630 programs including duplicate "Web Development 2026" rows; automation must append a unique run suffix to every program name.
# 2. Failed saves render no user-visible error (matches DS-116). AC does not define error copy; scenarios assert form state only.
# 3. Malformed list body blanks the Programs view (suspected defect, matches DS-114). Scenario records the observed outcome; confirm the desired fallback UI.
# 4. AC does not define max lengths or duplicate handling for create; those live in DS-266 (clone of DS-3).
# 5. DIDAXIS_API_TOKEN is empty in CI; cleanup relies on the session Bearer captured from app requests.
