import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectProgramsPageReady,
  mockEmptyProgramList,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

test.describe('DS-5 Program list display', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReady(programsPage);
    });

    test('TC-001 — List shows each program name and description', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const firstName = `Web Development 2026-${Date.now()}`;
      const firstDesc = `Full-stack web development program-${Date.now()}`;
      const secondName = `Data Science Fundamentals-${Date.now()}`;
      const secondDesc = `Introductory data science track-${Date.now()}`;

      await createProgramWithTracking(page, programsPage, firstName, firstDesc, trackProgram);
      await createProgramWithTracking(page, programsPage, secondName, secondDesc, trackProgram);

      await expect(programsPage.programNameInRow(firstName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRowFirst(firstName, firstDesc)).toBeVisible();
      await expect(programsPage.programNameInRow(secondName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRowFirst(secondName, secondDesc)).toBeVisible();
    });

    test('TC-002 — Empty state message and create-first-program prompt', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.emptyStateMessage).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-003 — List reflects newly created program in same session', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const existingName = `Web Development 2026-${Date.now()}`;
      const newName = `Cloud Engineering 2026-${Date.now()}`;
      const newDesc = `Cloud fundamentals-${Date.now()}`;

      await createProgramWithTracking(
        page,
        programsPage,
        existingName,
        `Existing program-${Date.now()}`,
        trackProgram,
      );
      await createProgramWithTracking(page, programsPage, newName, newDesc, trackProgram);

      await expect(programsPage.programNameInRow(existingName)).toBeVisible();
      await expect(programsPage.programNameInRow(newName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRowFirst(newName, newDesc)).toBeVisible();
    });

    test('TC-004 — Programs page shows expected page chrome', async ({ page }) => {
      const programsPage = new ProgramsPage(page);

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test('TC-005 — Empty state does not show program rows', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto({ waitForNetworkIdle: true });

      await expect(programsPage.emptyStateMessage).toBeVisible();
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('TC-006 — Deleted program no longer appears in list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const deleteTarget = `Test Program-${Date.now()}`;
      const keepTarget = `Web Development 2026-${Date.now()}`;
      const keepDesc = `Still listed-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        deleteTarget,
        `Remove from list-${Date.now()}`,
        trackProgram,
      );
      await createProgramWithTracking(page, programsPage, keepTarget, keepDesc, trackProgram);

      await programsPage.deleteProgramWithDialog(deleteTarget, 'accept');
      await expect(programsPage.programRowByName(deleteTarget)).toHaveCount(0);

      await expect(programsPage.programNameInRow(keepTarget)).toBeVisible();
      await expect(programsPage.descriptionInProgramRowFirst(keepTarget, keepDesc)).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test('TC-007 — Special characters render correctly in list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
      const description = `Notes: "quotes", <tags>, émojis 🎓-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programNameInRow(programName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRowFirst(programName, description)).toBeVisible();
    });

    test('TC-008 — Duplicate display names remain distinguishable by description', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const sharedName = `Web Development 2026-${Date.now()}`;
      const firstDesc = `First duplicate row-${Date.now()}`;
      const secondDesc = `Second duplicate row-${Date.now()}`;

      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, sharedName, firstDesc, trackProgram);
      await createProgramWithTracking(page, programsPage, sharedName, secondDesc, trackProgram);

      await expect(programsPage.programRowByName(sharedName)).toHaveCount(2);
      await expect(programsPage.visibleText(firstDesc)).toBeVisible();
      await expect(programsPage.visibleText(secondDesc)).toBeVisible();
    });
  });
});
