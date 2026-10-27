Feature: DS-5 Program list filtering and display
  As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  # Happy paths

  Scenario: Display program list with key details
    Given I am logged in as admin on Didaxis
    And programs exist in the system
    When I navigate to the Programs page
    Then I see a table headed "Program"
    And I see a list showing each program's name and description
    And I see the heading "Programs"
    And I see the subtitle "Manage academic programs and semesters"
    And I see a "+ New Program" button

  Scenario: Newly created program appears in the list with name and description
    Given I am logged in as admin on Didaxis
    And I am on the Programs page
    When I create a new program named "Web Development 2026" with description "Full-stack web development program"
    Then the program list shows a row with name "Web Development 2026"
    And that row shows description "Full-stack web development program"
    And that row appears at the top of the list

  Scenario: Empty state when no programs exist
    Given I am logged in as admin on Didaxis
    And no programs exist
    When I navigate to the Programs page
    Then I see the message "No programs yet. Create your first program to get started."
    And I do not see a program table with rows

  Scenario: Empty state prompts the user to create the first program
    Given I am logged in as admin on Didaxis
    And no programs exist
    When I navigate to the Programs page
    Then I see a "Create Program" button
    And I see a "+ New Program" button
    When I click "Create Program"
    Then I see the New Program form

  Scenario: Program list persists after page refresh
    Given I am logged in as admin on Didaxis
    And a program "Data Science Fundamentals" exists with description "Introductory data science track"
    When I refresh the Programs page
    Then I still see "Data Science Fundamentals" with description "Introductory data science track"

  Scenario: Admin can manage each listed program
    Given I am logged in as admin on Didaxis
    And a program "Cloud Engineering 2026" exists on the Programs page
    When I view the row for "Cloud Engineering 2026"
    Then I see an "Edit Cloud Engineering 2026" control
    And I see a "Delete Cloud Engineering 2026" control

  # Negative

  Scenario: Failed program list load shows an error instead of an empty state
    Given I am logged in as admin on Didaxis
    And programs exist in the system
    When I navigate to the Programs page
    And GET /api/programs returns HTTP 500
    Then I see a user-visible error about failing to load programs
    And I do not see the empty-state message "No programs yet. Create your first program to get started."

  Scenario: Malformed program list response does not blank the page
    Given I am logged in as admin on Didaxis
    When I navigate to the Programs page
    And GET /api/programs returns a non-JSON body
    Then I still see the Programs heading and "+ New Program" button
    And I see a user-visible error instead of a blank main area

  Scenario: Unauthenticated user cannot view the program list
    Given I am not logged in
    When I open the Programs page URL directly
    Then I am redirected to the Sign In page
    And I do not see the program list

  Scenario: Empty state is not shown when programs exist
    Given I am logged in as admin on Didaxis
    And a program "Cybersecurity Bootcamp" exists on the Programs page
    When I view the Programs page
    Then I do not see the message "No programs yet. Create your first program to get started."
    And I see "Cybersecurity Bootcamp" in the program list

  # Edge cases

  Scenario: Duplicate program names remain distinguishable by description
    Given I am logged in as admin on Didaxis
    And two programs named "Web Development 2026" exist with descriptions "First program" and "Second program"
    When I view the Programs page
    Then I see two rows named "Web Development 2026"
    And one row shows description "First program"
    And the other row shows description "Second program"

  Scenario: Program with empty description still appears in the list
    Given I am logged in as admin on Didaxis
    And a program "Cybersecurity Bootcamp" exists with an empty description
    When I view the Programs page
    Then I see a row named "Cybersecurity Bootcamp"
    And that row does not show leftover description text from another program

  Scenario: Special characters in name and description are displayed exactly
    Given I am logged in as admin on Didaxis
    And a program "Informatique & IA - Niveau 2" exists with description "Curriculum \"advanced\" & research"
    When I view the Programs page
    Then I see "Informatique & IA - Niveau 2" with description "Curriculum \"advanced\" & research"

  Scenario: Unicode and emoji in name and description are displayed
    Given I am logged in as admin on Didaxis
    And a program "Programme été — München 2026" exists with description "Cohort 🎓 — naïve résumé"
    When I view the Programs page
    Then I see "Programme été — München 2026" with description "Cohort 🎓 — naïve résumé"

  Scenario: Maximum-length program name remains readable in the list
    Given I am logged in as admin on Didaxis
    And a program exists whose name is 255 characters long
    When I view the Programs page
    Then that program name is visible in its row
    And the row does not overflow the viewport horizontally

  Scenario: HTML in a program description is shown as text, not executed
    Given I am logged in as admin on Didaxis
    And a program "QA XSS Probe" exists with description "<img src=x onerror=alert(1)> script probe"
    When I view the Programs page
    Then I see the description as literal text including "<img src=x onerror=alert(1)> script probe"
    And no script or injected image from that description executes

  Scenario: Newly created program is findable in a large existing list
    Given I am logged in as admin on Didaxis
    And many programs already exist on the Programs page
    When I create a new program named "Mobile Development 2026" with description "iOS and Android track"
    Then I can locate the row for "Mobile Development 2026" with that description without using a search box

