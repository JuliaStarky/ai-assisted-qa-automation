Feature: DS-268 Delete program with confirmation
  As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  Background:
    Given I am logged in as admin on Didaxis
    And a program "Test Program" with description "Delete me" exists
    And I am on the Programs page

  # Happy paths

  Scenario: Delete program with confirmation
    When I click the "Delete Test Program" button on its row
    Then I see a confirmation dialog
    When I confirm deletion
    Then the delete request returns 200
    And "Test Program" is removed from the program list

  Scenario: Deleted program stays gone after reload
    Given I deleted "Test Program" and confirmed
    When I reload the Programs page
    Then the program list does not show "Test Program"

  Scenario: Confirmation dialog names the program and warns about consequences
    When I click the "Delete Test Program" button on its row
    Then a confirm dialog shows "Delete program \"Test Program\"? All its semesters and courses will be removed. This cannot be undone."

  Scenario: Deleting one program leaves other programs intact
    Given a second program "Test Program Keep" exists
    When I delete "Test Program" and confirm
    Then the program list does not show "Test Program"
    And the program list still shows "Test Program Keep"

  # Negative

  Scenario: Cancel program deletion
    When I click the "Delete Test Program" button on its row
    And I see the confirmation dialog
    And I click Cancel
    Then no delete request is sent
    And "Test Program" still exists in the list with description "Delete me"

  Scenario: Delete returns 503 and the program remains
    Given the delete request will return 503
    When I delete "Test Program" and confirm
    Then "Test Program" still exists in the list
    And no error message is rendered
    When I reload the Programs page
    Then "Test Program" still exists in the list

  Scenario Outline: Delete returns <status> and the program remains
    Given the delete request will return <status>
    When I delete "Test Program" and confirm
    Then "Test Program" still exists in the list
    And no error message is rendered
    When I reload the Programs page
    Then "Test Program" still exists in the list

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  # Edge cases

  Scenario: Empty program list shows no delete actions
    Given the program list request returns 200 with an empty list
    When I open the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And no "Delete" buttons are rendered

  Scenario: Malformed program list body renders nothing to delete
    Given the program list request returns 200 with the body "not-json"
    When I open the Programs page
    Then the "Programs" heading is not rendered
    And no "Delete" buttons are rendered
    And no error message is rendered

  Scenario: Delete a program whose name has special characters
    Given a program "Informatique & IA — Cohorte #1 (2026)" exists
    When I delete "Informatique & IA — Cohorte #1 (2026)" and confirm
    Then the program list does not show "Informatique & IA — Cohorte #1 (2026)"

# UI recon (2026-11-04)
# - Tool: Playwright CLI (Node script with @playwright/test chromium). Playwright MCP was available, but its sandbox cannot read env vars, and the password was not pasted into tool args.
# - Env: https://test.didaxis.studio. Admin login OK; /programs lists ~1700 rows.
# - Row action: icon-only button "Delete {name}". Clicking it opens a native browser confirm (dialog.type() === "confirm"), not a DOM dialog,
#   message: Delete program "<name>"? All its semesters and courses will be removed. This cannot be undone.
# - Dismiss: no request, row stays. Accept: DELETE /api/programs/<id> 200, row removed.
# - Mocked DELETE 401, 403, 404, 501, 502, 503, 300 (after accepting confirm): row stays, still present after reload, no alert/status/toast.
# - Empty GET { data: [] }: empty state, no Delete buttons. Malformed GET "not-json": blank main area.
# - Locator hints: getByRole('button', { name: `Delete ${name}` }) inside getByRole('row').filter({ has: getByText(name, { exact: true }) }); handle with page.waitForEvent('dialog').

# Ambiguities and gaps
# 1. AC says "confirmation dialog" and "click Cancel"; the app uses the native window.confirm, so Cancel = dialog.dismiss(). Confirm a native confirm is the intended design.
# 2. Failed deletes render no user-visible error; scenarios assert the row stays. Confirm the required error copy.
# 3. AC does not cover cascade (semesters and courses) despite the confirm copy mentioning it; not tested here.
# 4. Shared env has duplicate names; automation must append a unique run suffix to "Test Program".
# 5. Malformed list body blanks the Programs view (suspected defect, matches DS-114).
