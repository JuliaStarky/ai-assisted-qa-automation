import { test, expect } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  expectEditProgramModalClosed,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  mockProgramPatchUnauthorized,
  seedProgram,
} from './support/programs-flow.helpers';

test.describe('Positive flows', () => {
  test('TC-001 — Edit form shows current program data', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Full-stack web development program-${Date.now()}`;

    await seedProgram(page, programsPage, programName, description);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await programsPage.openEditProgram(programName);

    await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programsPage.editProgramModal.descriptionField).toHaveValue(description);
    await expect(programsPage.editProgramModal.defaultSessionHours).toHaveValue('4');
    await expect(programsPage.editProgramModal.defaultExamHours).toHaveValue('3');
  });

  test('TC-002 — Updated program name appears in list after save', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Original description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(updatedName);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-003 — Unchanged fields stay the same when only description is edited', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Data Science Fundamentals-${Date.now()}`;
    const originalDescription = `Introductory data science track-${Date.now()}`;
    const updatedDescription = `Updated curriculum for 2026 cohort-${Date.now()}`;

    await seedProgram(page, programsPage, programName, originalDescription);
    await programsPage.openEditProgram(programName);
    const totalHours = await programsPage.editProgramModal.totalProgramHours.inputValue();
    const sessionHours = await programsPage.editProgramModal.defaultSessionHours.inputValue();
    const examHours = await programsPage.editProgramModal.defaultExamHours.inputValue();
    const targetAudience = await programsPage.editProgramModal.targetAudience.inputValue();
    const focusAreas = await programsPage.editProgramModal.focusAreas.inputValue();

    await programsPage.editProgramModal.fillDescription(updatedDescription);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, updatedDescription)).toBeVisible();
    await expect(programsPage.descriptionInProgramRow(programName, originalDescription)).toHaveCount(0);

    await programsPage.openEditProgram(programName);
    await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programsPage.editProgramModal.totalProgramHours).toHaveValue(totalHours);
    await expect(programsPage.editProgramModal.defaultSessionHours).toHaveValue(sessionHours);
    await expect(programsPage.editProgramModal.defaultExamHours).toHaveValue(examHours);
    await expect(programsPage.editProgramModal.targetAudience).toHaveValue(targetAudience);
    await expect(programsPage.editProgramModal.focusAreas).toHaveValue(focusAreas);
  });

  test('TC-004 — Edit both name and description in one save', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Mobile Development 2026-${Date.now()}`;
    const updatedName = `Mobile Development 2026 - Advanced-${Date.now()}`;
    const updatedDescription = `iOS and Android track with capstone project-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Original mobile track-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(updatedName);
    await programsPage.editProgramModal.fillDescription(updatedDescription);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
    await programsPage.openEditProgram(updatedName);
    await expect(programsPage.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  test('TC-005 — Dismiss edit form without saving changes', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Original description-${Date.now()}`;

    await seedProgram(page, programsPage, programName, description);
    await programsPage.openEditProgram(programName);
    const unsavedName = 'Should Not Persist';
    await programsPage.editProgramModal.fillProgramName(unsavedName);
    await programsPage.editProgramModal.clickCancel();

    await expect(programsPage.editProgramModal.heading).toBeHidden();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    await expect(programsPage.programRowByName(unsavedName)).toHaveCount(0);
  });

  test('TC-018 — Edit modal exposes extended program fields', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Extended Fields Probe-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Description-${Date.now()}`);
    await programsPage.openEditProgram(programName);

    await expect(programsPage.editProgramModal.programNameField).toBeVisible();
    await expect(programsPage.editProgramModal.descriptionField).toBeVisible();
    await expect(programsPage.editProgramModal.totalProgramHours).toBeVisible();
    await expect(programsPage.editProgramModal.defaultSessionHours).toBeVisible();
    await expect(programsPage.editProgramModal.defaultExamHours).toBeVisible();
    await expect(programsPage.editProgramModal.targetAudience).toBeVisible();
    await expect(programsPage.editProgramModal.focusAreas).toBeVisible();
    await expect(programsPage.editProgramModal.showAiGenerationConfigButton).toBeVisible();
    await expect(programsPage.editProgramModal.cancelButton).toBeVisible();
    await expect(programsPage.editProgramModal.saveButton).toBeVisible();
  });
});

