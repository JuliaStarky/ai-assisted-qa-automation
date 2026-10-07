Feature: DS-2 Edit existing program details
  As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  # Happy paths

  Scenario: Open program for editing
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Web Development 2026" exists with description "Full-stack web development program"
    When I open edit for "Web Development 2026"
    Then I see the Edit Program form pre-populated with Program Name "Web Development 2026"
    And I see Description "Full-stack web development program"
    And I see Save and Cancel actions

  Scenario: Successfully edit a program name
    Given I am logged in as admin on Didaxis
    And I am editing program "Web Development 2026"
    When I change Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the Edit Program modal closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list does not show "Web Development 2026"

  Scenario: Edit preserves unchanged fields when only description changes
    Given I am logged in as admin on Didaxis
    And I am editing program "Data Science Fundamentals" with description "Introductory data science track"
    When I change Description to "Updated curriculum for 2026 cohort"
    And I leave Program Name unchanged
    And I click Save
    Then the Edit Program modal closes
    And the program list shows "Data Science Fundamentals" with description "Updated curriculum for 2026 cohort"
    And when I reopen edit for "Data Science Fundamentals"
    Then Program Name is still "Data Science Fundamentals"
    And Total Program Hours, Default Session Hours, Default Exam Hours, Target Audience, and Focus Areas are unchanged

  Scenario: Edit both program name and description in one save
    Given I am logged in as admin on Didaxis
    And I am editing program "Mobile Development 2026" with description "Original mobile track"
    When I change Program Name to "Mobile Development 2026 - Advanced"
    And I change Description to "iOS and Android track with capstone project"
    And I click Save
    Then the Edit Program modal closes
    And the program list shows "Mobile Development 2026 - Advanced" with the updated description

  Scenario: Cancel dismisses edit form without persisting changes
    Given I am logged in as admin on Didaxis
    And I am editing program "Web Development 2026" with description "Original description"
    When I change Program Name to "Should Not Persist"
    And I click Cancel
    Then the Edit Program modal closes
    And the program list still shows "Web Development 2026" with description "Original description"

  Scenario: Save with no field changes keeps program data intact
    Given I am logged in as admin on Didaxis
    And I am editing program "Web Development 2026" with description "Unchanged description"
    When I click Save without modifying any fields
    Then the Edit Program modal closes
    And the program list shows exactly one program named "Web Development 2026" with description "Unchanged description"

  Scenario: Edit form exposes extended program configuration fields
    Given I am logged in as admin on Didaxis
    And I am editing an existing program
    Then I see fields Program Name, Description, Total Program Hours, Default Session Hours, Default Exam Hours, Target Audience, and Focus Areas
    And I see "Show AI Generation Config" and actions Save and Cancel

  # Negative

  Scenario: Empty program name cannot be saved on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Cybersecurity Bootcamp"
    When I clear Program Name
    Then the Save button is disabled
    And the program list still shows "Cybersecurity Bootcamp"

  Scenario: Whitespace-only program name cannot be saved on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Cybersecurity Bootcamp"
    When I change Program Name to "   "
    Then the Save button is disabled
    And the program list still shows "Cybersecurity Bootcamp"

  Scenario: Renaming to an existing program name is rejected
    Given I am logged in as admin on Didaxis
    And programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing program "Data Science Fundamentals"
    When I change Program Name to "Web Development 2026"
    And I click Save
    Then I see a validation or error message indicating the name is not unique
    And the program list shows exactly one row named "Web Development 2026"
    And the program list shows exactly one row named "Data Science Fundamentals"

  Scenario: Non-admin user cannot edit program details
    Given I am logged in as a non-admin user on Didaxis
    And a program "Web Development 2026" exists on the Programs page
    When I view the row for "Web Development 2026"
    Then I do not see an edit control for that program

  Scenario: Save does not apply changes when session is expired or unauthorized
    Given I am logged in as admin on Didaxis
    And I am editing program "Session Edit Program" with description "Before session expiry"
    When I change Description to "Session expiry test"
    And my session is no longer authorized for program updates
    And I click Save
    Then the program list still shows "Session Edit Program" with description "Before session expiry"
    And I am prompted to sign in again or see an unauthorized or session-expired message

  Scenario: Program name exceeding maximum length is rejected on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Original Name"
    When I change Program Name to a string of 256 characters
    And I click Save or Save is blocked
    Then the program is not saved under the 256-character name
    And the program list still reflects the original program record without data loss

  Scenario: Description exceeding maximum length is rejected on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Valid Program Name"
    When I change Description to a string longer than the allowed maximum
    Then I cannot successfully save the edit
    And reopening edit for "Valid Program Name" shows the previous description unchanged

  Scenario: Server error during save does not corrupt stored program data
    Given I am logged in as admin on Didaxis
    And I am editing program "Web Development 2026" with description "Stable description"
    When I change Description to "Attempted update during server failure"
    And the save request fails with a server error
    Then the program list still shows "Web Development 2026" with description "Stable description"

  # Edge cases

  Scenario: Program name at maximum allowed length is accepted after edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Max Length Seed"
    When I change Program Name to a string of exactly the maximum allowed length
    And I click Save
    Then the Edit Program modal closes
    And the program list shows the program with that maximum-length name

  Scenario: Special characters in edited name and description are preserved
    Given I am logged in as admin on Didaxis
    And I am editing program "QA Program Pilot"
    When I change Program Name to "QA & Testing — Cohort #1 (2026)"
    And I change Description to "Notes: \"updated\", <review>, émojis 🎓"
    And I click Save
    Then the program list shows "QA & Testing — Cohort #1 (2026)" with the updated description
    And reopening edit shows the same name and description values

  Scenario: Unicode and emoji in edited fields are preserved
    Given I am logged in as admin on Didaxis
    And I am editing an existing program
    When I change Description to include Unicode text and emoji such as "Cohort 🎓 — naïve résumé"
    And I click Save
    Then the saved description matches the entered text exactly

  Scenario: Leading and trailing spaces in program name are normalized on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Cloud Engineering 2026"
    When I change Program Name to "  Cloud Engineering 2026 - Revised  "
    And I click Save
    Then the program list shows "Cloud Engineering 2026 - Revised" without leading or trailing spaces

  Scenario: Case-variant duplicate program name is rejected on edit
    Given I am logged in as admin on Didaxis
    And a program "Web Development 2026" exists
    And I am editing program "Data Science Fundamentals"
    When I change Program Name to "web development 2026"
    And I click Save
    Then I see a validation or error message indicating the name is not unique
    And the program list still shows exactly one program matching "Web Development 2026" case-insensitively

  Scenario: Single-character program name is accepted on edit
    Given I am logged in as admin on Didaxis
    And I am editing program "Long Program Title Seed"
    When I change Program Name to "X"
    And I click Save
    Then the Edit Program modal closes
    And the program list shows "X"

  Scenario: Clearing description on edit saves empty description
    Given I am logged in as admin on Didaxis
    And I am editing program "Description Clear Test" with a non-empty description
    When I clear Description
    And I click Save
    Then the program list shows "Description Clear Test" without the previous description text
    And reopening edit shows an empty Description field

  Scenario: Rapid double-click on Save submits the update only once
    Given I am logged in as admin on Didaxis
    And I am editing program "Web Development 2026" with description "Original description"
    When I change Description to "Double save test"
    And I double-click Save
    Then the Edit Program modal closes
    And the program list shows exactly one row for "Web Development 2026" with description "Double save test"

