Feature: DS-261 No error message shown when program delete API fails
  As an admin user, I want a failed program delete to keep the program and tell me the delete did not succeed.

  # Happy paths

  Scenario: Failed delete with HTTP 500 keeps the program and shows an error
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Test Program" exists in the program list
    When I click the delete control for "Test Program"
    And I confirm deletion
    And the delete API returns HTTP 500
    Then "Test Program" remains in the program list
    And I see a user-visible error indicating the program could not be deleted

  Scenario: Successful delete still removes the program
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Test Program" exists in the program list
    When I click the delete control for "Test Program"
    And I confirm deletion
    And the delete API succeeds
    Then "Test Program" is removed from the program list
    And I do not see an error about a failed delete

  # Negative

  Scenario: Cancelled delete does not show a delete-failure error
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I click the delete control for "Test Program"
    And I cancel the confirmation dialog
    Then "Test Program" remains in the program list
    And I do not see an error indicating the program could not be deleted

  Scenario: Unauthorized delete keeps the program
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete API returns HTTP 401
    Then "Test Program" remains in the program list
    And the page stays usable

  Scenario: Delete is not sent when confirmation is dismissed
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" exists on the Programs page
    When I click the delete control for "Web Development 2026"
    And I dismiss the confirmation dialog
    Then no delete request is completed for "Web Development 2026"
    And "Web Development 2026" remains in the program list

  # Edge cases

  Scenario: Failed delete of a special-character name keeps that program
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists on the Programs page
    When I confirm deletion of "Informatique & IA - Niveau 2"
    And the delete API returns HTTP 500
    Then "Informatique & IA - Niveau 2" remains in the program list
    And I see a user-visible error indicating the program could not be deleted

  Scenario: Failed delete of the only program does not show the empty state
    Given I am logged in as admin on Didaxis
    And "Test Program" is the only program in the list
    When I confirm deletion of "Test Program"
    And the delete API returns HTTP 500
    Then "Test Program" remains in the program list
    And I do not see an empty state that claims no programs exist

  Scenario: A second failed delete still keeps the program
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    And a confirmed delete of "Test Program" already failed with HTTP 500
    When I confirm deletion of "Test Program" again
    And the delete API returns HTTP 500 again
    Then "Test Program" remains in the program list
    And I see a user-visible error indicating the program could not be deleted

  # API outcomes

  Scenario: Delete save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 503
    Then "Test Program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list returns HTTP 200 with an empty list
    Given I am logged in as admin on Didaxis
    When I open the Programs page
    And the program list returns HTTP 200 with an empty list
    Then I see the empty state
    And the page stays usable

  Scenario: Program list returns HTTP 200 with a malformed body
    Given I am logged in as admin on Didaxis
    When I open the Programs page
    And the program list returns HTTP 200 with a malformed body
    Then no program rows are rendered
    And I do not see a specific error message

  Scenario: Program list or delete returns HTTP 403
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 403
    Then "Test Program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 404
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 404
    Then "Test Program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 501
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 501
    Then "Test Program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 502
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 502
    Then "Test Program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 300
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 300
    Then "Test Program" remains in the program list
    And the page stays usable

# UI recon (2026-11-04)
# Live UI recon was skipped because DIDAXIS_EMAIL and DIDAXIS_PASSWORD are not set.
# Locator hints below are from existing page objects in this repo and were not re-checked against the live app this run:
# - Programs heading: getByRole('heading', { name: 'Programs' })
# - Delete control: getByRole('button', { name: `Delete ${programName}` })
# - Confirmation is handled as a native dialog in pages/ProgramsPage.ts (deleteProgramWithDialog)
# Prior features/DS-5.feature recon (2026-10-27), not re-verified this run:
# - GET /api/programs 200 { data: [] } shows empty state "No programs yet. Create your first program to get started." and button "Create Program"
# - GET /api/programs HTTP 500 shows that same empty state and no error copy
# - Malformed GET body renders no program list and the Programs heading is gone
# DS-261 does not record the exact failed-delete error string. Do not invent that copy.

# Ambiguities and gaps
# 1. DS-261 expected result asks for a clear error that the program could not be deleted, but neither the ticket nor this run captured the exact alert, toast, or inline wording.
# 2. The filed defect says HTTP 500 currently leaves the row and shows no alert, toast, or inline error. Scenarios assert the expected error, so a missing message is a product failure of this ticket.
# 3. HTTP 401 is covered as its own negative scenario. HTTP 503, 403, 404, 501, 502, and 300 are separate API outcomes. Exact copy for those statuses was not captured.
# 4. Confirmation may be a native confirm() dialog. The exact message was not re-verified this run.
# 5. Shared environments already contain programs named "Test Program". Automation should seed a unique name and track it for API cleanup.
# 6. Non-admin delete permission is out of scope for this sub-task.
