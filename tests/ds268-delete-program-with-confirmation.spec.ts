import type { TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramDeleteStatus,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

function uniqueSuffix(testInfo: TestInfo): string {
  return `${Date.now()}-${testInfo.parallelIndex}`;
}

function expectedDeleteConfirmMessage(programName: string): string {
  return `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.`;
}

function isProgramDeleteRequest(url: string, method: string): boolean {
  return method === 'DELETE' && /\/api\/programs\/.+/.test(url);
}

test.describe('DS-268 Delete program with confirmation', () => {
  test.describe('Happy paths', () => {
    test('TC-001 — Delete program with confirmation', { tag: '@smoke' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;
      const description = `Delete me-${suffix}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      const [deleteResponse, dialogResult] = await Promise.all([
        page.waitForResponse(
          (resp) => isProgramDeleteRequest(resp.url(), resp.request().method()) && resp.status() === 200,
        ),
        programsPage.deleteProgramWithDialog(programName, 'accept'),
      ]);

      expect(deleteResponse.ok()).toBe(true);
      expect(dialogResult.type).toBe('confirm');
      expect(dialogResult.message).toBe(expectedDeleteConfirmMessage(programName));

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);

      await programsPage.reload();
      await expectProgramsPageReady(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-002 — Deleted program stays gone after reload', { tag: '@sanity' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete me-${suffix}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);

      await programsPage.reload();
      await expectProgramsPageReady(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-003 — Confirmation dialog names the program and warns about consequences', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete me-${suffix}`,
        trackProgram,
      );

      const { message, type } = await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      expect(type).toBe('confirm');
      expect(message).toBe(expectedDeleteConfirmMessage(programName));
    });

    test('TC-004 — Deleting one program leaves other programs intact', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const deleteTarget = `Test Program-${suffix}`;
      const keepTarget = `Test Program Keep-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        deleteTarget,
        `Delete me-${suffix}`,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        keepTarget,
        `Keep row-${suffix}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(deleteTarget, 'accept');

      await expect(programsPage.programRowByName(deleteTarget)).toHaveCount(0);
      await expect(programsPage.programRowByName(keepTarget)).toHaveCount(1);
    });
  });

  test.describe('Negative flows', () => {
    test('TC-005 — Cancel program deletion', { tag: '@regression' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;
      const description = `Delete me-${suffix}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      let deleteRequested = false;
      const onRequest = (request: { method: () => string; url: () => string }) => {
        if (isProgramDeleteRequest(request.url(), request.method())) {
          deleteRequested = true;
        }
      };
      page.on('request', onRequest);

      const { type } = await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      page.off('request', onRequest);

      expect(type).toBe('confirm');
      expect(deleteRequested).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-006 — Delete returns 503 and the program remains', { tag: '@regression' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete me-${suffix}`,
        trackProgram,
      );
      await mockProgramDeleteStatus(page, 503);

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);

      await programsPage.reload();
      await expectProgramsPageReady(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      const tcNumber = { 401: '007', 403: '008', 404: '009', 501: '010', 502: '011', 300: '012' }[
        status
      ];

      test(`TC-${tcNumber} — Delete returns ${status} and the program remains`, { tag: '@regression' }, async ({
        page,
        trackProgram,
      }, testInfo) => {
        const programsPage = new ProgramsPage(page);
        const suffix = uniqueSuffix(testInfo);
        const programName = `Test Program-${suffix}`;

        await seedProgramWithTracking(
          page,
          programsPage,
          programName,
          `Delete me-${suffix}`,
          trackProgram,
        );
        await mockProgramDeleteStatus(page, status);

        await programsPage.deleteProgramWithDialog(programName, 'accept');

        await expect(programsPage.programRowByName(programName)).toHaveCount(1);

        await programsPage.reload();
        await expectProgramsPageReady(programsPage);
        await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      });
    }
  });

  test.describe('Edge cases', () => {
    test('TC-013 — Empty program list shows no delete actions', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.allDeleteButtons()).toHaveCount(0);
    });

    test('TC-014 — Malformed program list body renders nothing to delete', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);

      const listResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/api/programs') && resp.request().method() === 'GET',
      );
      await programsPage.goto();
      await listResponsePromise;

      await expect(programsPage.heading).toBeHidden();
      await expect(programsPage.allDeleteButtons()).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    test('TC-015 — Delete a program whose name has special characters', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Informatique & IA — Cohorte #1 (2026)-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Special chars-${suffix}`,
        trackProgram,
      );

      const { message, type } = await programsPage.deleteProgramWithDialog(programName, 'accept');

      expect(type).toBe('confirm');
      expect(message).toBe(expectedDeleteConfirmMessage(programName));
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });
  });

  test.describe('Accessibility', () => {
    test('TC-016 — Delete control has accessible name and is keyboard operable', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Test Program-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete me-${suffix}`,
        trackProgram,
      );

      const deleteControl = programsPage.deleteButton(programName);
      await expect(deleteControl).toBeVisible();

      await deleteControl.focus();
      await expect(deleteControl).toBeFocused();

      const [dialogResult] = await Promise.all([
        page.waitForEvent('dialog').then(async (dialog) => {
          const result = { message: dialog.message(), type: dialog.type() };
          await dialog.dismiss();
          return result;
        }),
        page.keyboard.press('Enter'),
      ]);

      expect(dialogResult.type).toBe('confirm');
      expect(dialogResult.message).toBe(expectedDeleteConfirmMessage(programName));
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });
});