# UI recon (2026-10-27)
# - Tool: Playwright MCP (project-0-ai-assisted-qa-automation-playwright)
# - Env: https://test.didaxis.studio (DIDAXIS_URL from .env); signed in as admin@didaxis.studio
# - Login: Email / Password / Sign In → post-login landing https://test.didaxis.studio/ (heading "Dashboard", "Connected")
# - Programs route: nav button "🎓 Programs" → https://test.didaxis.studio/programs
# - Labels: heading level 2 "Programs"; subtitle "Manage academic programs and semesters"; button "+ New Program"
# - List: table with columnheader "Program" plus a second unlabeled actions column; 625 DOM rows, no pagination, no search/filter inputs
# - Row content: first cell two paragraphs (name, then description); actions "Edit {name}" and "Delete {name}"
# - New create "DS-5 Recon Display 1761594300000" / "Recon description for list display" appeared immediately at the top of the list
# - Duplicate names exist (e.g. two "Web Development 2026 1793120933376" rows distinguished by "First program" vs "Second program")
# - Empty GET { data: [] }: "No programs yet. Create your first program to get started." plus button "Create Program" (and "+ New Program" remains)
# - GET /api/programs HTTP 500: same empty state, no error copy (matches linked DS-35 / DS-72 / DS-112)
# - Malformed GET body "not-json": blank main area, Programs heading gone (matches linked DS-114)
# - Long names: 255-char names present; table scrollWidth far exceeds parent (layout overflow; matches linked DS-118)
# - Locator hints: getByRole('heading', { name: 'Programs' }); getByRole('button', { name: '+ New Program' }); getByRole('button', { name: 'Create Program' }); getByRole('row').filter({ has: getByText(name, { exact: true }) }); getByRole('button', { name: `Edit ${name}` }); getByRole('button', { name: `Delete ${name}` }); getByText('No programs yet. Create your first program to get started.')

# Ambiguities and gaps
# 1. Ticket title is "Program list filtering and display" but ACs only cover list display and empty state — no search/filter UI exists on /programs (also DS-221). Confirm whether filtering is in scope for DS-5.
# 2. Empty-state copy is not specified in AC; recon shows "No programs yet. Create your first program to get started." plus "Create Program". Confirm this is the required message.
# 3. GET /api/programs 500 currently renders the empty state instead of an error (DS-35, DS-72, DS-112). AC does not define error UX — confirm required message and retry.
# 4. Malformed GET blanks the authenticated Programs view (DS-114 / DS-211). Confirm required fallback UI.
# 5. Actions column header has no accessible name (DS-117). Confirm expected header text (e.g. "Actions").
# 6. Program name cell accessible name concatenates name and description (DS-87). Confirm whether tests should assert separate name vs description nodes.
# 7. Non-admin / viewer list permissions are not in AC; DS-220 reports viewers still see Edit and Delete. Confirm role matrix.
# 8. Shared test env already has 625 programs and duplicate names — tests must seed unique names (Date.now()) and mock empty/error GETs rather than depending on a truly empty database.
# 9. 255-character names overflow the row/viewport (DS-118). Confirm wrapping vs truncation vs horizontal scroll as the accepted layout.
# 10. No pagination or virtualization (DS-222); list scan can time out (DS-76 / DS-181). Confirm whether large-list tests should mock 100+ rows instead of using the live 625-row dataset.
