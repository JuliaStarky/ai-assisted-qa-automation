Feature: DS-294 Mark - Program list filtering and display
  As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  # Happy paths

  Scenario: Display program list with key details
    Given I am logged in as admin on Didaxis
    And a program "DS-294 Display <timestamp>" exists with description "Program list display check"
    When I navigate to the Programs page
    Then I see the heading "Programs"
    And I see the subtitle "Manage academic programs and semesters"
    And I see a table with the column header "Program"
    And the row for "DS-294 Display <timestamp>" shows the name "DS-294 Display <timestamp>"
    And that row shows the description "Program list display check"

  Scenario: Each listed program shows its own description
    Given I am logged in as admin on Didaxis
    And a program "DS-294 Alpha <timestamp>" exists with description "Alpha cohort description"
    And a program "DS-294 Beta <timestamp>" exists with description "Beta cohort description"
    When I navigate to the Programs page
    Then the row for "DS-294 Alpha <timestamp>" shows "Alpha cohort description"
    And the row for "DS-294 Beta <timestamp>" shows "Beta cohort description"
    And the row for "DS-294 Alpha <timestamp>" does not show "Beta cohort description"

  Scenario: Empty state when no programs exist
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns HTTP 200 with body { "data": [] }
    When I navigate to the Programs page
    Then I see the message "No programs yet. Create your first program to get started."
    And I see no program rows

  Scenario: Empty state prompts the user to create the first program
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns HTTP 200 with body { "data": [] }
    When I navigate to the Programs page
    Then I see a "Create Program" button
    When I click "Create Program"
    Then the "New Program" dialog opens
    And it shows a "Program Name" textbox and a "Description" textbox

  # Negative

  Scenario: Empty state is not shown when programs exist
    Given I am logged in as admin on Didaxis
    And a program "DS-294 Not Empty <timestamp>" exists with description "Proves the list is populated"
    When I navigate to the Programs page
    Then I do not see the message "No programs yet. Create your first program to get started."
    And I do not see the "Create Program" button
    And I see the row for "DS-294 Not Empty <timestamp>"

  Scenario: Unauthenticated user cannot view the program list
    Given I am not logged in
    When I open /programs directly
    Then I am redirected to /login
    And I see the "Sign In" button
    And I do not see the heading "Programs"

  Scenario Outline: Failed program list load is not presented as "no programs"
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns HTTP <status>
    When I navigate to the Programs page
    Then I do not see the message "No programs yet. Create your first program to get started."
    And the page stays usable: I see the heading "Programs" and the "+ New Program" button

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  Scenario: Malformed program list response does not blank the page
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns HTTP 200 with the non-JSON body "not-json"
    When I navigate to the Programs page
    Then I still see the heading "Programs"
    And I still see the "+ New Program" button

  Scenario: Failed save does not add a phantom row to the list
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And POST /api/programs returns HTTP 503
    When I create a program named "DS-294 Save 503 <timestamp>" with description "Should not be listed"
    Then I do not see a row for "DS-294 Save 503 <timestamp>"
    And the page stays usable: I see the heading "Programs" and the "+ New Program" button

  # Edge cases

  Scenario: Special characters in name and description are displayed exactly
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA <timestamp>" exists with description "Curriculum \"advanced\" & research <R&D>"
    When I navigate to the Programs page
    Then the row for "Informatique & IA <timestamp>" shows the description "Curriculum \"advanced\" & research <R&D>" as literal text

  Scenario: Program with an empty description is still listed
    Given I am logged in as admin on Didaxis
    And a program "DS-294 No Description <timestamp>" exists with an empty description
    When I navigate to the Programs page
    Then I see the row for "DS-294 No Description <timestamp>"
    And that row shows Edit and Delete controls named "Edit DS-294 No Description <timestamp>" and "Delete DS-294 No Description <timestamp>"

  Scenario: Long program name is listed in full
    Given I am logged in as admin on Didaxis
    And a program exists whose name is "DS-294 Long <timestamp> " padded with "x" to 255 characters
    When I navigate to the Programs page
    Then the row for that program shows the full 255-character name

  Scenario: Newly created program appears at the top of a large list
    Given I am logged in as admin on Didaxis
    And the Programs page already lists thousands of programs
    When I create a program named "DS-294 Newest <timestamp>" with description "Newest program first"
    Then the first program row shows "DS-294 Newest <timestamp>"
    And it shows the description "Newest program first"

