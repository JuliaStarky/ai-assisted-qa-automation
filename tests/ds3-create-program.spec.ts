import { test, expect } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  expectNewProgramModalClosed,
  expectProgramsPageReady,
} from './support/programs-flow.helpers';

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
  });

  test('TC-001 — Valid program name with special characters is accepted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
    const description = `Programme bilingue sciences et IA-${Date.now()}`;

    await programsPage.createProgram(programName, description);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-002 — Standard alphanumeric program name is accepted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cloud Engineering 2026-${Date.now()}`;

    await programsPage.createProgram(programName, `AWS and Azure fundamentals-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-003 — Trimmed name with leading and trailing spaces saves as normalized name', async ({
    page,
  }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Mobile Development 2026-${Date.now()}`;
    const paddedName = `  ${programName}  `;

    await programsPage.createProgram(paddedName, `Mobile track-${Date.now()}`);
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

  test('TC-004 — Whitespace-only program name is not submitted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName('   ');
    await programsPage.newProgramModal.fillDescription(`Description-${Date.now()}`);

    await expect(programsPage.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-005 — Empty program name is not submitted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillDescription(`Description only-${Date.now()}`);

    await expect(programsPage.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-006 — Duplicate program name shows error and does not create second program', async ({
    page,
  }) => {
    test.fail(true, 'Didaxis allows duplicate program names on create (DS-3 AC gap)');

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    await programsPage.createProgram(programName, `First description-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    const { submitted } = await programsPage.attemptCreateProgram(
      programName,
      `Second program attempt-${Date.now()}`,
    );
    expect(submitted).toBeTruthy();

    await expect(programsPage.duplicateNameError).toBeVisible();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.newProgramModal.heading).toBeVisible();
  });

  test('TC-007 — Duplicate check applies after trim (whitespace-padded duplicate)', async ({
    page,
  }) => {
    test.fail(true, 'Didaxis allows duplicate names; no trim-aware duplicate check (DS-3 AC gap)');

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    await programsPage.createProgram(programName, `Original-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    await programsPage.attemptCreateProgram(`  ${programName}  `, `Padded duplicate-${Date.now()}`);

    await expect(programsPage.duplicateNameError).toBeVisible();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-008 — Invalid name must not partially persist on failed create', async ({ page }) => {
    test.fail(true, 'Duplicate create succeeds today; list count increases (DS-3 AC gap)');

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    await programsPage.createProgram(programName, `Stable row-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    const countBefore = await programsPage.programRowByName(programName).count();

    await programsPage.attemptCreateProgram(programName, `Failed duplicate-${Date.now()}`);
    await page.reload();
    await expect(programsPage.heading).toBeVisible();

    await expect(programsPage.programRowByName(programName)).toHaveCount(countBefore);
  });

  test('TC-009 — Rename to existing name is rejected on edit', async ({ page }) => {
    test.fail(true, 'Didaxis allows rename to an existing program name (DS-3 implied edit rule)');

    const programsPage = new ProgramsPage(page);
    const existingName = `Web Development 2026-${Date.now()}`;
    const editTarget = `Data Science Fundamentals-${Date.now()}`;

    await programsPage.createProgram(existingName, `Existing-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await programsPage.createProgram(editTarget, `Other program-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    await programsPage.openEditProgram(editTarget);
    await programsPage.editProgramModal.fillProgramName(existingName);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.duplicateNameError).toBeVisible();
    await expect(programsPage.programRowByName(editTarget)).toHaveCount(1);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
  });

  test('TC-010 — Program name at maximum allowed length is accepted', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const suffix = String(Date.now());
    const programName = `${'N'.repeat(255 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(255);

    await programsPage.createProgram(programName, `Max length description-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-011 — Program name over maximum length is rejected', async ({ page }) => {
    test.fail(true, 'Didaxis accepts 256-character program names (DS-3 ambiguity #6)');

    const programsPage = new ProgramsPage(page);
    const suffix = String(Date.now());
    const programName = `${'N'.repeat(256 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(256);

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Over max-${Date.now()}`);

    await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-012 — Unicode and accented characters in program name', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Programme été — München 2026-${Date.now()}`;

    await programsPage.createProgram(programName, `Unicode description-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-013 — Emoji in program name (policy-dependent)', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `STEM Track 🎓 2026-${Date.now()}`;

    await programsPage.createProgram(programName, `Emoji policy check-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-014 — Duplicate name case sensitivity', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const lowerCaseName = programName.toLowerCase();

    await programsPage.createProgram(programName, `Mixed case seed-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await programsPage.createProgram(lowerCaseName, `Lower case variant-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.programRowByName(lowerCaseName)).toHaveCount(1);
  });

  test('TC-015 — HTML or script-like strings are handled safely', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Test <b>Name</b>-${Date.now()}`;
    let dialogShown = false;
    page.on('dialog', () => {
      dialogShown = true;
    });

    await programsPage.createProgram(programName, `Safe display check-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);

    expect(dialogShown).toBe(false);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.programNameInRow(programName)).toBeVisible();
  });

  test('TC-016 — Tabs and newline characters in program name', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `QA\tProgram-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Tab name check-${Date.now()}`);

    const disabled = await programsPage.newProgramModal.createButton.isDisabled();
    if (!disabled) {
      await programsPage.newProgramModal.clickCreate();
      await page.waitForTimeout(2_000);
    }

    const normalizedVisible =
      (await programsPage.programRowByName(programName).count()) > 0 ||
      (await programsPage.programRowByName(programName.replace('\t', ' ')).count()) > 0;

    expect(
      disabled ||
        normalizedVisible ||
        (await programsPage.newProgramModal.heading.isVisible()),
    ).toBeTruthy();
  });

  test('TC-017 — Same name allowed after original program deleted (if delete exists)', async ({
    page,
  }) => {
    test.skip(true, 'Delete confirmation flow is not reliably exposed for automation in test env');

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    await programsPage.createProgram(programName, `To delete-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await programsPage.deleteButton(programName).click();
    await programsPage.createProgram(programName, `Reused after delete-${Date.now()}`);
    await expectNewProgramModalClosed(programsPage);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });
});
