Feature: DS-5 Program list filtering and display
  As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  # Happy paths

  Scenario: Display program list with key details
    Given I am logged in as admin on Didaxis
    And programs "Web Development 2026" and "Data Science Fundamentals" exist in the system
    When I navigate to the Programs page
    Then I see a list showing "Web Development 2026" with its description "Full-stack web development program"
    And I see a list showing "Data Science Fundamentals" with its description "Introductory data science track"

  Scenario: Empty state when no programs exist
    Given I am logged in as admin on Didaxis
    And no programs exist for my view
    When I navigate to the Programs page
    Then I see a message indicating no programs have been created
    And I see a prompt to create the first program such as "+ New Program"

  Scenario: All existing programs appear in the list after creation
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And I create programs "Web Development 2026", "Mobile Development 2026", and "Cybersecurity Bootcamp" with distinct descriptions
    Then each created program name and description is visible in the program list

  Scenario: Create first program from empty state updates the list
    Given I am logged in as admin on Didaxis
    And no programs exist for my view
    When I navigate to the Programs page
    And I create program "Test Program" with description "First program"
    Then the empty-state message is no longer shown
    And the list shows "Test Program" with description "First program"

  Scenario: List reflects a newly created program in the same session
    Given I am logged in as admin on Didaxis
    And program "Web Development 2026" already appears in the list
    When I create program "Cloud Engineering 2026" with description "Cloud fundamentals"
    Then the list shows both "Web Development 2026" and "Cloud Engineering 2026" with their descriptions

  Scenario: Programs page shows expected page chrome for admins
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    Then I see the heading "Programs"
    And I see "+ New Program"

  # Negative

  Scenario: Empty state does not show program table rows
    Given I am logged in as admin on Didaxis
    And no programs exist for my view
    When I navigate to the Programs page
    Then I see the empty-state message
    And I do not see program rows in the list table

  Scenario: Failed program list load does not show a false empty state
    Given I am logged in as admin on Didaxis
    And programs exist in the system
    When I navigate to the Programs page
    And loading programs fails with a server error
    Then I see a user-visible error or retry message
    And I do not see the "no programs have been created" empty state as if the list were truly empty

  Scenario: Malformed programs API response does not white-screen the page
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the programs list API returns malformed JSON
    Then I see a user-visible error state
    And the Programs page does not render raw response body as page content

  Scenario: Unauthenticated user cannot view the program list
    Given I am not logged in on Didaxis
    When I attempt to open the Programs page directly
    Then I am redirected to login or blocked from viewing the program list

  Scenario: Deleted program no longer appears in the list
    Given I am logged in as admin on Didaxis
    And programs "Test Program" and "Web Development 2026" exist in the list
    When "Test Program" is deleted successfully
    Then "Test Program" is not shown in the list
    And "Web Development 2026" remains visible with its description

  # Edge cases

  Scenario: Long program name and description display in the list
    Given I am logged in as admin on Didaxis
    And a program exists with a 255-character name and a long description
    When I navigate to the Programs page
    Then the list row shows the full program name and description without breaking the page layout

  Scenario: Special characters render correctly in list cells
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists with description "Notes: \"quotes\", <tags>, émojis 🎓"
    When I navigate to the Programs page
    Then the list shows that name and description as plain text without executing HTML

  Scenario: Program with empty description still shows name in the list
    Given I am logged in as admin on Didaxis
    And a program "Cybersecurity Bootcamp" exists with an empty description
    When I navigate to the Programs page
    Then the list shows "Cybersecurity Bootcamp"

  Scenario: Large program catalog remains usable
    Given I am logged in as admin on Didaxis
    And many programs exist in the system
    When I navigate to the Programs page
    Then program rows load within an acceptable time
    And I can scroll to view program rows without the page crashing

  Scenario: Duplicate program names remain distinguishable by description in the list
    Given I am logged in as admin on Didaxis
    And two programs named "Web Development 2026" exist with descriptions "First duplicate row" and "Second duplicate row"
    When I navigate to the Programs page
    Then I see two rows for "Web Development 2026"
    And I see both descriptions "First duplicate row" and "Second duplicate row"

  Scenario: List data stays consistent after page refresh
    Given I am logged in as admin on Didaxis
    And program "Web Development 2026" with description "Full-stack web development program" exists
    When I navigate to the Programs page
    And I refresh the page
    Then the list still shows "Web Development 2026" with description "Full-stack web development program"

  Scenario: Filter or search narrows the program list when filtering UI exists
    Given I am logged in as admin on Didaxis
    And multiple programs exist including "Web Development 2026"
    When I use the program search or filter control with query "Web Development"
    Then the list shows matching programs and hides non-matching ones

  Scenario: Filter with no matches shows an appropriate empty result
    Given I am logged in as admin on Didaxis
    And programs exist in the system
    When I use the program search or filter control with query "ZZZ-NO-MATCH-QUERY"
    Then I see an empty-result message
    And I do not see the global "no programs have been created" empty state

# Ambiguities and gaps (resolve before automation)
# 1. Story title mentions "filtering" but AC only covers list display and empty state — DS-221: no search/filter on test env; confirm if filtering is in scope for DS-5 or a follow-up ticket.
# 2. "No programs exist" may require isolated tenant, API mock, or cleanup — shared test env often has thousands of rows (DS-181, DS-222).
# 3. GET /api/programs HTTP 500 currently shows empty state (DS-35, DS-112, DS-179) — confirm error UX vs misleading empty state.
# 4. Malformed API body or bare array crashes page (DS-157, DS-211, DS-219) — confirm expected error handling contract.
# 5. DS-87: row accessible names may combine name and description — confirm how automation should assert "separate" display in DOM/a11y tree.
# 6. DS-205: unsanitized HTML in description — confirm whether descriptions must be escaped in list (security).
# 7. DS-220: viewer role may still see Edit/Delete — confirm role-based actions vs list display scope.
# 8. DS-118: very long names may overflow row layout — confirm truncation vs wrap rules.
# 9. Pagination/virtualization for 779+ rows (DS-222) not in AC — confirm performance expectations and test thresholds.
