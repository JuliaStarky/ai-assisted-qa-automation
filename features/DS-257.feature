Feature: DS-257 Valeria - Edit existing program details
  As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  # Happy paths

  Scenario: Open program for editing
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    And a program "Web Development 2026" exists with description "Full-stack web development program"
    When I click "Edit Web Development 2026" on its row
    Then I see the "Edit Program" dialog
    And the Program Name field contains "Web Development 2026"
    And the Description field contains "Full-stack web development program"
    And I see a "Save" button and a "Cancel" button

  Scenario: Successfully edit a program name
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the Edit Program dialog closes
    And the program list immediately shows "Web Development 2026 - Updated" without a page reload
    And the program list no longer shows a row named "Web Development 2026"

  Scenario: Edit preserves unchanged fields
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I only change the Description to "Updated full-stack curriculum"
    And I click Save
    Then the update request is a PATCH that returns 200
    And the saved name is still "Web Development 2026"
    And the Edit Program dialog closes
    And the program list shows "Web Development 2026" with description "Updated full-stack curriculum"
    When I reopen "Edit Web Development 2026"
    Then the Program Name field contains "Web Development 2026"
    And the Description field contains "Updated full-stack curriculum"

  # Negative

  Scenario: Cancel discards edits
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Program Name to "Should Not Persist"
    And I click Cancel
    Then the Edit Program dialog closes
    And the program list shows "Web Development 2026"
    And the program list does not show "Should Not Persist"

  Scenario: Empty program name cannot be saved on edit
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I clear the Program Name field
    Then the Save button is disabled

  Scenario: Whitespace-only program name is not saved on edit
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Program Name to "   "
    And I try to save
    Then the program list still shows "Web Development 2026"

  Scenario: Save returns 503 and the edit is not applied
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    And the update request will return 503
    When I change the Description to "Edit error 503"
    And I click Save
    Then the Edit Program dialog stays open
    And no error message is rendered
    And the "Web Development 2026" row still shows "Full-stack web development program"

  Scenario Outline: Save returns <status> and the edit is not applied
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    And the update request will return <status>
    When I change the Description to "Edit error <status>"
    And I click Save
    Then the Edit Program dialog stays open
    And no error message is rendered
    And the "Web Development 2026" row still shows "Full-stack web development program"

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  Scenario Outline: List returns <status> and no program is offered for editing
    Given I am logged in as admin on Didaxis
    And the program list request returns <status>
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And no "Edit" button is shown

    Examples:
      | status |
      | 401    |
      | 403    |
      | 404    |
      | 501    |
      | 502    |
      | 300    |

  Scenario: List returns 200 with an empty list and no program is offered for editing
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body {"data": []}
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And no "Edit" button is shown

  # Known bug DS-114 — recon shows a blank main area; expected to fail until fixed
  Scenario: List returns 200 with a malformed body and the page stays usable
    Given I am logged in as admin on Didaxis
    And the program list request returns 200 with body "not-json"
    When I navigate to the Programs page and the list response has been received
    Then I see the "Programs" heading and the "+ New Program" button

  # Known bug (DS-3 implied edit rule) — rename to an existing name is accepted today; expected to fail until fixed
  Scenario: Renaming to an existing program name is rejected
    Given I am logged in as admin on Didaxis
    And programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing "Data Science Fundamentals"
    When I change the Program Name to "Web Development 2026"
    And I click Save
    Then the update request is not accepted (response is not 2xx)
    And the program list still shows exactly one row named "Web Development 2026"

  # Edge cases

  Scenario: Special characters in the edited name are saved unchanged
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026"
    When I change the Program Name to "Informatique & IA - Niveau 2"
    And I click Save
    Then the update response saves the name as exactly "Informatique & IA - Niveau 2"
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Clearing the description saves an empty description
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I clear the Description field
    And I click Save
    Then the Edit Program dialog closes
    And the "Web Development 2026" row no longer shows "Full-stack web development program"

  Scenario: Save with no changes keeps program data intact
    Given I am logged in as admin on Didaxis
    And I am editing "Web Development 2026" with description "Full-stack web development program"
    When I click Save without changing any field
    Then the Edit Program dialog closes
    And the program list shows "Web Development 2026" with description "Full-stack web development program"

# UI recon (2026-11-05)
# - Tool: Playwright MCP reached /login, but its browser process cannot read DIDAXIS_EMAIL / DIDAXIS_PASSWORD and passing
#   them as tool arguments would expose them, so recon ran as a scripted headless Playwright session (Playwright CLI
#   fallback) with credentials read from the environment. All recon programs were deleted afterwards.
# - Env: https://test.didaxis.studio (DIDAXIS_URL). Login OK; /programs shows heading "Programs" and "+ New Program".
# - Row actions: buttons "Edit <name>" and "Delete <name>" (icon-only, accessible name from aria-label).
# - Edit dialog: heading "Edit Program", textbox "Program Name" and textbox "Description" pre-populated with current values,
#   "▸ Show AI Generation Config", "Cancel", "Save". Close (X) button has no accessible name.
# - Description-only edit: PATCH /api/programs/<id> returns 200; request body re-sends name unchanged plus description and
#   total_hours / default_session_hours / default_exam_hours / target_audience / focus_areas / sync_async_ratio;
#   response data.name unchanged; row text updates in place.
# - Rename to "<name> - Updated": row with the new name appears without reload.
# - The dialog takes longer than 1.5 s to close after a 200 — assert closure with a retrying matcher.
# - Clearing Program Name disables Save.
# - Mocked PATCH 401 / 403 / 404 / 501 / 502 / 503 / 300: dialog stays open, no role="alert", no error copy, row keeps old description (DS-116).
# - Mocked GET list 401 / 403 / 404 / 501 / 502 / 503 / 300 and 200 { data: [] }: empty state
#   "No programs yet. Create your first program to get started." with "Create Program"; no rows, so no Edit buttons.
# - Mocked GET list 200 "not-json": main area goes blank after the response arrives (heading briefly renders first — wait
#   for the list response before asserting, otherwise the check races) (DS-114).
# - Locator hints: getByRole('dialog').filter({ has: getByRole('heading', { name: 'Edit Program' }) }),
#   getByRole('button', { name: `Edit ${name}` }), getByRole('button', { name: 'Save' }).

# Ambiguities and gaps
# 1. Shared env holds many programs and duplicate names; specs must seed their own program with a unique suffix (e.g. Date.now())
#    appended to the AC names and clean it up with trackProgram.
# 2. AC "other fields remain unchanged" — only Name/Description are visible by default; the extended fields sit behind
#    "▸ Show AI Generation Config". Confirm whether those must be asserted too (the PATCH body re-sends them).
# 3. Failed saves show no message (DS-116); confirm the intended error copy.
# 4. Rename-to-duplicate rule and copy are not in the AC (DS-3 implies uniqueness).
# 5. Whitespace-only name on edit: confirm whether Save should be disabled or the server should reject it.
