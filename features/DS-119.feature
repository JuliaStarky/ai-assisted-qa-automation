Feature: DS-119 Dashboard displaying the right components
  As an admin user, I want to see the correct dashboard so that I can reach program setup and related areas from one place.

  # Happy paths

  Scenario: Navigate to the Dashboard
    Given I am logged in as admin on Didaxis
    When I navigate to the Dashboard page
    Then I see the Dashboard heading or title
    And I see dashboard blocks or cards for Programs, Calendar, Validation, and AI Assist

  Scenario: Successfully navigate to Programs page from Dashboard
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Programs card
    Then I am on the Programs page
    And I see the Programs page heading "Programs"

  Scenario: Successfully navigate to Calendar page from Dashboard
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Calendar card
    Then I am on the Calendar page
    And I see content indicating the Calendar area is loaded

  Scenario: Successfully navigate to Validation page from Dashboard
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Validation card
    Then I am on the Validation page
    And I see content indicating the Validation area is loaded

  Scenario: Successfully navigate to AI Assist page from Dashboard
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the AI Assist card
    Then I am on the AI Assist page
    And I see content indicating the AI Assist area is loaded

  Scenario: Return to Dashboard from a destination reached via a card
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Programs card
    And I navigate back to the Dashboard page
    Then I see dashboard blocks or cards for Programs, Calendar, Validation, and AI Assist

  # Negative

  Scenario: Unauthenticated user cannot view the Dashboard
    Given I am not logged in on Didaxis
    When I attempt to open the Dashboard page directly
    Then I am redirected to the login page or blocked from viewing the Dashboard

  Scenario: Non-admin user does not see the full admin Dashboard
    Given I am logged in as a non-admin user on Didaxis
    When I navigate to the Dashboard page
    Then I am either redirected away from the admin Dashboard or I do not see all four admin cards Programs, Calendar, Validation, and AI Assist

  Scenario: Dashboard does not show unexpected or placeholder blocks
    Given I am logged in as admin on Didaxis
    When I navigate to the Dashboard page
    Then I see exactly the expected entry points Programs, Calendar, Validation, and AI Assist
    And I do not see broken, empty, or "coming soon" placeholders for those four blocks without an documented exception

  Scenario: Clicking a dashboard card does not leave the user on Dashboard with no navigation
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Calendar card
    Then the browser URL or page heading changes away from the Dashboard
    And I am not left on the Dashboard with no visible navigation result

  Scenario: Session expiry while on Dashboard prevents silent access to protected destinations
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    And my session is no longer authorized
    When I click the Programs card
    Then I am prompted to sign in again or see an unauthorized or session-expired message
    And I do not reach the Programs page as an authenticated admin

  # Edge cases

  Scenario: Each dashboard card is keyboard-focusable and activatable
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I move keyboard focus to the Programs card and activate it with Enter
    Then I am on the Programs page
    When I return to the Dashboard page
    And I move keyboard focus to the Calendar card and activate it with Enter
    Then I am on the Calendar page

  Scenario: Direct URL to Dashboard loads all four blocks after login
    Given I am logged in as admin on Didaxis
    When I open the Dashboard URL directly in a new browser tab
    Then I see dashboard blocks or cards for Programs, Calendar, Validation, and AI Assist

  Scenario: Rapid double-click on a dashboard card navigates once
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I double-click the Programs card
    Then I am on the Programs page
    And the page does not show duplicate navigation errors or a broken state

  Scenario: Dashboard cards use consistent visible labels
    Given I am logged in as admin on Didaxis
    When I navigate to the Dashboard page
    Then I see a card or block labeled "Programs"
    And I see a card or block labeled "Calendar"
    And I see a card or block labeled "Validation"
    And I see a card or block labeled "AI Assist"

  Scenario: Navigate through all four cards in sequence from Dashboard
    Given I am logged in as admin on Didaxis
    And I am on the Dashboard page
    When I click the Programs card
    Then I am on the Programs page
    When I navigate to the Dashboard page
    And I click the Calendar card
    Then I am on the Calendar page
    When I navigate to the Dashboard page
    And I click the Validation card
    Then I am on the Validation page
    When I navigate to the Dashboard page
    And I click the AI Assist card
    Then I am on the AI Assist page

# Ambiguities and gaps (resolve before automation)
# 1. Ticket AC typo "Dashboardx" — intended starting context is the Dashboard page; confirm route (e.g. /dashboard or post-login landing).
# 2. Expected URL paths and page headings for Calendar, Validation, and AI Assist are not specified — define canonical routes and success locators for automation.
# 3. DS-120 reports Calendar, Validation, and AI Assist cards may not navigate while Programs works — confirm whether all four cards must be clickable in MVP or if some are intentionally disabled.
# 4. DS-121: keyboard focus/activation for block cards — confirm tab order, focus ring, and Enter/Space behavior for each card.
# 5. Non-admin Dashboard behavior is not in AC — confirm whether non-admins see a different dashboard, fewer cards, or are denied access.
# 6. "Right blocks" implies layout/content beyond labels — confirm icons, descriptions, counts, or metrics if in Confluence "Program Setup & Management > Overview".
# 7. Whether Dashboard is the default landing page after admin login affects navigation scenarios — confirm expected post-login redirect.
# 8. No acceptance criteria for browser back/forward or deep-linking to child pages and returning to Dashboard — confirm if in scope.