# UI recon (2026-11-06)
# - Tool: Playwright library script (node, reads DIDAXIS_EMAIL / DIDAXIS_PASSWORD from env). Playwright MCP was skipped so credentials were not passed as tool arguments in an unattended CI log.
# - Env: https://test.didaxis.studio (DIDAXIS_URL); admin login via Email / Password / "Sign In" → landing https://test.didaxis.studio/ (heading "Dashboard")
# - Programs route: https://test.didaxis.studio/programs; GET /api/programs → 200
# - Labels: heading level 2 "Programs"; paragraph "Manage academic programs and semesters"; button "+ New Program"; table columnheader "Program" plus an unlabeled actions columnheader
# - Rows: ~3,197 data rows, no pagination; first cell has two paragraphs (name, then description); action buttons "Edit {name}" / "Delete {name}" (icon-only); newest program listed first
# - No search, filter, or sort controls on /programs (0 textbox / searchbox / combobox outside dialogs)
# - Empty GET { data: [] }: paragraph "🎓", paragraph "No programs yet. Create your first program to get started.", button "Create Program"; "+ New Program" remains
# - "Create Program" opens dialog "New Program" with textbox "Program Name" (placeholder "e.g. Computer Science BSc"), textbox "Description" (placeholder "Brief description"), "▸ Show AI Generation Config", "Cancel", "Create" (disabled until a name is entered)
# - GET 401 / 403 / 404 / 500 / 501 / 502 / 503 / 300: every case renders the same empty state as an empty list; no error copy rendered (suspected defect; matches linked DS-35 / DS-72 / DS-112)
# - GET 200 malformed body "not-json": entire page renders blank, including navigation and the "Programs" heading (suspected defect; matches linked DS-114)
# - POST /api/programs 503: New Program dialog closes, no error message rendered, list unchanged
# - Unauthenticated /programs → redirected to https://test.didaxis.studio/login ("Sign in to your account", Email, Password, "Sign In")
# - Locator hints: getByRole('heading', { name: 'Programs' }); getByRole('button', { name: '+ New Program' }); getByRole('columnheader', { name: 'Program' }); getByRole('row').filter({ has: getByText(name, { exact: true }) }); getByText('No programs yet. Create your first program to get started.', { exact: true }); getByRole('button', { name: 'Create Program' }); getByRole('dialog').filter({ has: getByRole('heading', { name: 'New Program' }) }); getByRole('button', { name: `Edit ${name}` })

# Ambiguities and gaps
# 1. The title says "filtering", but the acceptance criteria cover only display and the empty state, and /programs has no search, filter, or sort UI. Filtering is left out of this plan; confirm whether it is in scope.
# 2. The acceptance criteria do not specify the empty-state wording; the scenarios use the copy seen during recon ("No programs yet. Create your first program to get started." and "Create Program").
# 3. Error UX for a failed list load is undefined. The app shows "No programs yet" for every non-2xx status, which tells the admin there are no programs when the load failed (DS-35 / DS-72 / DS-112). The scenarios assert only that the empty state is not shown and the page stays usable, because no error copy exists to assert.
# 4. A malformed list response blanks the whole page (DS-114). The expected fallback UI is not defined.
# 5. A 503 on save closes the dialog with no feedback. The acceptance criteria do not cover save errors; confirm whether an error message is required.
# 6. "Programs exist in the system" cannot be isolated on the shared environment (~3,197 programs, including duplicates). Tests seed uniquely named programs (timestamp suffix) and mock GET for the empty and error cases rather than emptying the database.
# 7. With no pagination, a list of more than 3,000 rows is hard to "quickly find" in. Confirm whether filtering or pagination (DS-222) is the intended follow-up for this story.
# 8. The actions column header has no accessible name (DS-117), and the row's accessible name concatenates the name, description, and action labels (DS-87).
