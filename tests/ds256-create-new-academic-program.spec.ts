import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  clickCreateAndWaitForPostResponse,
  expectFailedSaveKeepsNewProgramFormOpenWithNoError,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  gotoProgramsAndOpenNewProgramForm,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsListStatus,
  mockProgramsPostStatus,
  seedProgramWithTracking,
  trackCreateProgramPostRequests,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

function uniqueName(acPrefix: string): string {
  return `${acPrefix} ${Date.now()}`;
}

test.describe('DS-256 Valeria - Create new academic program', () => {
  test.describe('Happy paths', () => {
    test('Navigate to program creation form', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();

      await expect(programsPage.newProgramModal.heading).toBeVisible();
      await expect(programsPage.newProgramModal.programNameField).toBeVisible();
      await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
      await expect(programsPage.newProgramModal.cancelButton).toBeVisible();
      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('Successfully create a program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = uniqueName('Web Development 2026');
      const description = uniqueName('Full-stack web development program');

      await gotoProgramsAndOpenNewProgramForm(page);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(201);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('Create a program with an empty description', async ({ page, trackProgram }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const programName = uniqueName('Cybersecurity Bootcamp');

      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription('');

      await expect(programsPage.newProgramModal.createButton).toBeEnabled();
      const responsePromise = clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(responsePromise, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Open the creation form from the empty state', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await programsPage.openCreateProgramFromEmptyState();

      await expect(programsPage.newProgramModal.heading).toBeVisible();
      await expect(programsPage.newProgramModal.programNameField).toBeVisible();
      await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('Validation prevents empty program name', async ({ page }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      await programsPage.newProgramModal.fillProgramName('');
      await programsPage.newProgramModal.fillDescription(
        uniqueName('Full-stack web development program'),
      );

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('Whitespace-only program name keeps Create disabled and sends nothing', async ({
      page,
    }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      await programsPage.newProgramModal.fillProgramName('   ');

      const tracker = trackCreateProgramPostRequests(page);
      await programsPage.newProgramModal.pressEnterInProgramNameField();
      await expect.poll(tracker.getPostCount).toBe(0);
      tracker.stop();

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      await expect(programsPage.newProgramModal.heading).toBeVisible();
    });

    test('Cancel discards the form without saving', async ({ page }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const programName = uniqueName('Temporary Program');
      const description = uniqueName('Should not be saved');

      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);
      await programsPage.newProgramModal.clickCancel();

      await expect(programsPage.newProgramModal.heading).toBeHidden();
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Save returns 503 and nothing is created', async ({ page }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const programName = uniqueName('Save Error 503');

      await programsPage.newProgramModal.fillProgramName(programName);
      await mockProgramsPostStatus(page, 503);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(503);

      await expectFailedSaveKeepsNewProgramFormOpenWithNoError(programsPage, programName);
    });

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`Save returns ${status} and nothing is created`, async ({ page }) => {
        const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
        const programName = uniqueName(`Save Error ${status}`);

        await programsPage.newProgramModal.fillProgramName(programName);
        await mockProgramsPostStatus(page, status);

        const response = await clickCreateAndWaitForPostResponse(page, programsPage);
        expect(response.status()).toBe(status);

        await expectFailedSaveKeepsNewProgramFormOpenWithNoError(programsPage, programName);
      });
    }

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`List returns ${status} and the page stays usable for creating`, async ({ page }) => {
        const programsPage = new ProgramsPage(page);
        await mockProgramsListStatus(page, status);
        await programsPage.goto();

        await expect(programsPage.heading).toBeVisible();
        await expect(programsPage.newProgramButton).toBeVisible();
        await expect(programsPage.exactEmptyStateMessage).toBeVisible();

        await programsPage.openNewProgramForm();
        await expect(programsPage.newProgramModal.heading).toBeVisible();
      });
    }

    test('List returns 200 with a malformed body and the page stays usable for creating', async ({
      page,
    }) => {
      test.fail(true, 'Malformed GET list response blanks main area (DS-114)');

      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('Duplicate program name is rejected', async ({ page, trackProgram }) => {
      test.fail(
        true,
        'Didaxis test env allows duplicate program names without validation (DS-122)',
      );

      const programsPage = new ProgramsPage(page);
      const programName = uniqueName('Web Development 2026');

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        uniqueName('Duplicate attempt'),
        trackProgram,
      );

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(uniqueName('Duplicate attempt'));

      const duplicateResponse = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(duplicateResponse), trackProgram);

      expect(duplicateResponse.ok()).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('Special characters in program name are saved unchanged', async ({ page, trackProgram }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const programName = uniqueName('Informatique & IA - Niveau 2');
      const description = uniqueName('Programme bilingue');

      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Leading and trailing spaces in program name are trimmed on create', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const programName = uniqueName('Mobile Development 2026');
      const paddedName = `  ${programName}  `;

      await programsPage.newProgramModal.fillProgramName(paddedName);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);
    });

    test('Program name of 255 characters is accepted', async ({ page, trackProgram }) => {
      const programsPage = await gotoProgramsAndOpenNewProgramForm(page);
      const suffix = ` ${Date.now()}`;
      const programName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
      expect(programName).toHaveLength(255);

      await programsPage.newProgramModal.fillProgramName(programName);

      const responsePromise = clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(responsePromise, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });
});
