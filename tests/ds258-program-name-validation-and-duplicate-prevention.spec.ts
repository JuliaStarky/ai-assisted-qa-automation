import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  clickCreateAndWaitForPostResponse,
  createProgramWithTracking,
  expectFailedSaveKeepsNewProgramFormOpen,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsPostStatus,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';
import {
  expectNoCreatePostSent,
  expectNoPageAlerts,
  gotoProgramsAndAwaitListResponse,
  mockProgramsListStatus,
  programNameOfExactLength,
  uniqueTestSuffix,
} from './support/ds258-validation.helpers';

test.describe('DS-258 Program name validation and duplicate prevention', () => {
  test.describe('Happy paths', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Accept program name with special characters', async ({ page, trackProgram }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${suffix}`;
      const description = `Programme bilingue-${suffix}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(201);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);

      await expectNewProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Accept a unique program name', async ({ page, trackProgram }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${suffix}`;
      const description = `Full-stack web development program-${suffix}`;

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expectNewProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Reject program name with only whitespace', async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName('   ');
      await programsPage.newProgramModal.fillDescription(`Whitespace name attempt-${suffix}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();

      await expectNoCreatePostSent(page, () =>
        programsPage.newProgramModal.pressEnterInProgramNameField(),
      );

      await expect(programsPage.newProgramModal.heading).toBeVisible();
    });

    test('Reject empty program name', async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillDescription(`No name attempt-${suffix}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('Reject duplicate program name', async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis allows duplicate program names on create (DS-122)');

      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${suffix}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `First description-${suffix}`,
        trackProgram,
      );
      await expectNewProgramModalClosed(programsPage);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Second program attempt-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Reject case-variant duplicate program name', async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis allows case-variant duplicate program names (DS-146)');

      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${suffix}`;
      const lowercaseName = `web development 2026-${suffix}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `Original description-${suffix}`,
        trackProgram,
      );
      await expectNewProgramModalClosed(programsPage);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(lowercaseName);
      await programsPage.newProgramModal.fillDescription(`Case variant duplicate-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
      await expect(programsPage.programRowByName(lowercaseName)).toHaveCount(0);
    });

    test('Reject duplicate program name padded with spaces', async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis allows trimmed duplicate program names on create (DS-122)');

      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${suffix}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `Original-${suffix}`,
        trackProgram,
      );
      await expectNewProgramModalClosed(programsPage);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(`  ${programName}  `);
      await programsPage.newProgramModal.fillDescription(`Padded duplicate-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Save returns 503 and nothing is created', async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Save Error 503-${suffix}`;

      await programsPage.openNewProgramForm();
      await mockProgramsPostStatus(page, 503);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Valid description-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(503);

      await expect(programsPage.newProgramModal.heading).toBeVisible();
      await expect(programsPage.newProgramModal.programNameField).toHaveValue(programName);
      await expectNoPageAlerts(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`Save returns ${status} and nothing is created`, async ({ page }, testInfo) => {
        const suffix = uniqueTestSuffix(testInfo.parallelIndex);
        const programsPage = new ProgramsPage(page);
        const programName = `Save Error ${status}-${suffix}`;

        await programsPage.openNewProgramForm();
        await mockProgramsPostStatus(page, status);
        await programsPage.newProgramModal.fillProgramName(programName);
        await programsPage.newProgramModal.fillDescription(`Valid description-${suffix}`);

        const response = await clickCreateAndWaitForPostResponse(page, programsPage);
        expect(response.status()).toBe(status);

        await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
        await expectNoPageAlerts(programsPage);
      });
    }

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`List returns ${status} and the creation form still validates names`, async ({
        page,
      }) => {
        const programsPage = new ProgramsPage(page);
        await mockProgramsListStatus(page, status);
        await programsPage.goto();
        await expect(programsPage.exactEmptyStateMessage).toBeVisible();

        await programsPage.openNewProgramForm();
        await programsPage.newProgramModal.fillProgramName('   ');
        await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      });
    }

    test('List returns 200 with an empty list and the creation form still validates names', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expect(programsPage.exactEmptyStateMessage).toBeVisible();

      await programsPage.openCreateProgramFromEmptyState();
      await programsPage.newProgramModal.fillProgramName('   ');
      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('List returns 200 with a malformed body and the page stays usable', async ({ page }) => {
      test.fail(
        true,
        'Didaxis main area goes blank after malformed GET /api/programs list response (DS-114)',
      );

      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await gotoProgramsAndAwaitListResponse(page, programsPage);

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Leading and trailing spaces are trimmed from a valid name', async ({
      page,
      trackProgram,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `Mobile Development 2026-${suffix}`;
      const paddedName = `  ${programName}  `;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(paddedName);
      await programsPage.newProgramModal.fillDescription(`Trim check-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);
    });

    test('Program name of 255 characters is accepted', async ({ page, trackProgram }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = programNameOfExactLength(255, suffix);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Max length description-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(201);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);
      await expectNewProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Program name of 256 characters is rejected', async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis accepts 256-character program names (DS-138)');

      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = programNameOfExactLength(256, suffix);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Over max length-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
    });

    test('Single-character program name is accepted', async ({ page, trackProgram }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo.parallelIndex);
      const programsPage = new ProgramsPage(page);
      const programName = `X-${suffix}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Single char name-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(201);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);
      await expectNewProgramModalClosed(programsPage);
    });
  });
});
