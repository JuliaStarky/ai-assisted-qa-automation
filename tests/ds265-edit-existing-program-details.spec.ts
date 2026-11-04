import { test, expect } from '../fixtures/cleanup.fixture';
import type { TrackProgram } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectEditProgramModalClosed,
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramPatchBadGateway,
  mockProgramPatchForbidden,
  mockProgramPatchMultipleChoices,
  mockProgramPatchNotFound,
  mockProgramPatchNotImplemented,
  mockProgramPatchServiceUnavailable,
  mockProgramPatchUnauthorized,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

async function expectProgramsHeadingVisible(programsPage: ProgramsPage) {
  await expect(programsPage.heading).toBeVisible();
}

async function expectEmptyOrWhitespaceNameNotSaved(
  programsPage: ProgramsPage,
  programName: string,
) {
  const { saveButton } = programsPage.editProgramModal;
  if (await saveButton.isDisabled()) {
    await expect(saveButton).toBeDisabled();
  } else {
    await programsPage.editProgramModal.clickSave();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    return;
  }
  await programsPage.editProgramModal.clickCancel();
  await expect(programsPage.programRowByName(programName)).toHaveCount(1);
}

async function expectDuplicateRenameDidNotReplaceOtherProgram(
  programsPage: ProgramsPage,
  webDevName: string,
  dataScienceName: string,
) {
  await expect(programsPage.programRowByName(webDevName)).toHaveCount(1);
  await expect(programsPage.programRowByName(dataScienceName)).toHaveCount(1);

  const editDialogOpen = await programsPage.editProgramModal.heading.isVisible();
  if (editDialogOpen) {
    await expect(programsPage.editProgramModal.dialog).toBeVisible();
  }
}

async function seedAndOpenEdit(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
  description: string,
  trackProgram: TrackProgram,
) {
  await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
  await programsPage.openEditProgram(programName);
}

test.describe('DS-265 Edit existing program details', () => {
  test.describe('Happy paths', () => {
    test('Open program for editing', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.openEditProgram(programName);

      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await expect(programsPage.editProgramModal.descriptionField).toHaveValue(description);
    });

    test('Successfully edit a program name', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await seedAndOpenEdit(page, programsPage, programName, description, trackProgram);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Edit preserves unchanged fields', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;
      const updatedDescription = `Updated full-stack web development program-${Date.now()}`;

      await seedAndOpenEdit(page, programsPage, programName, description, trackProgram);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(
        programsPage.descriptionInProgramRow(programName, updatedDescription),
      ).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('Cancel edit does not change the program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;
      const unsavedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedAndOpenEdit(page, programsPage, programName, description, trackProgram);
      await programsPage.editProgramModal.fillProgramName(unsavedName);
      await programsPage.editProgramModal.clickCancel();

      await expect(programsPage.editProgramModal.heading).toBeHidden();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('Empty program name cannot be saved', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName('');

      await expectEmptyOrWhitespaceNameNotSaved(programsPage, programName);
    });

    test('Whitespace-only program name cannot be saved', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName('   ');

      await expectEmptyOrWhitespaceNameNotSaved(programsPage, programName);
    });

    test('Saving a duplicate name does not replace the other program', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const webDevName = `Web Development 2026-${Date.now()}`;
      const dataScienceName = `Data Science Fundamentals-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        webDevName,
        `Web dev description-${Date.now()}`,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        dataScienceName,
        `Data science description-${Date.now()}`,
        trackProgram,
      );

      await programsPage.openEditProgram(dataScienceName);
      await programsPage.editProgramModal.fillProgramName(webDevName);
      await programsPage.editProgramModal.clickSave();

      await expectDuplicateRenameDidNotReplaceOtherProgram(
        programsPage,
        webDevName,
        dataScienceName,
      );
    });
  });

  test.describe('Edge cases', () => {
    test('Edit name to a value with special characters', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Informatique & IA - Niveau 2-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
    });

    test('Description-only edit keeps the name exactly', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
      const originalDescription = `Original description-${Date.now()}`;
      const updatedDescription = `Updated description-${Date.now()}`;

      await seedAndOpenEdit(page, programsPage, programName, originalDescription, trackProgram);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(
        programsPage.descriptionInProgramRow(programName, updatedDescription),
      ).toBeVisible();
    });

    test('Double-click Save applies the rename once', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.doubleClickSave();
      await expectEditProgramModalClosed(programsPage);

      await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });
  });

  test.describe('API outcomes', () => {
    test('Save returns HTTP 503', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await seedAndOpenEdit(page, programsPage, programName, description, trackProgram);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchServiceUnavailable(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list returns HTTP 200 with an empty list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expectProgramsHeadingVisible(programsPage);
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('Program list returns HTTP 200 with a malformed body', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.programListRows()).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 401', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchUnauthorized(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 403', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchForbidden(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 404', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchNotFound(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 501', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchNotImplemented(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 502', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchBadGateway(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });

    test('Program list or save returns HTTP 300', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Seed description-${Date.now()}`,
        trackProgram,
      );
      await programsPage.openEditProgram(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await mockProgramPatchMultipleChoices(page);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectProgramsHeadingVisible(programsPage);
    });
  });
});