# Ambiguities and gaps (resolve before automation)
# 1. AC says "edit icon" on the program row; UI may expose an accessible "Edit {Program Name}" button or image icon (see DS-93, DS-81) — confirm stable selector and label for automation.
# 2. AC lists Name and Description only; edit form also includes Total Program Hours, session/exam defaults, Target Audience, Focus Areas, and AI config — confirm which fields are in scope for DS-2 vs later stories.
# 3. Maximum Program Name length on edit is unspecified; defects cite 100 and 255 characters — align with DS-1 product limits.
# 4. Maximum Description length on edit is unspecified; defects cite 500 and 2000 characters — confirm limit and error UX.
# 5. Duplicate name rejection on edit is implied by defects (DS-129, DS-131) but not in AC — confirm exact vs case-insensitive uniqueness and visible error copy (DS-11: save blocked but no message).
# 6. Whether leading/trailing spaces are trimmed on edit is unclear; create (DS-1) and edit defects disagree — confirm expected normalization.
# 7. List refresh after rename: DS-9 / DS-108 report stale list data until reload — confirm whether updates must appear without manual refresh (AC says "immediately").
# 8. Rename must update the same row in place, not add a second row (DS-99, DS-147) — confirm expected list behavior on successful save.
# 9. Save with zero changes: DS-44 notes Save stays enabled — confirm whether no-op save is allowed or Save should be disabled when pristine.
# 10. Test data: scenarios use fixed names like "Web Development 2026"; shared environments may already contain duplicates — define isolation or cleanup strategy.
