---
name: pom-conventions
description: Page Object Model conventions for Playwright tests in this project. Apply whenever generating, refactoring, or reviewing any Playwright test that interacts with the Didaxis UI — even if the user doesn't say "POM". Tests should never contain inline locators.
---

# Page Object Model Conventions

All UI interactions go through Page Objects in pages/. Tests describe intent; POMs handle mechanics.

## Steps

One Page Object class per page or distinct component. Examples: LoginPage, ProgramsPage, NewProgramModal.

Define locators as readonly properties in the constructor, in this priority order only: getByRole → getByLabel / getByPlaceholder → getByText → getByTestId (escape hatch only — comment why nothing higher worked). Never CSS selectors, XPath, or brittle text.

If a locator matches more than one element, disambiguate with .filter({ hasText }) — do not use .first().

Provide methods for user actions: goto, clickX, fillY, submit. Methods perform actions; they do not assert. Never use waitForTimeout inside POMs — callers wait with web-first expect(locator).toBeVisible() / .toBeEnabled() / .toHaveText().

No assertions inside Page Objects. All expect(...) calls live in the test files, never in pages/. Prefer auto-retrying web-first expects; never expect(await locator.isVisible()).toBe(true).

Compose POMs when a page contains distinct components — e.g. ProgramsPage holds a NewProgramModal instance.

Import POMs at the top of each spec; instantiate with new XxxPage(page).

Modal/component POMs expose a role-based `dialog` locator. For axe `.include()` scoping only, they may also expose `axeIncludeSelector()` — no axe scans or `expect` calls in POMs (see [a11y-checks](../a11y-checks/SKILL.md)).

## Output

Page Object files in pages/. Tests in tests/ that import them. Accessibility: dedicated `tests/<feature>.a11y.spec.ts` per [a11y-checks](../a11y-checks/SKILL.md).
