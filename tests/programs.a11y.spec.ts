import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import { expectProgramsPageReady } from './support/programs-flow.helpers';

test.describe('Programs page accessibility', () => {
  test('axe scan of Programs page (wcag2a, wcag2aa)', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    await expect(results.violations).toEqual([]);
  });

  test('keyboard tab to New Program then Enter opens dialog', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);

    await programsPage.tabToNewProgramButton();
    await expect(programsPage.newProgramButton).toBeFocused();

    await programsPage.activateFocusedControlWithKeyboard();
    await expect(programsPage.newProgramModal.dialog).toBeVisible();
  });
});
