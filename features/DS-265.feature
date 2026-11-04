Feature: DS-265 Edit existing program details
  As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  # Happy paths

  Scenario: Open program for editing
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Web Development 2026" exists with description "Full-stack web development program"
    When I click the edit icon on "Web Development 2026"
    Then I see the edit form pre-populated with Program Name "Web Development 2026"
    And I see Description "Full-stack web development program"

  Scenario: Successfully edit a program name
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list does not show the previous name "Web Development 2026" for that program

  Scenario: Edit preserves unchanged fields
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I only change the Description to "Updated full-stack web development program"
    And I click Save
    Then the modal closes
    And the program list shows name "Web Development 2026"
    And the program list shows description "Updated full-stack web development program"

  # Negative

  Scenario: Cancel edit does not change the program
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Cancel
    Then the modal closes
    And the program list still shows "Web Development 2026" with description "Full-stack web development program"

  Scenario: Empty program name cannot be saved
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I clear the Program Name
    Then the Save button is disabled or the form is not submitted
    And the program list still shows "Web Development 2026"

  Scenario: Whitespace-only program name cannot be saved
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "   "
    Then the Save button is disabled or the form is not submitted
    And the program list still shows "Web Development 2026"

  Scenario: Saving a duplicate name does not replace the other program
    Given I am logged in as admin on Didaxis
    And programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing "Data Science Fundamentals"
    When I change the Name to "Web Development 2026"
    And I click Save
    Then the page shows an error state or stays on the form
    And both existing programs remain identifiable in the list

  # Edge cases

  Scenario: Edit name to a value with special characters
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Informatique & IA - Niveau 2"
    And I click Save
    Then the modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Description-only edit keeps the name exactly
    Given I am logged in as admin on Didaxis
    And I am editing "Informatique & IA - Niveau 2" with description "Original description"
    When I only change the Description to "Updated description"
    And I click Save
    Then the program list shows "Informatique & IA - Niveau 2" with description "Updated description"

  Scenario: Double-click Save applies the rename once
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I double-click Save
    Then the program list shows one program named "Web Development 2026 - Updated"

  # API outcomes

  Scenario: Save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 503
    Then the program list still shows "Web Development 2026"
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

  Scenario: Program list or save returns HTTP 401
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 401
    Then the program list still shows "Web Development 2026"
    And the page stays usable

  Scenario: Program list or save returns HTTP 403
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 403
    Then the program list still shows "Web Development 2026"
    And the page stays usable

  Scenario: Program list or save returns HTTP 404
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 404
    Then the program list still shows "Web Development 2026"
    And the page stays usable

  Scenario: Program list or save returns HTTP 501
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 501
    Then the program list still shows "Web Development 2026"
    And the page shows an error state or stays usable

  Scenario: Program list or save returns HTTP 502
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 502
    Then the program list still shows "Web Development 2026"
    And the page shows an error state or stays usable

  Scenario: Program list or save returns HTTP 300
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    And the save request returns HTTP 300
    Then the program list still shows "Web Development 2026"
    And the page stays usable

# UI recon (2026-11-04)
# Live UI recon was skipped because DIDAXIS_EMAIL and DIDAXIS_PASSWORD are not set.
# Locator hints below are from existing page objects in this repo and were not re-checked against the live app this run:
# - Edit control: getByRole('button', { name: `Edit ${programName}` })
# - Dialog heading "Edit Program"; textboxes "Program Name" and "Description"; buttons "Save" and "Cancel"
# Prior features/DS-5.feature recon (2026-10-27), not re-verified this run:
# - GET /api/programs 200 { data: [] } shows empty state "No programs yet. Create your first program to get started." and button "Create Program"
# - Malformed GET body renders no program list and the Programs heading is gone
# Exact copy for save HTTP 503, 401, 403, 404, 501, 502, and 300 was not captured. Do not invent it.

# Ambiguities and gaps
# 1. DS-265 AC says the edit form is pre-populated with the program's current data. It does not list Total Program Hours or the other extended fields. Assert name and description, which are the fields the AC names.
# 2. Duplicate rename behavior is not in the AC. Do not invent the error string.
# 3. Empty and whitespace name rules are not in the AC. Scenarios accept either a disabled Save button or a submit that does not change the list.
# 4. DS-263 reports edit and delete controls can be clipped after row selection. If the edit control is not clickable, that is the DS-263 defect, not a change to these edit expectations.
# 5. Seed unique program names in the shared environment and track created programs for API cleanup.
