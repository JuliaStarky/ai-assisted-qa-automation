import AxeBuilder from '@axe-core/playwright';
import type { Request } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  expectEditProgramModalClosed,
  expectFailedSaveKeepsEditProgramFormOpen,
  expectProgramsPageReady,
  isProgramPatch,
  mockEmptyProgramList,
  mockProgramPatchStatus,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
  seedProgramWithTrackingAndCaptureCreateData,
  type ProgramApiRecord,
} from './support/programs-flow.helpers';

function preservedFieldsFromCreate(createData: ProgramApiRecord) {
  return {
    name: createData.name,
    total_hours: createData.total_hours ?? null,
    default_session_hours: createData.default_session_hours ?? null,
    default_exam_hours: createData.default_exam_hours ?? null,
    target_audience: createData.target_audience ?? null,
    focus_areas: createData.focus_areas ?? null,
    sync_async_ratio: createData.sync_async_ratio ?? null,
  };
}

function expectPatchPreservesCreateFields(
  patchData: ProgramApiRecord,
  createSnapshot: ReturnType<typeof preservedFieldsFromCreate>,
) {
  expect(patchData.name).toBe(createSnapshot.name);
  expect(patchData.total_hours ?? null).toBe(createSnapshot.total_hours);
  expect(patchData.default_session_hours ?? null).toBe(createSnapshot.default_session_hours);
  expect(patchData.default_exam_hours ?? null).toBe(createSnapshot.default_exam_hours);
  expect(patchData.target_audience ?? null).toBe(createSnapshot.target_audience);
  expect(patchData.focus_areas ?? null).toBe(createSnapshot.focus_areas);
  expect(patchData.sync_async_ratio ?? null).toBe(createSnapshot.sync_async_ratio);
}

