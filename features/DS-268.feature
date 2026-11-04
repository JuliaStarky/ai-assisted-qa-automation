Feature: DS-268 Delete program with confirmation
  As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  # Happy paths

  Scenario: Delete program with confirmation
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I click the delete control for "Test Program"
    Then I see a confirmation dialog
    When I confirm deletion
    Then "Test Program" is removed from the program list

  Scenario: Cancel program deletion
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" exists with description "Keep this row"
    When I click the delete control for "Web Development 2026"
    Then I see a confirmation dialog
    When I cancel the confirmation
    Then "Web Development 2026" still exists in the program list
    And that row still shows description "Keep this row"

  Scenario: Confirmed delete removes only the chosen program
    Given I am logged in as admin on Didaxis
    And programs "Test Program" and "Cloud Engineering 2026" exist
    When I click the delete control for "Test Program"
    And I confirm deletion
    Then "Test Program" is removed from the program list
    And "Cloud Engineering 2026" remains in the program list

  # Negative

  Scenario: A program stays in the list when deletion is not confirmed
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I do not confirm deletion of "Test Program"
    Then "Test Program" remains in the program list

  Scenario: Program save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And I am creating a program named "Test Program" with description "Save failure probe"
    When the program save returns HTTP 503
    Then "Test Program" is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program list returns HTTP 200 with an empty list
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with an empty list
    Then the Programs page shows an empty state or stays usable
    And there is no program row to delete

  Scenario: Program list returns HTTP 200 with a malformed body
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with a malformed body
    Then the Programs page shows an error state, an empty state, or stays usable

  Scenario: Program delete returns HTTP 401
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 401
    Then "Test Program" remains in the program list
    And the Programs page shows an error state or stays usable

  Scenario: Program delete returns HTTP 403
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 403
    Then "Test Program" remains in the program list
    And the Programs page shows an error state or stays usable

  Scenario: Program delete returns HTTP 404
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 404
    Then the Programs page shows an error state or stays usable

  Scenario: Program delete returns HTTP 501
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 501
    Then "Test Program" remains in the program list
    And the Programs page shows an error state or stays usable

  Scenario: Program delete returns HTTP 502
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 502
    Then "Test Program" remains in the program list
    And the Programs page shows an error state or stays usable

  Scenario: Program delete returns HTTP 300
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I confirm deletion of "Test Program"
    And the delete request returns HTTP 300
    Then "Test Program" remains in the program list
    And the Programs page shows an error state or stays usable

  # Edge cases

  Scenario: Delete a program whose name contains special characters
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists
    When I click the delete control for "Informatique & IA - Niveau 2"
    And I confirm deletion
    Then "Informatique & IA - Niveau 2" is removed from the program list

  Scenario: Delete the only program in the list
    Given I am logged in as admin on Didaxis
    And "Test Program" is the only program in the list
    When I confirm deletion of "Test Program"
    Then "Test Program" is removed from the program list

  Scenario: Opening delete twice still asks for confirmation before the program disappears
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists
    When I click the delete control for "Test Program" twice
    Then a confirmation dialog is shown
    And "Test Program" is still in the list until deletion is confirmed
    When I confirm deletion once
    Then "Test Program" is removed from the program list

  Scenario: The same name can be created again after a confirmed delete
    Given I am logged in as admin on Didaxis
    And a program "Test Program" existed and was deleted after confirmation
    When I create a new program named "Test Program" with description "Second life"
    Then the program list shows "Test Program" with description "Second life"

# UI recon (2026-11-04)
# - Live UI recon was skipped. DIDAXIS_EMAIL and DIDAXIS_PASSWORD are unset and the repo has no .env file.
# - DIDAXIS_URL is unset. The project default in fixtures/didaxis.helpers.ts is https://test.didaxis.studio.
# - No confirmation dialog copy, button labels, or error strings were captured this run. Do not invent them.
# - Existing page object ProgramsPage.deleteProgramWithDialog listens for a native browser dialog and accept or dismiss. That is repository code, not this run's UI recon.

# Ambiguities and gaps
# 1. The AC says "delete icon" and "confirmation dialog" without naming the control or the dialog text.
# 2. Cancel is an AC action. The ticket does not say whether Cancel is an in-app button or a browser dialog dismiss.
# 3. HTTP 503 is specified for program save. Delete statuses 401, 403, 404, 501, 502, and 300 are the persistence call for this flow. Exact UI copy was not captured.
# 4. HTTP 404 on delete may mean the row is already gone. The scenario only requires the page to show an error state or stay usable.
# 5. Non-admin delete permission is not in the acceptance criteria.
# 6. Shared environments may already contain "Test Program". Automation should seed a unique name and clean up programs it creates.