test.describe('Negative flows', () => {
  test('TC-006 — Empty name cannot be saved', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Bootcamp description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName('');

    await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    await programsPage.editProgramModal.clickCancel();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-007 — Whitespace-only name is rejected on save', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Bootcamp description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName('   ');

    await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
    await programsPage.editProgramModal.clickCancel();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-008 — Non-admin cannot edit program details', async () => {
    test.skip(true, 'Requires a non-admin test account (not available in this environment)');
  });

  test('TC-009 — Renaming to an existing program name is allowed', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const existingName = `Web Development 2026-${Date.now()}`;
    const renameTarget = `Data Science Fundamentals-${Date.now()}`;

    await seedProgram(page, programsPage, existingName, `Existing A-${Date.now()}`);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
    await programsPage.createProgram(renameTarget, `Existing B-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    await programsPage.openEditProgram(renameTarget);
    await programsPage.editProgramModal.fillProgramName(existingName);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(existingName)).toHaveCount(2);
  });

  test('TC-010 — Save fails when session expired', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Session Edit Program-${Date.now()}`;
    const originalDescription = `Before session expiry-${Date.now()}`;
    const newDescription = `Session expiry test-${Date.now()}`;

    await seedProgram(page, programsPage, programName, originalDescription);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillDescription(newDescription);

    await mockProgramPatchUnauthorized(page);

    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.descriptionInProgramRow(programName, newDescription)).toHaveCount(0);
    await expect(programsPage.descriptionInProgramRow(programName, originalDescription)).toBeVisible();
    await expect(programsPage.editSessionExpiredFeedback()).toBeVisible();
  });

  test('TC-011 — Save with no changes does not corrupt data', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Unchanged description-${Date.now()}`;

    await seedProgram(page, programsPage, programName, description);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
  });
});

test.describe('Edge cases', () => {
  test('TC-012 — Name at maximum allowed length after edit', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Max Length Seed-${Date.now()}`;
    const suffix = String(Date.now());
    const maxName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
    expect(maxName).toHaveLength(255);

    await seedProgram(page, programsPage, programName, `Seed description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(maxName);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(maxName)).toHaveCount(1);
  });

  test('TC-013 — Name at 256 characters is accepted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Original Name-${Date.now()}`;
    const suffix = String(Date.now());
    const overMaxName = `${'B'.repeat(256 - suffix.length)}${suffix}`;
    expect(overMaxName).toHaveLength(256);

    await seedProgram(page, programsPage, programName, `Seed description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(overMaxName);
    await expect(programsPage.editProgramModal.saveButton).toBeEnabled();
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(overMaxName)).toHaveCount(1);
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-014 — Special characters in edited name and description', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `QA Program Pilot-${Date.now()}`;
    const updatedName = `QA & Testing — Cohort #1 (2026)-${Date.now()}`;
    const updatedDescription = `Notes: "updated", <review>, émojis 🎓-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Pilot description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(updatedName);
    await programsPage.editProgramModal.fillDescription(updatedDescription);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(updatedName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(updatedName, updatedDescription)).toBeVisible();

    await programsPage.openEditProgram(updatedName);
    await expect(programsPage.editProgramModal.programNameField).toHaveValue(updatedName);
    await expect(programsPage.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  test('TC-015 — Leading and trailing spaces in name are preserved', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cloud Engineering 2026-${Date.now()}`;
    const paddedName = `  Cloud Engineering 2026 - Revised-${Date.now()}  `;

    await seedProgram(page, programsPage, programName, `Cloud track-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillProgramName(paddedName);
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(paddedName)).toHaveCount(1);
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-016 — Double-click Save does not create duplicate programs', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const newDescription = `Double save test-${Date.now()}`;

    await seedProgram(page, programsPage, programName, `Original description-${Date.now()}`);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillDescription(newDescription);
    await programsPage.editProgramModal.doubleClickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, newDescription)).toBeVisible();
  });

  test('TC-017 — Empty description after edit is saved', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Description Clear Test-${Date.now()}`;
    const originalDescription = `Non-empty description-${Date.now()}`;

    await seedProgram(page, programsPage, programName, originalDescription);
    await programsPage.openEditProgram(programName);
    await programsPage.editProgramModal.fillDescription('');

    await expect(programsPage.editProgramModal.saveButton).toBeEnabled();
    await programsPage.editProgramModal.clickSave();
    await expectEditProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, originalDescription)).toHaveCount(0);

    await programsPage.openEditProgram(programName);
    await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programsPage.editProgramModal.descriptionField).toHaveValue('');
  });
});
