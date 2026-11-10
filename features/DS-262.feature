Feature: DS-262 Double-clicking delete icon opens two confirmation dialogs
  As an admin user, I want one confirmation when I delete a program, including when I activate the delete control more than once.

  # Happy paths

  Scenario: Double-clicking delete opens a single confirmation dialog
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Test Program" exists in the program list
    When I double-click the delete control for "Test Program"
    Then exactly one confirmation dialog is shown

  Scenario: Confirming the single dialog deletes the program once
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    And exactly one confirmation dialog is shown
    And I confirm that dialog once
    Then "Test Program" is removed from the program list
    And no second confirmation dialog appears

  Scenario: A single click still opens one confirmation dialog
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" exists on the Programs page
    When I click the delete control for "Web Development 2026" once
    Then exactly one confirmation dialog is shown
    When I cancel that dialog
    Then "Web Development 2026" remains in the program list

  # Negative

  Scenario: Double-click does not open a second confirmation dialog
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    Then a second confirmation dialog is not shown
    And "Test Program" is not removed until I confirm the single dialog

  Scenario: Cancelling the single dialog after a double-click keeps the program
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    And I cancel the one confirmation dialog
    Then "Test Program" remains in the program list
    And no further confirmation dialog appears

  Scenario: Unauthorized delete after one confirmation keeps the program
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    And I confirm the single dialog
    And the delete API returns HTTP 401
    Then "Test Program" remains in the program list
    And the page stays usable

  # Edge cases

  Scenario: Double-click delete on a special-character name opens one dialog
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists on the Programs page
    When I double-click the delete control for "Informatique & IA - Niveau 2"
    Then exactly one confirmation dialog is shown
    And the dialog identifies "Informatique & IA - Niveau 2"

  Scenario: Double-click delete on the only program opens one dialog
    Given I am logged in as admin on Didaxis
    And "Test Program" is the only program in the list
    When I double-click the delete control for "Test Program"
    Then exactly one confirmation dialog is shown
    When I confirm that dialog once
    Then "Test Program" is removed from the program list

  Scenario: Triple-click on the delete control still opens one dialog
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I activate the delete control for "Test Program" three times in quick succession
    Then exactly one confirmation dialog is shown

  # API outcomes

  Scenario: Delete save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    And I confirm the single dialog
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
    When I confirm deletion of "Test Program" from the single dialog opened by a double-click
    And the delete request returns HTTP 403
    Then "Test Program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 404
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program" from the single dialog opened by a double-click
    And the delete request returns HTTP 404
    Then "Test Program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 501
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program" from the single dialog opened by a double-click
    And the delete request returns HTTP 501
    Then "Test Program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 502
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program" from the single dialog opened by a double-click
    And the delete request returns HTTP 502
    Then "Test Program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 300
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program" from the single dialog opened by a double-click
    And the delete request returns HTTP 300
    Then "Test Program" remains in the program list
    And the page stays usable

# UI recon (2026-11-04)
# Live UI recon was skipped because DIDAXIS_EMAIL and DIDAXIS_PASSWORD are not set.
# Locator hints below are from existing page objects in this repo and were not re-checked against the live app this run:
# - Delete control: getByRole('button', { name: `Delete ${programName}` })
# - Confirmation is handled as a native dialog in pages/ProgramsPage.ts (deleteProgramWithDialog)
# DS-262 actual result says two native confirmation dialogs appear sequentially (dialogCount = 2). Expected result is one dialog.
# Exact confirmation copy was not captured this run. Do not invent it.
# Prior features/DS-5.feature recon (2026-10-27), not re-verified this run:
# - GET /api/programs 200 { data: [] } shows empty state "No programs yet. Create your first program to get started." and button "Create Program"
# - Malformed GET body renders no program list and the Programs heading is gone

# Ambiguities and gaps
# 1. The ticket does not say whether the second click should be ignored, debounced, or disabled while the first dialog is open.
# 2. Exact dialog wording was not re-verified. Assert dialog count and that the dialog identifies the program name. Do not invent the rest of the message.
# 3. HTTP 500 with no error copy is a separate defect (DS-261). These scenarios do not require a specific failed-delete string.
# 4. Shared environments may already contain "Test Program". Seed a unique name and track it for API cleanup.
