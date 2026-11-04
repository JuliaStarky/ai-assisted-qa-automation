import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { runWithNativeDialogWatcher } from './support/browser.helpers';
import {
  ds266UniqueName,
  expectProgramsListLoadOutcome,
  expectProgramsPageEmptyOrUsable,
  expectProgramsPageUsableOrErrorState,
} from './support/ds266.helpers';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsPostUnauthorized,
  mockProgramsPostWithStatus,
  seedProgramWithTracking,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

test.describe('DS-266 Program name validation and duplicate prevention', () => {
  test.describe('Happy paths', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Accept program name with special characters', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Informatique & IA - Niveau 2');
      const description = `Programme bilingue sciences et IA-${Date.now()}`;

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expectNewProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Accept a standard alphanumeric program name', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `AWS and Azure fundamentals-${Date.now()}`,
        trackProgram,
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Leading and trailing spaces are trimmed before save', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Mobile Development 2026');
      const paddedName = `  ${programName}  `;

      await createProgramWithTracking(
        page,
        programsPage,
        paddedName,
        `Mobile track-${Date.now()}`,
        trackProgram,
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programRowByName(paddedName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Reject program name with only whitespace', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const probeName = ds266UniqueName('Whitespace-only probe');

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName('   ');
      await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      await expect(programsPage.programRowByName(probeName)).toHaveCount(0);
    });

    test('Reject an empty program name', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const probeName = ds266UniqueName('Empty-name probe');

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      await expect(programsPage.programRowByName(probeName)).toHaveCount(0);
    });

    test('Reject duplicate program name', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Web Development 2026');
      const stableDescription = `First program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        stableDescription,
        trackProgram,
      );

      const { submitted } = await programsPage.attemptCreateProgram(
        programName,
        `Second program attempt-${Date.now()}`,
      );
      expect(submitted).toBeTruthy();

      await expect(programsPage.duplicateNameError).toBeVisible();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Whitespace-padded duplicate is rejected after trim', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Web Development 2026');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Original-${Date.now()}`,
        trackProgram,
      );

      await programsPage.attemptCreateProgram(`  ${programName}  `, `Padded duplicate-${Date.now()}`);

      await expect(programsPage.duplicateNameError).toBeVisible();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('A rejected duplicate does not change the existing program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Web Development 2026');
      const stableDescription = `Stable row-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, stableDescription, trackProgram);

      await programsPage.attemptCreateProgram(programName, `Overwrite attempt-${Date.now()}`);
      await expect(programsPage.duplicateNameError).toBeVisible();

      await programsPage.reload();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.descriptionInProgramRow(programName, stableDescription)).toBeVisible();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('HTTP error handling', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Program save returns HTTP 503', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Informatique & IA - Niveau 2');

      await mockProgramsPostWithStatus(page, 503);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Programme bilingue sciences et IA-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });

    test('Program list returns HTTP 200 with an empty list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expectProgramsPageEmptyOrUsable(programsPage);
    });

    test('Program list returns HTTP 200 with a malformed body', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expectProgramsListLoadOutcome(programsPage);
    });

    test('Program save returns HTTP 401', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await mockProgramsPostUnauthorized(page);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expect(programsPage.createSessionExpiredFeedback()).toBeVisible();
    });

    test('Program save returns HTTP 403', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await mockProgramsPostWithStatus(page, 403);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });

    test('Program save returns HTTP 404', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await mockProgramsPostWithStatus(page, 404);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });

    test('Program save returns HTTP 501', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await mockProgramsPostWithStatus(page, 501);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });

    test('Program save returns HTTP 502', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await mockProgramsPostWithStatus(page, 502);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });

    test('Program save returns HTTP 300', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Cloud Engineering 2026');

      await mockProgramsPostWithStatus(page, 300);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`AWS and Azure fundamentals-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expectProgramsPageUsableOrErrorState(programsPage);
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Program name of 256 characters is not stored', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = String(Date.now());
      const programName = `${'N'.repeat(256 - suffix.length)}${suffix}`;
      expect(programName).toHaveLength(256);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Over long name-${Date.now()}`);
      await programsPage.trySubmitNewProgramForm();

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expect(programsPage.overlongProgramNameBlockedIndicator()).toBeVisible();
    });

    test('Case-variant of an existing name is not stored as a second program', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Web Development 2026');
      const lowerCaseName = programName.toLowerCase();

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Mixed case seed-${Date.now()}`,
        trackProgram,
      );

      await programsPage.attemptCreateProgram(lowerCaseName, `Case variant-${Date.now()}`);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programRowByName(lowerCaseName)).toHaveCount(0);
    });

    test('HTML-like program name is shown as text', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Test <b>Name</b>');

      const dialogShown = await runWithNativeDialogWatcher(page, async () => {
        await createProgramWithTracking(
          page,
          programsPage,
          programName,
          `Markup probe-${Date.now()}`,
          trackProgram,
        );
      });

      expect(dialogShown).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programNameInRow(programName)).toBeVisible();
    });

    test('Duplicate validation still holds if Create is activated twice', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = ds266UniqueName('Web Development 2026');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed row-${Date.now()}`,
        trackProgram,
      );

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Double submit-${Date.now()}`);
      await programsPage.newProgramModal.doubleClickCreate();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('A corrected name can be created after a duplicate attempt', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const existingName = ds266UniqueName('Web Development 2026');
      const correctedName = ds266UniqueName('Web Development 2027');

      await seedProgramWithTracking(
        page,
        programsPage,
        existingName,
        `Existing row-${Date.now()}`,
        trackProgram,
      );

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(existingName);
      await programsPage.newProgramModal.fillDescription(`Will rename-${Date.now()}`);
      await programsPage.newProgramModal.clickCreate();
      await expect(programsPage.duplicateNameError).toBeVisible();

      await programsPage.newProgramModal.fillProgramName(correctedName);
      const correctedResponse = page.waitForResponse((resp) =>
        isCreateProgramPost(resp.url(), resp.request().method()),
      );
      await programsPage.newProgramModal.clickCreate();
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(correctedResponse, trackProgram);

      await expect(programsPage.programRowByName(correctedName)).toHaveCount(1);
      await expect(programsPage.programRowByName(existingName)).toHaveCount(1);
    });
  });
});
