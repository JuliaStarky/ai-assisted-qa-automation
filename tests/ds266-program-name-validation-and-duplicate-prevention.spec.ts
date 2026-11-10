import type { TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  clickCreateAndWaitForPostResponse,
  clickSaveAndWaitForPatchResponse,
  createProgramWithTracking,
  expectFailedSaveKeepsNewProgramFormOpen,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsPostStatus,
  seedProgramWithTracking,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

function uniqueSuffix(testInfo: TestInfo) {
  return `${Date.now()}-${testInfo.parallelIndex}`;
}

async function expectNoCreateFormErrorFeedback(programsPage: ProgramsPage) {
  const { dialog, duplicateNameError } = programsPage.newProgramModal;
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(duplicateNameError).toBeHidden();
}

test.describe('DS-266 Program name validation and duplicate prevention', () => {
  test.describe('Happy paths', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('TC-001 — Accept program name with special characters', { tag: '@smoke' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${uniqueSuffix(testInfo)}`;
      const description = `Programme bilingue-${uniqueSuffix(testInfo)}`;

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('TC-002 — Accept a single-character program name', { tag: '@sanity' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const programName = `X-${uniqueSuffix(testInfo)}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `Single char-${uniqueSuffix(testInfo)}`,
        trackProgram,
      );
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('TC-003 — Leading and trailing spaces are trimmed before saving', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Mobile Development 2026-${uniqueSuffix(testInfo)}`;
      const paddedName = `  ${programName}  `;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(paddedName);
      await programsPage.newProgramModal.fillDescription(`Trim check-${uniqueSuffix(testInfo)}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);
      await expectNewProgramModalClosed(programsPage);

      expect(response.status()).toBe(201);
      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('TC-004 — Reject program name with only whitespace', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      let createPostSeen = false;
      const onRequest = (request: { url: () => string; method: () => string }) => {
        if (isCreateProgramPost(request.url(), request.method())) {
          createPostSeen = true;
        }
      };
      page.on('request', onRequest);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName('   ');
      await programsPage.newProgramModal.fillDescription(`Whitespace name-${Date.now()}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      expect(createPostSeen).toBe(false);

      page.off('request', onRequest);
    });

    test('TC-005 — Reject empty program name', { tag: '@regression' }, async ({ page }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillDescription(`Name missing-${uniqueSuffix(testInfo)}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('TC-006 — Reject duplicate program name', { tag: '@regression' }, async ({ page, trackProgram }, testInfo) => {
      test.fail(
        true,
        'Didaxis allows duplicate program names on create (DS-122 / DS-133 / DS-137)',
      );

      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${uniqueSuffix(testInfo)}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `First program-${uniqueSuffix(testInfo)}`,
        trackProgram,
      );

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Duplicate attempt-${uniqueSuffix(testInfo)}`);

      const duplicateResponse = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(duplicateResponse), trackProgram);

      expect(duplicateResponse.ok()).toBe(false);
      await expect(programsPage.newProgramModal.duplicateNameError).toBeVisible();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('TC-007 — Reject case-variant duplicate program name', { tag: '@regression' }, async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis allows case-variant duplicate program names (DS-146 / DS-190)');

      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Web Development 2026-${suffix}`;
      const caseVariantName = `web development 2026-${suffix}`;

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `Original-${suffix}`,
        trackProgram,
      );

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(caseVariantName);
      await programsPage.newProgramModal.fillDescription(`Case variant-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
    });

    test('TC-008 — Reject renaming a program to an existing name', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      test.fail(
        true,
        'Didaxis allows rename to an existing program name (DS-129 / DS-131)',
      );

      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const existingName = `Web Development 2026-${suffix}`;
      const editTarget = `Data Science Fundamentals-${suffix}`;

      await createProgramWithTracking(
        page,
        programsPage,
        existingName,
        `Existing-${suffix}`,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        editTarget,
        `Other program-${suffix}`,
        trackProgram,
      );

      await programsPage.openEditProgram(editTarget);
      await programsPage.editProgramModal.fillProgramName(existingName);

      const patchResponse = await clickSaveAndWaitForPatchResponse(page, programsPage);

      expect(patchResponse.ok()).toBe(false);
      await expect(programsPage.editProgramModal.duplicateNameError).toBeVisible();
      await expect(programsPage.programRowByName(existingName)).toHaveCount(1);
      await expect(programsPage.programRowByName(editTarget)).toHaveCount(1);
    });

    test('TC-009 — Whitespace-only name cannot be saved on edit', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${uniqueSuffix(testInfo)}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed for edit whitespace-${uniqueSuffix(testInfo)}`,
        trackProgram,
      );

      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName('   ');

      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    });

    test('TC-010 — Save returns 503 and the form stays open', { tag: '@regression' }, async ({ page }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Save Error 503-${uniqueSuffix(testInfo)}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Valid description-${uniqueSuffix(testInfo)}`);

      await mockProgramsPostStatus(page, 503);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(503);

      await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
      await expectNoCreateFormErrorFeedback(programsPage);
    });

    const saveErrorStatuses: { tc: string; status: number }[] = [
      { tc: 'TC-011', status: 401 },
      { tc: 'TC-012', status: 403 },
      { tc: 'TC-013', status: 404 },
      { tc: 'TC-014', status: 501 },
      { tc: 'TC-015', status: 502 },
      { tc: 'TC-016', status: 300 },
    ];
    for (const { tc, status } of saveErrorStatuses) {
      test(`${tc} — Save returns ${status} and the form stays open`, { tag: '@regression' }, async ({ page }, testInfo) => {
        const programsPage = new ProgramsPage(page);
        const programName = `Save Error ${status}-${uniqueSuffix(testInfo)}`;

        await programsPage.openNewProgramForm();
        await programsPage.newProgramModal.fillProgramName(programName);
        await programsPage.newProgramModal.fillDescription(`Valid description-${uniqueSuffix(testInfo)}`);

        await mockProgramsPostStatus(page, status);

        const response = await clickCreateAndWaitForPostResponse(page, programsPage);
        expect(response.status()).toBe(status);

        await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
        await expectNoCreateFormErrorFeedback(programsPage);
      });
    }
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('TC-017 — Program name of exactly 255 characters is accepted', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `${'N'.repeat(255 - suffix.length)}${suffix}`;
      expect(programName).toHaveLength(255);

      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        `Max length-${suffix}`,
        trackProgram,
      );
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('TC-018 — Program name of 256 characters is rejected', { tag: '@regression' }, async ({ page, trackProgram }, testInfo) => {
      test.fail(true, 'Didaxis accepts 256-character program names (DS-138)');

      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `${'N'.repeat(256 - suffix.length)}${suffix}`;
      expect(programName).toHaveLength(256);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Over max-${suffix}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      expect(response.ok()).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-019 — Empty program list does not block creating a new name', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await programsPage.openCreateProgramFromEmptyState();
      await expect(programsPage.newProgramModal.heading).toBeVisible();
      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('TC-020 — Malformed program list body renders nothing', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      const listResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/programs') && resp.request().method() === 'GET',
      );
      await programsPage.goto();
      await listResponse;

      await expect(programsPage.heading).toBeHidden();
      await expect(programsPage.newProgramButton).toBeHidden();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  });
});
