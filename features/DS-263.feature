Feature: DS-263 Delete and edit icons clipped off-screen when a program row is selected
  As an admin user, I want edit and delete actions to stay visible and usable after I select a program row.

  # Happy paths

  Scenario: Selected program row keeps edit and delete actions visible
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Test program" exists in the program list
    When I click the "Test program" row to select it
    Then I see the edit control for "Test program" inside the program list panel
    And I see the delete control for "Test program" inside the program list panel

  Scenario: Delete from a selected row opens one confirmation dialog
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program" on the Programs page
    When I click the delete control for "Test program"
    Then I see one confirmation dialog
    And the dialog message is "Delete program \"Test program\"? All its semesters and courses will be removed. This cannot be undone."

  Scenario: Confirming delete from a selected row removes the program
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program" on the Programs page
    When I click the delete control for "Test program"
    And I confirm the deletion
    Then "Test program" is removed from the program list

  Scenario: Edit from a selected row opens the edit form
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program" on the Programs page
    When I click the edit control for "Test program"
    Then I see the Edit Program form

  # Negative

  Scenario: Selected-row actions are not clipped outside the list panel
    Given I am logged in as admin on Didaxis
    And a program "Test program" exists on the Programs page
    When I click the "Test program" row to select it
    Then the edit control for "Test program" is inside the visible program list panel
    And the delete control for "Test program" is inside the visible program list panel
    And I can activate the delete control without selecting a different program first

  Scenario: Hovering a selected row does not move the actions off-screen
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I hover the selected "Test program" row
    Then the delete control for "Test program" remains inside the visible program list panel
    And the edit control for "Test program" remains inside the visible program list panel

  Scenario: Cancelling delete from a selected row keeps the program
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I click the delete control for "Test program"
    And I cancel the confirmation dialog
    Then "Test program" remains in the program list
    And the delete control for "Test program" is still inside the visible program list panel

  # Edge cases

  Scenario: Actions stay visible for a selected program with special characters
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists on the Programs page
    When I click the "Informatique & IA - Niveau 2" row to select it
    Then the edit control and the delete control for "Informatique & IA - Niveau 2" are inside the visible program list panel

  Scenario: Actions stay visible when the selected program is the only row
    Given I am logged in as admin on Didaxis
    And "Test program" is the only program in the list
    When I click the "Test program" row to select it
    Then the edit control and the delete control for "Test program" are inside the visible program list panel

  Scenario: Unselected row hover still shows actions inside the panel
    Given I am logged in as admin on Didaxis
    And programs "Test program" and "Web Development 2026" exist on the Programs page
    And I have selected "Web Development 2026"
    When I hover the "Test program" row without selecting it
    Then the delete control for "Test program" is inside the visible program list panel

  # API outcomes

  Scenario: Delete save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I click the delete control for "Test program" inside the program list panel
    And I confirm the deletion
    And the delete request returns HTTP 503
    Then "Test program" remains in the program list
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

  Scenario: Program list or delete returns HTTP 401
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 401
    Then "Test program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 403
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 403
    Then "Test program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 404
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 404
    Then "Test program" remains in the program list
    And the page stays usable

  Scenario: Program list or delete returns HTTP 501
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 501
    Then "Test program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 502
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 502
    Then "Test program" remains in the program list
    And the page shows an error state or stays usable

  Scenario: Program list or delete returns HTTP 300
    Given I am logged in as admin on Didaxis
    And I have selected the program row "Test program"
    When I confirm deletion of "Test program" from the visible delete control
    And the delete request returns HTTP 300
    Then "Test program" remains in the program list
    And the page stays usable

# UI recon (2026-11-04)
# Live UI recon was skipped because DIDAXIS_EMAIL and DIDAXIS_PASSWORD are not set.
# Locator hints below are from existing page objects in this repo and were not re-checked against the live app this run:
# - Edit control: getByRole('button', { name: `Edit ${programName}` })
# - Delete control: getByRole('button', { name: `Delete ${programName}` })
# - Row: getByRole('row').filter({ has: getByText(name, { exact: true }) })
# The confirmation sentence in the selected-row scenario is the expected text quoted on DS-263. It was not re-verified on the live app this run.
# Prior features/DS-5.feature recon (2026-10-27), not re-verified this run:
# - GET /api/programs 200 { data: [] } shows empty state "No programs yet. Create your first program to get started." and button "Create Program"
# - Malformed GET body renders no program list and the Programs heading is gone
# DS-263 actual result, not re-verified this run: after selection, delete renders past the list card (about x=663 versus card right edge about 620) and the card uses overflow hidden. Without hover the control was reported far off-screen. Hovering an unselected row was the workaround.

# Ambiguities and gaps
# 1. The ticket quotes the confirmation sentence from DS-4 and Confluence. This run did not confirm the live dialog still uses that exact string.
# 2. "Inside the visible program list panel" means the control's box is within the list card's visible box, not merely present in the DOM.
# 3. The ticket's example row is "Test program" (lowercase p). Other stories use "Test Program". Keep the ticket's casing in these scenarios.
# 4. Viewport size is not specified. The report used a desktop Chromium window. Do not invent a mobile layout requirement.
# 5. Failed-delete copy is owned by DS-261. API scenarios here only require the program to remain and the page to show an error state or stay usable.
# 6. Shared environments need a uniquely seeded program plus API cleanup.