test.describe('DS-265 Edit existing program details', () => {
  test.describe('Happy paths', () => {
    test('TC-001 — Open program for editing', { tag: '@sanity' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.openEditProgram(programName);

      await expect(programsPage.editProgramModal.heading).toBeVisible();
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await expect(programsPage.editProgramModal.descriptionField).toHaveValue(description);
      await expect(programsPage.editProgramModal.saveButton).toBeVisible();
      await expect(programsPage.editProgramModal.cancelButton).toBeVisible();
    });

    test('TC-002 — Successfully edit a program name', { tag: '@smoke' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);

      const patchPromise = page.waitForResponse(
        (resp) => isProgramPatch(resp.url(), resp.request().method()) && resp.ok(),
      );
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;
      expect(patchResponse.status()).toBe(200);

      await expectEditProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-003 — Edit preserves unchanged fields', { tag: '@sanity' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const originalDescription = `Full-stack web development program-${Date.now()}`;
      const updatedDescription = `Updated description only-${Date.now()}`;

      const createData = await seedProgramWithTrackingAndCaptureCreateData(
        page,
        programsPage,
        programName,
        originalDescription,
        trackProgram,
      );
      const createSnapshot = preservedFieldsFromCreate(createData);

      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);

      const patchPromise = page.waitForResponse((resp) =>
        isProgramPatch(resp.url(), resp.request().method()),
      );
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;
      expect(patchResponse.ok()).toBe(true);
      const patchBody = (await patchResponse.json()) as { data?: ProgramApiRecord };
      expect(patchBody.data).toBeDefined();
      expectPatchPreservesCreateFields(patchBody.data!, createSnapshot);
      expect(patchBody.data!.description).toBe(updatedDescription);

      await expectEditProgramModalClosed(programsPage);

      await programsPage.reload();
      await expectProgramsPageReady(programsPage);
      await programsPage.openEditProgram(programName);
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await expect(programsPage.editProgramModal.descriptionField).toHaveValue(updatedDescription);
    });

    test('TC-004 — Cancel discards edits', { tag: '@sanity' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;
      const unsavedName = `Should Not Persist-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(unsavedName);

      const patchRequests: Request[] = [];
      const onRequest = (request: Request) => {
        if (isProgramPatch(request.url(), request.method())) {
          patchRequests.push(request);
        }
      };
      page.on('request', onRequest);
      await programsPage.editProgramModal.clickCancel();
      page.off('request', onRequest);

      await expect(programsPage.editProgramModal.heading).toBeHidden();
      expect(patchRequests).toHaveLength(0);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programRowByName(unsavedName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test('TC-005 — Empty program name cannot be saved', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName('');

      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    });

    test('TC-006 — Whitespace-only program name cannot be saved', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName('   ');

      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    });

    test('TC-007 — Save returns 503 and the edit form stays open', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const editedName = `Web Development 2026 X503-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(editedName);

      await mockProgramPatchStatus(page, 503);

      const patchPromise = page.waitForResponse((resp) =>
        isProgramPatch(resp.url(), resp.request().method()),
      );
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;
      expect(patchResponse.status()).toBe(503);

      await expectFailedSaveKeepsEditProgramFormOpen(programsPage, editedName, programName);
    });

    const patchErrorStatuses = [
      { tc: 'TC-008', status: 401 },
      { tc: 'TC-009', status: 403 },
      { tc: 'TC-010', status: 404 },
      { tc: 'TC-011', status: 501 },
      { tc: 'TC-012', status: 502 },
      { tc: 'TC-013', status: 300 },
    ] as const;

    for (const { tc, status } of patchErrorStatuses) {
      test(`${tc} — Save returns ${status} and the edit form stays open`, { tag: '@regression' }, async ({
        page,
        trackProgram,
      }) => {
        const programsPage = new ProgramsPage(page);
        const programName = `Web Development 2026-${Date.now()}`;
        const editedName = `Web Development 2026 X${status}-${Date.now()}`;

        await seedProgramWithTracking(
          page,
          programsPage,
          programName,
          `Full-stack web development program-${Date.now()}`,
          trackProgram,
        );
        await programsPage.openEditProgram(programName);
        await programsPage.editProgramModal.fillProgramName(editedName);

        await mockProgramPatchStatus(page, status);

        const patchPromise = page.waitForResponse((resp) =>
          isProgramPatch(resp.url(), resp.request().method()),
        );
        await programsPage.editProgramModal.clickSave();
        const patchResponse = await patchPromise;
        expect(patchResponse.status()).toBe(status);

        await expectFailedSaveKeepsEditProgramFormOpen(programsPage, editedName, programName);
      });
    }
  });

  test.describe('Edge cases', () => {
    test('TC-014 — Empty program list shows no rows to edit', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('TC-015 — Malformed program list body renders nothing to edit', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);

      const listPromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/programs') &&
          resp.request().method() === 'GET' &&
          resp.status() === 200,
      );
      await programsPage.goto();
      await listPromise;

      await expect(programsPage.heading).toBeHidden();
      await expect(programsPage.allEditButtons()).toHaveCount(0);
      await expect(programsPage.userVisibleErrorFeedback()).toBeHidden();
    });

    test('TC-016 — Special characters in edited name and description are preserved', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Informatique & IA — Cohorte #1 (2026)-${Date.now()}`;
      const updatedDescription = `Programme "bilingue" <FR/EN> 🎓-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
      await expect(
        programsPage.descriptionInProgramRow(updatedName, updatedDescription),
      ).toBeVisible();
    });

    test('TC-017 — Clearing the description saves an empty description', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const originalDescription = `Full-stack web development program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        originalDescription,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillDescription('');

      const patchPromise = page.waitForResponse(
        (resp) => isProgramPatch(resp.url(), resp.request().method()) && resp.ok(),
      );
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;
      const patchBody = (await patchResponse.json()) as { data?: { description?: string | null } };
      const savedDescription = patchBody.data?.description;
      expect(savedDescription === '' || savedDescription === null).toBe(true);

      await expectEditProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Accessibility', () => {
    test('TC-018 — axe scan of open Edit Program dialog (wcag2a, wcag2aa)', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      test.fail(
        true,
        'Edit Program dialog close (X) button has no accessible name (DS-246)',
      );

      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await expect(programsPage.editProgramModal.heading).toBeVisible();

      const includeSelector = await programsPage.editProgramModal.axeIncludeSelector();
      const results = await new AxeBuilder({ page })
        .include(includeSelector)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      await expect(results.violations).toEqual([]);
    });
  });
});
