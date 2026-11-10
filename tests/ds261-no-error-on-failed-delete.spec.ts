import { test, expect } from '../fixtures/cleanup.fixture';
import type { Response } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  expectProgramsPageReady,
  isProgramDeleteRequest,
  mockEmptyProgramList,
  mockProgramDeleteServerError,
  mockProgramDeleteStatus,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

test.describe('DS-261 No error message shown when program delete API fails', () => {
  test.describe('Happy paths', () => {
    test('Failed delete with HTTP 500 keeps the program and shows an error', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Failed delete-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteServerError(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.userVisibleErrorFeedback).toBeVisible();
    });

    test('Successful delete still removes the program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Remove on success-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expect(programsPage.userVisibleErrorFeedback).toBeHidden();
    });
  });

  test.describe('Negative', () => {
    test('Cancelled delete does not show a delete-failure error', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Cancel delete-${Date.now()}`,
        trackProgram,
      );

      await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.userVisibleErrorFeedback).toBeHidden();
    });

    test('Unauthorized delete keeps the program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Unauthorized delete-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 401);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });

    test('Delete is not sent when confirmation is dismissed', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `No DELETE on dismiss-${Date.now()}`,
        trackProgram,
      );

      let deleteCompleted = false;
      const onResponse = (response: Response) => {
        const request = response.request();
        if (isProgramDeleteRequest(request.url(), request.method())) {
          deleteCompleted = true;
        }
      };
      page.on('response', onResponse);
      try {
        await programsPage.deleteProgramWithDialog(programName, 'dismiss');
      } finally {
        page.off('response', onResponse);
      }

      expect(deleteCompleted).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('Failed delete of a special-character name keeps that program', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Special chars failed delete-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteServerError(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.userVisibleErrorFeedback).toBeVisible();
    });

    test('Failed delete of the only program does not show the empty state', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Only program-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteServerError(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
    });

    test('A second failed delete still keeps the program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Second failure-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteServerError(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.userVisibleErrorFeedback).toBeVisible();

      await programsPage.deleteProgramWithDialog(programName, 'accept');
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.userVisibleErrorFeedback).toBeVisible();
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
        `Delete 503-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 503);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

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
    });

    test('Program list or delete returns HTTP 403', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test Program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Delete 403-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 403);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

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
        `Delete 404-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 404);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

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
        `Delete 501-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 501);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

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
        `Delete 502-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 502);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

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
        `Delete 300-${Date.now()}`,
        trackProgram,
      );

      await mockProgramDeleteStatus(page, 300);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.heading).toBeVisible();
    });
  });
});
