Feature: Dashboard Programs summary card
  As an admin, I want the Dashboard Programs card to show how many programs exist and take me to them,
  so that I can trust the overview and reach program setup in one click.

  # Happy path

  Scenario: Programs card shows the program count from the API and opens the Programs page
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns { data: [...] } with exactly 3 programs
    When I open the Dashboard at "/"
    Then I see the heading "Dashboard"
    And the Programs card shows the count "3" above the label "Programs" and the text "Manage academic programs"
    When I click the Programs card
    Then the URL is "/programs"
    And I see the heading "Programs"

  # Edge case

  Scenario: Failed programs load does not show a zero count or a Connected status
    Given I am logged in as admin on Didaxis
    And GET /api/programs returns HTTP 500
    When I open the Dashboard at "/"
    Then I see the heading "Dashboard"
    And the Programs card does not show the count "0"
    And I do not see the status "Connected"

# Exploration (2026-11-04)
# - Env: https://test.didaxis.studio (DIDAXIS_URL from .env), signed in as admin@didaxis.studio
# - Tool: Playwright MCP (project-0-ai-assisted-qa-automation-playwright)
# - Routes visited: /login → / (Dashboard) → /programs, /calendar, /validation, /cli (AI Assist), each via its Dashboard card
# - Dashboard main: heading level 2 "Dashboard"; paragraph "Welcome to Didaxis Studio"; status text "Connected" (rendered uppercase via CSS)
# - Cards (all four are plain DIVs with cursor:pointer — no role, no tabindex, not keyboard-focusable):
#     "<count>" / "Programs" / "Manage academic programs"   → /programs, heading "Programs"
#     "View" / "Calendar" / "Schedule & drag-drop"           → /calendar, heading "Calendar", text "Select a program and semester to view the calendar"
#     "Check" / "Validation" / "Check for conflicts"         → /validation, heading "Validation", text "No semester selected", button "Re-validate" disabled
#     "Open" / "AI Assist" / "AI-powered editing"            → /cli, heading "AI Assist", text "Welcome to Didaxis CLI — your AI-powered scheduling assistant."
# - Quick Start panel: paragraph "Quick Start" followed by a static 5-step list
# - Sidebar (nav): buttons "📊 Dashboard", "🎓 Programs", "📅 Calendar", "✅ Validation", "⚡ Scheduler", "📤 Export", "⚙️ Settings"; "Sign out" button; no aria-current on the active item; no sidebar entry for AI Assist (/cli)
# - Data source: Dashboard calls GET /api/programs (Bearer auth); response shape { data: [ { id, name, description, total_hours, default_session_hours, default_exam_hours, target_audience, focus_areas, sync_async_ratio, organization_id, created_at, updated_at } ] }
# - Live count "1003" equals data.length of the live response (was 625 on 2026-10-27 per DS-5 recon)
# - GET /api/programs stubbed to HTTP 500: Dashboard still shows "Connected" and the Programs count "0" — no error copy (likely defect, same family as DS-35 / DS-72 / DS-112 on /programs)
# - Console: one 401 on POST /api/auth/refresh before login (pre-existing, unrelated)
# - Locator hints:
#     page.getByRole('heading', { name: 'Dashboard' })
#     page.getByRole('main').getByText('Manage academic programs')            // click target for the Programs card (click bubbles to the card DIV)
#     page.getByRole('main').getByText('3', { exact: true })                    // count; scope to main so the sidebar "Programs" never matches
#     page.getByRole('main').getByText('Connected', { exact: true })
#     page.getByRole('heading', { name: 'Programs' }); expect(page).toHaveURL(/\/programs$/)
#     Stub with page.route('**/api/programs', …) and fulfill { data: [...] } — deterministic despite fullyParallel workers creating programs on the shared env

# Coverage diff
# Covered:
#   - Login → post-login redirect away from /login — tests/auth.setup.ts (setup only, Dashboard content not asserted)
#   - Unauthenticated redirect to /login for /programs — tests/ds5-program-list-display.spec.ts TC-009
#   - Programs page flows (list, create, edit, delete, a11y) — ds1 / ds2 / ds3 / ds4 / ds5 specs, programs.a11y.spec.ts
# Partial (planned in features/DS-119.feature, no spec exists; several Thens are not assertable as written, e.g. "content indicating the Calendar area is loaded"):
#   - Dashboard heading and four cards visible
#   - Card navigation to Programs / Calendar / Validation / AI Assist
#   - Keyboard activation of cards
#   - Unauthenticated access to "/"
# Uncovered (no spec, no plan):
#   - Programs card count matches GET /api/programs            ← picked
#   - Dashboard behaviour when GET /api/programs fails ("Connected" + "0")  ← picked (edge)
#   - Sidebar navigation to Scheduler, Export, Settings
#   - Sidebar active-page indication (no aria-current today)
#   - Sign out from the sidebar returns to /login and blocks "/"
#   - axe scan of the Dashboard (only /programs is scanned today)

# Why this flow
# The Programs count is the only data-driven element on the Dashboard and nothing tests it. Recon showed that a backend failure renders as
# "Connected" with "0" programs, which tells an admin their programs are gone. It is fully deterministic with a stubbed GET, so it is cheap
# and immune to the shared env's 1003-and-growing program count. The edge scenario is expected to fail today; send that result to triage and bug-reporter rather than weakening the assertion.
# Runners-up for the next run:
#   1. Card navigation for all four cards — turn DS-119 into a spec, using the recon URLs and headings above as assertable Thens
#   2. Keyboard reachability of Dashboard cards — fails today (DIV, no tabindex, no role); pair with an axe scan of "/" (a11y-checks skill)
#   3. Sidebar navigation to Scheduler / Export / Settings (buttons seen in the sidebar; destinations not visited this run)
#   4. Sign out → /login, then direct "/" redirects to /login
