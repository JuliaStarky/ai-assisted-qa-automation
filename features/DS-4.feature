Feature: DS-4 Delete program with confirmation
  As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  # Happy paths

  Scenario: Delete program with confirmation
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Test Program" exists in the program list
    When I click the delete control for "Test Program"
    Then I see a confirmation dialog
    When I confirm deletion
    Then "Test Program" is removed from the program list

  Scenario: Cancel program deletion
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Web Development 2026" exists with description "Keep this row"
    When I click the delete control for "Web Development 2026"
    And I see a confirmation dialog
    And I click Cancel or dismiss the dialog
    Then "Web Development 2026" still exists in the program list with description "Keep this row"

  Scenario: Confirmation dialog identifies the program being deleted
    Given I am logged in as admin on Didaxis
    And a program "Data Science Fundamentals" exists on the Programs page
    When I click the delete control for "Data Science Fundamentals"
    Then the confirmation dialog message includes "Data Science Fundamentals"
    When I cancel the confirmation
    Then "Data Science Fundamentals" remains in the program list

  Scenario: List updates immediately after confirmed delete without affecting other programs
    Given I am logged in as admin on Didaxis
    And programs "Test Program" and "Cloud Engineering 2026" exist on the Programs page
    When I confirm deletion of "Test Program"
    Then "Test Program" is removed from the program list
    And "Cloud Engineering 2026" remains in the program list

  Scenario: Re-create a program with the same name after successful delete
    Given I am logged in as admin on Didaxis
    And a program "Test Program" existed and was deleted successfully
    When I create a new program named "Test Program" with description "Second life"
    Then the program list shows "Test Program" with description "Second life"

  # Negative

  Scenario: Non-admin user cannot delete a program
    Given I am logged in as a non-admin user on Didaxis
    And a program "Test Program" exists on the Programs page
    When I view the row for "Test Program"
    Then I do not see a delete control for that program

  Scenario: Deletion does not complete when session is expired or unauthorized
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I click the delete control for "Test Program"
    And I confirm deletion
    And the delete request is rejected as unauthorized
    Then "Test Program" remains in the program list
    And I am prompted to sign in again or see an unauthorized or session-expired message

  Scenario: Failed delete shows an error and preserves the program
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I confirm deletion of "Test Program"
    And the delete API returns a server error
    Then "Test Program" remains in the program list
    And I see a user-visible error message about the failed delete

  Scenario: Program cannot be deleted without passing through confirmation
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I take no delete action from the program row
    Then "Test Program" remains in the program list

  # Edge cases

  Scenario: Delete program with special characters in name
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists on the Programs page
    When I confirm deletion of "Informatique & IA - Niveau 2"
    Then "Informatique & IA - Niveau 2" is removed from the program list

  Scenario: Delete the last program in the list
    Given I am logged in as admin on Didaxis
    And "Test Program" is the only program in the list
    When I confirm deletion of "Test Program"
    Then "Test Program" is removed from the program list

  Scenario: Double-click delete control opens only one confirmation dialog
    Given I am logged in as admin on Didaxis
    And a program "Test Program" exists on the Programs page
    When I double-click the delete control for "Test Program"
    Then exactly one confirmation dialog is shown
    When I confirm deletion once
    Then "Test Program" is removed from the program list

  Scenario: Delete program with maximum-length name
    Given I am logged in as admin on Didaxis
    And a program exists whose name is 255 characters long
    When I confirm deletion of that program
    Then that program is removed from the program list

  Scenario: Delete one program does not remove other programs
    Given I am logged in as admin on Didaxis
    And programs "Test Program" and "Web Development 2026" exist on the Programs page
    When I confirm deletion of "Test Program"
    Then "Web Development 2026" remains in the program list

# Ambiguities and gaps (resolve before automation)
# 1. AC says "delete icon"; UI may expose "Delete {Program Name}" button or image trash icon (DS-69, DS-83) — confirm stable selector.
# 2. DS-172: deletion may use native browser confirm() vs in-app modal — AC says "confirmation dialog"; confirm expected UX and test strategy.
# 3. DS-210: some builds may delete without confirmation — confirm MVP must always show confirmation before DELETE.
# 4. DS-156 / DS-218: double-click delete may open two dialogs — confirm single-dialog requirement.
# 5. DS-155 / DS-116: failed DELETE may show no error — confirm required error copy and whether row stays visible.
# 6. DS-209: delete/edit controls clipped when row selected — confirm layout and visibility on narrow viewports.
# 7. Crowded program list (DS-107) may prevent target row from rendering in CI — define scroll/search strategy for delete tests.
# 8. Fixed name "Test Program" may collide in shared environments — define unique seeding or cleanup per run.
