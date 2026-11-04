Feature: DS-266 Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill Description with "Programme bilingue sciences et IA"
    And I click Create
    Then the New Program form closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Accept a standard alphanumeric program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    Then the program list shows "Cloud Engineering 2026"

  Scenario: Leading and trailing spaces are trimmed before save
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "  Mobile Development 2026  " as the Program Name
    And I fill Description with "Mobile track"
    And I click Create
    Then the program list shows "Mobile Development 2026"
    And the program list does not show the padded name "  Mobile Development 2026  "

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I fill Description with "Valid description"
    And I click Create
    Then the form is not submitted
    And no program is created from that whitespace-only name

  Scenario: Reject an empty program name
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I leave Program Name empty
    And I fill Description with "Valid description"
    Then Create stays disabled or the form is not submitted
    And no new program is created

  Scenario: Reject duplicate program name
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    When I try to create a new program with the name "Web Development 2026" and description "Second program attempt"
    And I click Create
    Then I see an error indicating the name already exists
    And the program list shows exactly one program named "Web Development 2026"

  Scenario: Whitespace-padded duplicate is rejected after trim
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the Program Name
    And I fill Description with "Padded duplicate"
    And I click Create
    Then the form is not saved as a second program
    And the program list shows exactly one program named "Web Development 2026"

  Scenario: A rejected duplicate does not change the existing program
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists with description "Stable row"
    When I try to create another program named "Web Development 2026" with description "Overwrite attempt"
    And the create is rejected
    When I refresh the Programs page
    Then "Web Development 2026" still shows description "Stable row"
    And the program list shows exactly one program named "Web Development 2026"

  Scenario: Program save returns HTTP 503
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill Description with "Programme bilingue sciences et IA"
    And I click Create
    And the program save returns HTTP 503
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program list returns HTTP 200 with an empty list
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with an empty list
    Then the Programs page shows an empty state or stays usable

  Scenario: Program list returns HTTP 200 with a malformed body
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And the program list returns HTTP 200 with a malformed body
    Then the Programs page shows an error state, an empty state, or stays usable

  Scenario: Program save returns HTTP 401
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 401
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program save returns HTTP 403
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 403
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program save returns HTTP 404
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 404
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program save returns HTTP 501
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 501
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program save returns HTTP 502
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 502
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  Scenario: Program save returns HTTP 300
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Cloud Engineering 2026" as the Program Name
    And I fill Description with "AWS and Azure fundamentals"
    And I click Create
    And the program save returns HTTP 300
    Then the program is not added to the list
    And the Programs page shows an error state or stays usable

  # Edge cases

  Scenario: Program name of 256 characters is not stored
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter a Program Name of 256 characters
    And I fill Description with "Over long name"
    And I click Create
    Then that 256-character name is not shown in the program list

  Scenario: Case-variant of an existing name is not stored as a second program
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "web development 2026" as the Program Name
    And I fill Description with "Case variant"
    And I click Create
    Then the program list does not show two different rows for that name differing only by case

  Scenario: HTML-like program name is shown as text
    Given I am logged in as admin on Didaxis
    And I am on the program creation form
    When I enter "Test <b>Name</b>" as the Program Name
    And I fill Description with "Markup probe"
    And I click Create
    Then the Programs page does not run that markup
    And any visible name is plain text

  Scenario: Duplicate validation still holds if Create is activated twice
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill Description with "Double submit"
    And I activate Create twice
    Then the program list shows exactly one program named "Web Development 2026"

  Scenario: A corrected name can be created after a duplicate attempt
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill Description with "Will rename"
    And the duplicate create is rejected
    And I change Program Name to "Web Development 2027"
    And I click Create
    Then the program list shows "Web Development 2027"
    And the program list still shows exactly one "Web Development 2026"

# UI recon (2026-11-04)
# - Live UI recon was skipped. DIDAXIS_EMAIL and DIDAXIS_PASSWORD are unset and the repo has no .env file.
# - DIDAXIS_URL is unset. The project default in fixtures/didaxis.helpers.ts is https://test.didaxis.studio.
# - No routes, labels, or rendered error copy were captured this run. Do not invent error strings.

# Ambiguities and gaps
# 1. The whitespace-only AC says the form is not submitted because the name is trimmed and treated as empty. It does not say whether Create is disabled or a click is ignored.
# 2. Maximum Program Name length is not in the ticket. 256 characters is a probe, not a documented limit.
# 3. Duplicate-error copy is not in the ticket. This run did not capture it. The scenario only requires an error that indicates the name already exists.
# 4. Case-insensitive uniqueness is not in the acceptance criteria.
# 5. Whether edit-time rename duplicates are in DS-266 is not stated. These scenarios cover create only.
# 6. HTTP 401, 403, 404, 501, 502, 300, and 503 outcomes are named as an error state or a page that stays usable. Exact copy was not captured because recon was skipped.
# 7. HTTP 200 with an empty list and HTTP 200 with a malformed body likewise have no captured copy this run.
# 8. Shared environments may already contain "Web Development 2026". Automation should use a unique suffix and clean up programs it creates.
