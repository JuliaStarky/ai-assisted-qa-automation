Feature: Add a semester to a program from the Programs page
  As an admin, I want to select a program and add a semester to it,
  so that the program has a teaching period I can schedule courses into.

  # Happy path

  Scenario: Admin adds a semester to a newly created program
    Given I am logged in as admin on Didaxis
    And I created a program named "Semester Flow Program" with a unique timestamp suffix on the Programs page
    When I click that program's row
    Then I see a level-4 heading with the program name and the text "Semesters & scheduling config"
    And I see the text "No semesters yet"
    When I click "+ Semester"
    Then I see the dialog "New Semester"
    And the checkboxes "Mon", "Tue", "Wed", "Thu", "Fri" are checked and "Sat", "Sun" are unchecked
    And "Max Sessions/Day" is "2", "Max Hours/Day" is "8", "Weekly Hour Limit" is "16" and "Default Start Time" is "08:00"
    When I fill "Semester Name" with "Fall 2026" plus a unique timestamp suffix, "Start Date" with "2026-09-08" and "End Date" with "2026-12-18"
    And I click "Create Semester"
    Then the "New Semester" dialog closes
    And the semesters panel shows that semester name
    And I no longer see the text "No semesters yet"

  # Edge case

  Scenario: Create Semester stays disabled until name and both dates are set, and Cancel saves nothing
    Given I am logged in as admin on Didaxis
    And I created a program named "Semester Cancel Program" with a unique timestamp suffix on the Programs page
    And I clicked that program's row and clicked "+ Semester"
    When I fill "Semester Name" with "Fall 2026" plus a unique timestamp suffix
    Then "Create Semester" is disabled
    When I fill "Start Date" with "2026-09-08"
    Then "Create Semester" is disabled
    When I fill "End Date" with "2026-12-18"
    Then "Create Semester" is enabled
    When I replace "Semester Name" with "   "
    Then "Create Semester" is disabled
    When I click "Cancel"
    Then the "New Semester" dialog closes
    And I still see the text "No semesters yet"

# Exploration (2026-11-04)
# - Env: https://test.didaxis.studio (DIDAXIS_URL from .env), already signed in as admin from a prior MCP session
# - Tool: Playwright MCP (project-0-ai-assisted-qa-automation-playwright)
# - Routes visited: /programs → row click (same URL) → "+ Semester" dialog (opened, never submitted) → "Manage Courses" → /programs/<id>/courses → "Back to Programs" → /programs
# - Programs page: heading level 2 "Programs"; text "Manage academic programs and semesters"; button "+ New Program"; one table, 1003 rows, no search, filter, sort or pagination
# - Rows: cursor:pointer, no aria-selected; each has buttons "Edit <name>" / "Delete <name>"
# - Below the table with nothing selected: text "Select a program to manage semesters"
# - Clicking a row (URL unchanged) calls GET /api/programs/<id>/semesters and shows a panel:
#     heading level 4 "<program name>"; text "Semesters & scheduling config";
#     buttons "Manage Courses", "✨ Generate Curriculum" [disabled], "+ Semester"; text "No semesters yet"
# - "+ Semester" opens dialog with heading level 2 "New Semester" and an unnamed close button:
#     textbox "Semester Name" (required, placeholder "e.g. Semester 1"); "Start Date" / "End Date" (input type=date, required);
#     group "Allowed Weekdays" with checkboxes Mon–Fri checked, Sat/Sun unchecked;
#     textboxes "Max Sessions/Day" = 2, "Max Hours/Day" = 8, "Weekly Hour Limit" = 16; "Default Start Time" (type=time) = 08:00;
#     buttons "Cancel", "Create Semester" (disabled until name + start + end are set)
# - Validation probe (no submit): name only → disabled; name + start → disabled; name + start + end → enabled;
#     whitespace-only name → disabled; end date 2026-09-01 before start 2026-09-08 → ENABLED, no inline error;
#     all weekdays unchecked → ENABLED, no inline error
# - Post-submit rendering of a semester was NOT observed (exploration is read-only; 12 sampled existing programs all show "No semesters yet").
#   The happy-path Then asserts only the semester name the test typed. The POST endpoint and response shape still need to be confirmed when the spec first runs.
# - "Manage Courses" → /programs/<id>/courses: heading level 2 "Course Builder"; text "Define courses and session plans for <name>";
#     button "Back to Programs"; breadcrumb text "Programs / <name> / Courses"; button "+ New Course" [disabled]; text "No courses yet. Add the first course for this program."
# - Locator hints:
#     page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) })           // existing ProgramsPage.programRowByName
#     page.getByRole('heading', { level: 4, name: programName })
#     page.getByText('Semesters & scheduling config'); page.getByText('No semesters yet', { exact: true })
#     page.getByRole('button', { name: '+ Semester' })
#     page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'New Semester' }) })
#     dialog.getByRole('textbox', { name: 'Semester Name' }); dialog.getByLabel('Start Date'); dialog.getByLabel('End Date')
#     dialog.getByRole('group', { name: 'Allowed Weekdays' }).getByRole('checkbox', { name: 'Mon' })
#     dialog.getByRole('textbox', { name: 'Max Sessions/Day' }); dialog.getByLabel('Default Start Time')
#     dialog.getByRole('button', { name: 'Create Semester' }); dialog.getByRole('button', { name: 'Cancel' })

# Coverage diff
# Covered:
#   - List display, empty state, load errors, refresh persistence — tests/ds5-program-list-display.spec.ts
#   - Create program (form, validation, errors, edge input) — tests/ds1-create-new-academic-program.spec.ts, tests/ds3-program-name-validation-and-duplicate-prevention.spec.ts
#   - Edit program (incl. extended fields visible) — tests/ds2-edit-existing-program-details.spec.ts
#   - Delete program with native confirm — tests/ds4-delete-program-with-confirmation.spec.ts
#   - axe scan + keyboard open of New Program — tests/programs.a11y.spec.ts
# Partial:
#   - Edit modal "▸ Show AI Generation Config" — visible (ds2 TC-018) but never expanded
# Uncovered (no spec, no plan):
#   - Row selection → semesters panel                                    ← picked (setup of both scenarios)
#   - Add a semester ("+ Semester" → "Create Semester")                   ← picked (happy)
#   - New Semester required-field gating + Cancel                         ← picked (edge)
#   - New Semester accepts End Date before Start Date / zero weekdays (no client-side guard seen)
#   - "Manage Courses" → Course Builder → "Back to Programs" / breadcrumb
#   - "✨ Generate Curriculum" disabled state (enabling condition unknown)
#   - Switching selection between programs updates the panel heading

# Why this flow
# Programs exist so semesters can be scheduled, and adding a semester is the first step of that work. It has more state than any other
# Programs flow (dates, weekdays, numeric limits, required-field gating), and nothing tests it today. It is deterministic on a freshly
# seeded program, and the seeded program is deleted by the existing trackProgram cleanup.
# Runners-up for the next run:
#   1. End Date before Start Date and zero weekdays: Create Semester is enabled with no inline error. Submit and assert rejection; likely a defect.
#   2. Manage Courses → /programs/<id>/courses (heading "Course Builder", breadcrumb) → "Back to Programs" returns to /programs
#   3. Selecting a second program swaps the panel heading and reloads semesters (GET /api/programs/<id>/semesters)
#   4. Expand "▸ Show AI Generation Config" in Edit Program and find what enables "✨ Generate Curriculum"
