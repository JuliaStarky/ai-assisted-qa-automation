Feature: DS-264 Create new academic program
  As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form with fields "Program Name" and "Description"
    And I see a "Create" button

  Scenario: Successfully create a program
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"
    And that row shows description "Full-stack web development program"

  Scenario: Create another valid program
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Data Science Fundamentals"
    And I fill in Description with "Introductory data science track"
    And I click Create
    Then the modal closes
    And the program list shows "Data Science Fundamentals" with description "Introductory data science track"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled
    And the program list does not gain a program with an empty name

  Scenario: Whitespace-only program name does not create a program
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled or the form is not submitted
    And the program list does not show a program whose name is only whitespace

  Scenario: Cancel closes the form without creating a program
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Cancel
    Then the modal closes
    And the program list does not show a new "Web Development 2026" row from this attempt

  Scenario: Duplicate program name is not created
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the page shows an error state or stays on the form
    And the program list still shows the existing "Web Development 2026"

  # Edge cases

  Scenario: Accept program name with special characters
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Leading and trailing spaces are not stored as part of the name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "  Web Development 2026  "
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Double-click Create adds the program once
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I double-click Create
    Then the program list shows one program named "Web Development 2026"

  # API outcomes

  Scenario: Save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 503
    Then "Web Development 2026" is not added to the program list
    And the page shows an error state or stays usable

  Scenario: Program list returns HTTP 200 with an empty list
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with an empty list
    Then I see the empty state
    And the page stays usable

  Scenario: Program list returns HTTP 200 with a malformed body
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with a malformed body
    Then no program rows are rendered
    And I do not see a specific error message

  Scenario: Program list or save returns HTTP 401
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 401
    Then "Web Development 2026" is not added to the program list
    And the page stays usable

  Scenario: Program list or save returns HTTP 403
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 403
    Then "Web Development 2026" is not added to the program list
    And the page stays usable

  Scenario: Program list or save returns HTTP 404
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 404
    Then "Web Development 2026" is not added to the program list
    And the page stays usable

  Scenario: Program list or save returns HTTP 501
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 501
    Then "Web Development 2026" is not added to the program list
    And the page shows an error state or stays usable

  Scenario: Program list or save returns HTTP 502
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 502
    Then "Web Development 2026" is not added to the program list
    And the page shows an error state or stays usable

  Scenario: Program list or save returns HTTP 300
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    And the save request returns HTTP 300
    Then "Web Development 2026" is not added to the program list
    And the page stays usable

# UI recon (2026-11-04)
# Live UI recon was skipped because DIDAXIS_EMAIL and DIDAXIS_PASSWORD are not set.
# Locator hints below are from existing page objects in this repo and were not re-checked against the live app this run:
# - "+ New Program": getByRole('button', { name: '+ New Program' })
# - Dialog heading "New Program"; textboxes "Program Name" and "Description"; buttons "Create" and "Cancel"
# Prior features/DS-5.feature recon (2026-10-27), not re-verified this run:
# - GET /api/programs 200 { data: [] } shows empty state "No programs yet. Create your first program to get started." and button "Create Program"
# - Malformed GET body renders no program list and the Programs heading is gone
# Exact copy for save HTTP 503, 401, 403, 404, 501, 502, and 300 was not captured. Do not invent it.

# Ambiguities and gaps
# 1. DS-264 AC does not say whether Description is required. Scenarios send "Full-stack web development program" on the success path.
# 2. Duplicate-name handling is not in this ticket's AC. The negative scenario requires an error state or the form remaining open, without a quoted message.
# 3. Maximum name length is not in the AC. No max-length scenario is included.
# 4. Trimming of "  Web Development 2026  " is an edge case inferred from related program-name stories, not from DS-264 AC.
# 5. Literal "Web Development 2026" can collide in the shared environment. Seed a unique name and track the created program for API cleanup.
