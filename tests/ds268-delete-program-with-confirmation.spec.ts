import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectProgramsPageEmptyOrUsable,
  expectProgramsPageErrorOrUsable,
  expectProgramsPageLoadOutcome,
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramDeleteWithStatus,
  mockProgramsListMalformedResponse,
  mockProgramsPostServiceUnavailable,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

function ds268Name(semantic: string): string {
  return `DS-268 ${semantic}-${Date.now()}`;
}

test.describe('DS-268 Delete program with confirmation', () => {
  test.describe('Happy paths', () => {
    test('Delete program with confirmation', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete with confirmation-${Date.now()}`,
        trackProgram,
      );

      const { type } = await programsPage.deleteProgramWithDialog(programName, 'accept');
      expect(type).toBe('confirm');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Cancel program deletion', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Web Development 2026');
      const description = `Keep this row-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      const { type } = await programsPage.deleteProgramWithDialog(programName, 'dismiss');
      expect(type).toBe('confirm');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('Confirmed delete removes only the chosen program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const deleteTarget = ds268Name('Test Program');
      const keepTarget = ds268Name('Cloud Engineering 2026');

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
  });

  test.describe('Negative flows', () => {
    test('A program stays in the list when deletion is not confirmed', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `No confirm-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Program save returns HTTP 503', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');
      const description = `Save failure probe-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await mockProgramsPostServiceUnavailable(page);

      await programsPage.attemptCreateProgram(programName, description);

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program list returns HTTP 200 with an empty list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();

      await expectProgramsPageEmptyOrUsable(programsPage);
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('Program list returns HTTP 200 with a malformed body', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expectProgramsPageLoadOutcome(programsPage);
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('Program delete returns HTTP 401', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 401-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 401);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program delete returns HTTP 403', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 403-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 403);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program delete returns HTTP 404', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 404-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 404);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program delete returns HTTP 501', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 501-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 501);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program delete returns HTTP 502', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 502-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 502);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsPageErrorOrUsable(programsPage);
    });

    test('Program delete returns HTTP 300', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 300-${Date.now()}`,
        trackProgram,
      );
      await mockProgramDeleteWithStatus(page, 300);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsPageErrorOrUsable(programsPage);
    });
  });

  test.describe('Edge cases', () => {
    test('Delete a program whose name contains special characters', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Informatique & IA - Niveau 2');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Special chars delete-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Delete the only program in the list', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Only row-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Opening delete twice still asks for confirmation before the program disappears', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Double delete click-${Date.now()}`,
        trackProgram,
      );

      const dialogPromise = page.waitForEvent('dialog');
      await programsPage.doubleClickDeleteButton(programName);
      const dialog = await dialogPromise;

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      expect(dialog.type()).toBe('confirm');

      await dialog.accept();
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('The same name can be created again after a confirmed delete', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds268Name('Test Program');
      const firstDescription = `First life-${Date.now()}`;
      const secondDescription = `Second life-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, firstDescription, trackProgram);
      await programsPage.deleteProgramWithDialog(programName, 'accept');
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        secondDescription,
        trackProgram,
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, secondDescription)).toBeVisible();
    });
  });
});
