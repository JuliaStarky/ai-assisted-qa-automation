Feature: DS-265 Edit existing program details
  As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  Background:
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" with description "Full-stack web development program" exists
    And I am on the Programs page

  # Happy paths

  Scenario: Open program for editing
    When I click the "Edit Web Development 2026" button on its row
    Then I see the "Edit Program" dialog
    And the Program Name field contains "Web Development 2026"
    And the Description field contains "Full-stack web development program"
    And I see a "Save" button and a "Cancel" button

  Scenario: Successfully edit a program name
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the update request returns 200
    And the "Edit Program" dialog closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list no longer shows a row named "Web Development 2026"

  Scenario: Edit preserves unchanged fields
    Given I am editing "Web Development 2026"
    When I only change the Description to "Updated description only"
    And I click Save
    Then the "Edit Program" dialog closes
    And the update response keeps the name "Web Development 2026"
    And the update response keeps total_hours, default_session_hours, default_exam_hours, target_audience, focus_areas and sync_async_ratio equal to the values returned on create
    When I reload the Programs page and open "Web Development 2026" for editing again
    Then the Program Name field contains "Web Development 2026"
    And the Description field contains "Updated description only"

  Scenario: Cancel discards edits
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Should Not Persist"
    And I click Cancel
    Then the "Edit Program" dialog closes
    And no update request is sent
    And the program list still shows "Web Development 2026"
    And the program list does not show "Should Not Persist"

  # Negative

  Scenario: Empty program name cannot be saved
    Given I am editing "Web Development 2026"
    When I clear the Program Name field
    Then the Save button is disabled

  Scenario: Whitespace-only program name cannot be saved
    Given I am editing "Web Development 2026"
    When I change the Program Name to "   "
    Then the Save button is disabled

  Scenario: Save returns 503 and the edit form stays open
    Given I am editing "Web Development 2026"
    And the update request will return 503
    When I change the Program Name to "Web Development 2026 X503"
    And I click Save
    Then the "Edit Program" dialog stays open
    And the Program Name field still contains "Web Development 2026 X503"
    And the Save button is enabled
    And the program list still shows "Web Development 2026"
    And no error message is rendered

  Scenario Outline: Save returns <status> and the edit form stays open
    Given I am editing "Web Development 2026"
    And the update request will return <status>
    When I change the Program Name to "Web Development 2026 X<status>"
    And I click Save
    Then the "Edit Program" dialog stays open
    And the Program Name field still contains "Web Development 2026 X<status>"
    And the Save button is enabled
    And the program list still shows "Web Development 2026"
    And the program list does not show "Web Development 2026 X<status>"
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

  Scenario: Empty program list shows no rows to edit
    Given the program list request returns 200 with an empty list
    When I open the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And no "Edit" buttons are rendered

  Scenario: Malformed program list body renders nothing to edit
    Given the program list request returns 200 with the body "not-json"
    When I open the Programs page
    Then the "Programs" heading is not rendered
    And no "Edit" buttons are rendered
    And no error message is rendered

  Scenario: Special characters in edited name and description are preserved
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Informatique & IA — Cohorte #1 (2026)"
    And I change the Description to "Programme \"bilingue\" <FR/EN> 🎓"
    And I click Save
    Then the "Edit Program" dialog closes
    And the program list shows "Informatique & IA — Cohorte #1 (2026)" with description "Programme \"bilingue\" <FR/EN> 🎓"

  Scenario: Clearing the description saves an empty description
    Given I am editing "Web Development 2026"
    When I clear the Description field
    And I click Save
    Then the "Edit Program" dialog closes
    And the update response saves an empty description
    And the program list still shows "Web Development 2026"

# UI recon (2026-11-04)
# - Tool: Playwright CLI (Node script with @playwright/test chromium). Playwright MCP was available, but its sandbox cannot read env vars, and the password was not pasted into tool args.
# - Env: https://test.didaxis.studio. Admin login OK; /programs lists ~1630 rows; newest program is the first row.
# - Row actions: button "Edit {name}" and button "Delete {name}" (icon-only, accessible names include the program name).
# - Edit dialog: heading "Edit Program" (h2), unnamed close (X) button, textbox "Program Name" and textbox "Description" pre-populated with current values,
#   "▸ Show AI Generation Config" (collapsed; holds hours / audience / focus fields), "Cancel", "Save".
# - Save is disabled when Program Name is empty or "   ".
# - Rename "<name>" → "<name> - Updated": PATCH /api/programs/<id> 200, dialog closes, list shows the new name immediately, old name gone.
# - Description-only edit: after reload, Program Name unchanged and Description updated.
# - Create response defaults: total_hours null, default_session_hours 4, default_exam_hours 3, target_audience null, focus_areas null, sync_async_ratio 70.
# - Mocked PATCH 401, 403, 404, 501, 502, 503, 300: dialog stays open, edited name kept, Save enabled, original row unchanged, no alert/status/toast.
# - Mocked GET 200 { data: [] }: empty state "No programs yet. Create your first program to get started." with "Create Program"; mocked GET "not-json": blank main area.
# - Locator hints: getByRole('button', { name: `Edit ${name}` }); getByRole('dialog').filter({ has: getByRole('heading', { name: 'Edit Program' }) });
#   getByRole('textbox', { name: 'Program Name' }); getByRole('button', { name: 'Save' }).

# Ambiguities and gaps
# 1. "Other fields remain unchanged" is undefined; the AI Generation Config fields are collapsed, so preservation is asserted on the PATCH response body versus the POST response.
# 2. Failed saves render no user-visible error (matches DS-116 / DS-11). Scenarios assert form state only; confirm the required error copy.
# 3. Renaming to an existing name and max lengths are not in this AC; see DS-266 (clone of DS-3).
# 4. Shared env holds duplicate "Web Development 2026" rows; automation must append a unique run suffix to every program name.
# 5. Malformed list body blanks the Programs view (suspected defect, matches DS-114).
