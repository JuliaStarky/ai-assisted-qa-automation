import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

test.describe('DS-4 Delete program with confirmation', () => {
  test.describe('Positive flows', () => {
    test('TC-001 — Confirmed deletion removes program from list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete me-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-002 — Cancel keeps program in list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Keep this row-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-003 — Confirmation dialog identifies the program being deleted', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Data Science Fundamentals-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Identify in dialog-${Date.now()}`,
        trackProgram,
      );

      const { message } = await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      expect(message).toContain(programName);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('TC-004 — List updates after delete without affecting other programs', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const deleteTarget = `Test Program-${Date.now()}`;
      const keepTarget = `Cloud Engineering 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        deleteTarget,
        `To remove-${Date.now()}`,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        keepTarget,
        `Should stay-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(deleteTarget, 'accept');

      await expect(programsPage.programRowByName(deleteTarget)).toHaveCount(0);
      await expect(programsPage.programRowByName(keepTarget)).toHaveCount(1);
    });

    test('TC-005 — Re-create program with same name after delete', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;
      const firstDescription = `First life-${Date.now()}`;
      const secondDescription = `Second life-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, firstDescription, trackProgram);
      await programsPage.deleteProgramWithDialog(programName, 'accept');
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, programName, secondDescription, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, secondDescription)).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test('TC-006 — Failed delete preserves program in list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `API failure-${Date.now()}`,
        trackProgram,
      );

      await page.route('**/api/programs/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Server Error' }),
          });
          return;
        }
        await route.continue();
      });

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('TC-007 — Delete program with special characters in name', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Special chars-${Date.now()}`,
        trackProgram,
      );

      const { message } = await programsPage.deleteProgramWithDialog(programName, 'accept');
      expect(message).toContain(programName);

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });
  });
});
