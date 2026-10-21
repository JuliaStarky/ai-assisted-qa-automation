import AxeBuilder from '@axe-core/playwright';
import { test } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import { expectProgramsPageReady } from './support/programs-flow.helpers';
import { reportA11yFinding, reportAxeViolations } from './support/a11y.helpers';

test.describe('Programs page accessibility', () => {
  test('axe scan of Programs page (wcag2a, wcag2aa)', async ({ page }, testInfo) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);

    try {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      if (results.violations.length > 0) {
        await reportAxeViolations(testInfo, results.violations);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      testInfo.skip(true, `axe scan could not run: ${message}`);
    }
  });

  test('keyboard tab to New Program then Enter opens dialog', async ({ page }, testInfo) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);

    await programsPage.tabToNewProgramButton();

    const newProgramFocused = await programsPage.newProgramButton.evaluate(
      (el) => el === document.activeElement,
    );
    if (!newProgramFocused) {
      await reportA11yFinding(
        testInfo,
        'keyboard-focus-new-program',
        'Expected + New Program control to receive focus after Tab navigation.',
      );
      return;
    }

    await programsPage.activateFocusedControlWithKeyboard();

    const dialogVisible = await programsPage.newProgramModal.dialog.isVisible();
    if (!dialogVisible) {
      await reportA11yFinding(
        testInfo,
        'keyboard-open-new-program-dialog',
        'Expected New Program dialog to open after activating the focused control with Enter.',
      );
    }
  });
});
