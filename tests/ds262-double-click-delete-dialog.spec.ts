import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramDeleteBadGateway,
  mockProgramDeleteForbidden,
  mockProgramDeleteMultipleChoices,
  mockProgramDeleteNotFound,
  mockProgramDeleteNotImplemented,
  mockProgramDeleteServiceUnavailable,
  mockProgramDeleteUnauthorized,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

test.describe('DS-262 Double-clicking delete icon opens two confirmation dialogs', () => {
  test.describe('Happy paths', () => {
    test('Double-clicking delete opens a single confirmation dialog', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 dialog count-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'dismiss-each',
      );

      expect(dialogCount).toBe(1);
    });

    test('Confirming the single dialog deletes the program once', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 confirm once-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await programsPage.waitForNoFurtherNativeDialog();
    });

    test('A single click still opens one confirmation dialog', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 single click-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.singleClickDeleteRecordDialogs(programName);

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Negative', () => {
    test('Double-click does not open a second confirmation dialog', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 no second dialog-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'dismiss-each',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Cancelling the single dialog after a double-click keeps the program', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 cancel after dblclick-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'dismiss-each',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await programsPage.waitForNoFurtherNativeDialog();
    });

    test('Unauthorized delete after one confirmation keeps the program', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 401-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteUnauthorized(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test('Double-click delete on a special-character name opens one dialog', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 special chars-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount, messages } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'dismiss-each',
      );

      expect(dialogCount).toBe(1);
      expect(messages[0]).toContain(programName);
    });

    test('Double-click delete on the only program opens one dialog', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 sole program-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Triple-click on the delete control still opens one dialog', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 triple click-${Date.now()}`,
        trackProgram,
      );

      const { dialogCount } = await programsPage.tripleClickDeleteRecordDialogs(programName);

      expect(dialogCount).toBe(1);
    });
  });

  test.describe('API outcomes', () => {
    test('Delete save returns HTTP 503', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 503-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteServiceUnavailable(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list returns HTTP 200 with an empty list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list returns HTTP 200 with a malformed body', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expect(programsPage.programListRows()).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    test('Program list or delete returns HTTP 403', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 403-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteForbidden(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list or delete returns HTTP 404', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 404-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteNotFound(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list or delete returns HTTP 501', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 501-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteNotImplemented(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list or delete returns HTTP 502', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 502-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteBadGateway(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Program list or delete returns HTTP 300', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `DS-262 delete 300-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteMultipleChoices(page);

      const { dialogCount } = await programsPage.doubleClickDeleteRecordDialogs(
        programName,
        'accept-first-dismiss-rest',
      );

      expect(dialogCount).toBe(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });
  });
});
