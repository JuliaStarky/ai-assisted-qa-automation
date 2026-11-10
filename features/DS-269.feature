Feature: DS-269 Program list filtering and display
  As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  Background:
    Given I am logged in as admin on Didaxis

  # Happy paths

  Scenario: Display program list with key details
    Given a program "Web Development 2026" with description "Full-stack web development program" exists
    When I navigate to the Programs page
    Then I see the heading "Programs" and the subtitle "Manage academic programs and semesters"
    And I see a "Program" column header
    And the row "Web Development 2026" shows the description "Full-stack web development program"
    And the row has "Edit Web Development 2026" and "Delete Web Development 2026" buttons

  Scenario: Newly created program appears at the top of the list
    Given I am on the Programs page
    When I create the program "Data Science Fundamentals" with description "Introductory data science track"
    Then the first program row is "Data Science Fundamentals"

  Scenario: Empty state when no programs exist
    Given the program list request returns 200 with an empty list
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And I see a "Create Program" button
    When I click "Create Program"
    Then I see the "New Program" dialog

  # Negative

  Scenario: Empty state is not shown when programs exist
    Given a program "Web Development 2026" exists
    When I navigate to the Programs page
    Then I do not see "No programs yet. Create your first program to get started."

  Scenario: Malformed program list body renders nothing
    Given the program list request returns 200 with the body "not-json"
    When I navigate to the Programs page
    Then the "Programs" heading is not rendered
    And the "+ New Program" button is not rendered
    And no error message is rendered

  Scenario: List request returns 503 and the empty state is shown
    Given the program list request returns 503
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And the "+ New Program" button is visible
    And no error message is rendered

  Scenario Outline: List request returns <status> and the empty state is shown
    Given the program list request returns <status>
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And the "+ New Program" button is visible
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

  Scenario: Program without a description shows only its name
    Given a program "Cybersecurity Bootcamp" with an empty description exists
    When I navigate to the Programs page
    Then the row "Cybersecurity Bootcamp" shows the name and no description text

  Scenario: Special characters display unchanged in the list
    Given a program "Informatique & IA — Cohorte #1 (2026)" with description "Programme \"bilingue\" <FR/EN> 🎓" exists
    When I navigate to the Programs page
    Then the row shows "Informatique & IA — Cohorte #1 (2026)" and "Programme \"bilingue\" <FR/EN> 🎓" as text

  Scenario: Programs page has no search or filter control
    When I navigate to the Programs page
    Then no searchbox is rendered

# UI recon (2026-11-04)
# - Tool: Playwright CLI (Node script with @playwright/test chromium). Playwright MCP was available, but its sandbox cannot read env vars, and the password was not pasted into tool args.
# - Env: https://test.didaxis.studio. Admin login OK; landing https://test.didaxis.studio/, then /programs.
# - Page: heading "Programs" (h2), paragraph "Manage academic programs and semesters", button "+ New Program", table with columnheaders "Program" and an unnamed actions column.
# - ~1700 programs (GET /api/programs 200 { data: [...] }), no pagination, no search/filter input; newest program is the first row.
# - Row: cell with paragraph name then paragraph description (description paragraph absent when empty), then buttons "Edit {name}" and "Delete {name}".
# - Mocked GET 200 { data: [] }: "🎓", "No programs yet. Create your first program to get started.", button "Create Program" (opens New Program dialog); "+ New Program" still shown.
# - Mocked GET 401, 403, 404, 501, 502, 503, 300: same empty state, no error copy (suspected defect, matches DS-35 / DS-72 / DS-112).
# - Mocked GET 200 "not-json" and { data: "oops" }: blank main area — no heading, no buttons, no error (suspected defect, matches DS-114).
# - Locator hints: getByRole('heading', { name: 'Programs' }); getByRole('columnheader', { name: 'Program' }); getByRole('row').filter({ has: getByText(name, { exact: true }) });
#   getByText('No programs yet. Create your first program to get started.'); getByRole('button', { name: 'Create Program' }).

# Ambiguities and gaps
# 1. Title says "filtering" but the AC covers display only and the page has no filter/search UI (DS-221). Confirm whether filtering is in scope.
# 2. List errors (401-503, 300) render the "no programs" empty state, which misleads admins; scenarios record observed behavior. Confirm required error UX.
# 3. Malformed body blanks the page; scenario records observed behavior. Confirm required fallback.
# 4. Empty-state copy is not in the AC; recon copy is used verbatim.
# 5. ~1700 programs with no pagination (DS-222); assertions must target seeded unique rows, never full-list counts.
