import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectEditProgramModalClosed,
  expectNewProgramModalClosed,
  mockEmptyProgramList,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';
import {
  expectEditFailedSilently,
  isProgramListGet,
  mockProgramPatchStatus,
  mockProgramsListGetStatus,
  mockProgramsListMalformedBody,
  navigateProgramsAndAwaitListGet,
  seedProgramAndOpenEdit,
  waitForProgramPatch,
} from './support/ds257-edit.helpers';

test.describe('DS-257 Valeria - Edit existing program details', () => {
  test.describe('Happy paths', () => {
    test('Open program for editing', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const description = `Full-stack web development program ${suffix}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.openEditProgram(programName);

      await expect(programsPage.editProgramModal.heading).toBeVisible();
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await expect(programsPage.editProgramModal.descriptionField).toHaveValue(description);
      await expect(programsPage.editProgramModal.saveButton).toBeVisible();
      await expect(programsPage.editProgramModal.cancelButton).toBeVisible();
    });

    test('Successfully edit a program name', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const updatedName = `Web Development 2026 - Updated ${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program ${suffix}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Edit preserves unchanged fields', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const originalDescription = `Full-stack web development program ${suffix}`;
      const updatedDescription = `Updated full-stack curriculum ${suffix}`;

      await seedProgramWithTracking(page, programsPage, programName, originalDescription, trackProgram);
      await programsPage.openEditProgram(programName);

      const patchPromise = waitForProgramPatch(page);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;

      expect(patchResponse.status()).toBe(200);
      const patchBody = (await patchResponse.json()) as { data?: { name?: string } };
      expect(patchBody.data?.name).toBe(programName);

      await expectEditProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(
        programsPage.descriptionInProgramRow(programName, updatedDescription),
      ).toBeVisible();

      await programsPage.openEditProgram(programName);
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await expect(programsPage.editProgramModal.descriptionField).toHaveValue(updatedDescription);
    });
  });

  test.describe('Negative', () => {
    test('Cancel discards edits', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;

      await seedProgramAndOpenEdit(
        page,
        programsPage,
        programName,
        `Full-stack web development program ${suffix}`,
        trackProgram,
      );
      const unsavedName = `Should Not Persist ${suffix}`;
      await programsPage.editProgramModal.fillProgramName(unsavedName);
      await programsPage.editProgramModal.clickCancel();

      await expectEditProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programRowByName(unsavedName)).toHaveCount(0);
    });

    test('Empty program name cannot be saved on edit', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;

      await seedProgramAndOpenEdit(
        page,
        programsPage,
        programName,
        `Full-stack web development program ${suffix}`,
        trackProgram,
      );
      await programsPage.editProgramModal.fillProgramName('');

      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    });

    test('Whitespace-only program name is not saved on edit', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;

      await seedProgramAndOpenEdit(
        page,
        programsPage,
        programName,
        `Full-stack web development program ${suffix}`,
        trackProgram,
      );
      await programsPage.editProgramModal.fillProgramName('   ');
      await programsPage.editProgramModal.tryClickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Save returns 503 and the edit is not applied', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const originalDescription = `Full-stack web development program ${suffix}`;

      await seedProgramAndOpenEdit(page, programsPage, programName, originalDescription, trackProgram);
      await programsPage.editProgramModal.fillDescription('Edit error 503');
      await mockProgramPatchStatus(page, 503);
      await programsPage.editProgramModal.clickSave();

      await expectEditFailedSilently(programsPage, programName, originalDescription);
    });

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`Save returns ${status} and the edit is not applied`, async ({ page, trackProgram }) => {
        const programsPage = new ProgramsPage(page);
        const suffix = Date.now();
        const programName = `Web Development 2026 ${suffix}`;
        const originalDescription = `Full-stack web development program ${suffix}`;

        await seedProgramAndOpenEdit(page, programsPage, programName, originalDescription, trackProgram);
        await programsPage.editProgramModal.fillDescription(`Edit error ${status}`);
        await mockProgramPatchStatus(page, status);
        await programsPage.editProgramModal.clickSave();

        await expectEditFailedSilently(programsPage, programName, originalDescription);
      });
    }

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`List returns ${status} and no program is offered for editing`, async ({ page }) => {
        const programsPage = new ProgramsPage(page);
        await mockProgramsListGetStatus(page, status);
        await navigateProgramsAndAwaitListGet(page, programsPage);

        await expect(programsPage.exactEmptyStateMessage).toBeVisible();
        await expect(programsPage.anyEditButton).toHaveCount(0);
      });
    }

    test('List returns 200 with an empty list and no program is offered for editing', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await navigateProgramsAndAwaitListGet(page, programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.anyEditButton).toHaveCount(0);
    });

    test('List returns 200 with a malformed body and the page stays usable', async ({ page }) => {
      test.fail(true, 'Mocked GET list 200 not-json blanks the main area after response (DS-114)');

      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedBody(page);
      const listResponsePromise = page.waitForResponse((response) =>
        isProgramListGet(response.url(), response.request().method()),
      );
      await programsPage.goto();
      await listResponsePromise;

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('Renaming to an existing program name is rejected', async ({ page, trackProgram }) => {
      test.fail(true, 'Didaxis accepts duplicate program names on edit (DS-3)');

      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const existingName = `Web Development 2026 ${suffix}`;
      const otherName = `Data Science Fundamentals ${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        existingName,
        `Program A ${suffix}`,
        trackProgram,
      );
      await programsPage.goto();
      await createProgramWithTracking(
        page,
        programsPage,
        otherName,
        `Program B ${suffix}`,
        trackProgram,
      );
      await expectNewProgramModalClosed(programsPage);

      await programsPage.openEditProgram(otherName);
      await programsPage.editProgramModal.fillProgramName(existingName);

      const patchPromise = waitForProgramPatch(page);
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;

      expect(patchResponse.ok()).toBe(false);
      await expect(programsPage.programRowByName(existingName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('Special characters in the edited name are saved unchanged', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const updatedName = `Informatique & IA - Niveau 2 ${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Full-stack web development program ${suffix}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);

      const patchPromise = waitForProgramPatch(page);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();
      const patchResponse = await patchPromise;

      expect(patchResponse.ok()).toBe(true);
      const patchBody = (await patchResponse.json()) as { data?: { name?: string } };
      expect(patchBody.data?.name).toBe(updatedName);

      await expectEditProgramModalClosed(programsPage);
      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
    });

    test('Clearing the description saves an empty description', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const originalDescription = `Full-stack web development program ${suffix}`;

      await seedProgramAndOpenEdit(page, programsPage, programName, originalDescription, trackProgram);
      await programsPage.editProgramModal.fillDescription('');
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(
        programsPage.descriptionInProgramRow(programName, originalDescription),
      ).toHaveCount(0);
    });

    test('Save with no changes keeps program data intact', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Web Development 2026 ${suffix}`;
      const description = `Full-stack web development program ${suffix}`;

      await seedProgramAndOpenEdit(page, programsPage, programName, description, trackProgram);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });
  });
});
