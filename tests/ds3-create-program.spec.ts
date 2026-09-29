import { test, expect, type Page } from '@playwright/test';

const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const loginUrl = `${baseUrl}/login`;
const programsUrl = `${baseUrl}/programs`;

const duplicateErrorPattern = /duplicate|already exists|unique|name already/i;

function adminCredentials(): { email: string; password: string } {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  if (!email || !password) {
    throw new Error('Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');
  }
  return { email, password };
}

async function loginAsAdmin(page: Page) {
  const { email, password } = adminCredentials();
  await page.goto(loginUrl);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

async function goToPrograms(page: Page) {
  await page.goto(programsUrl);
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
}

/** Mantine create panel — scope labels to this section (list rows also mention "Description"). */
function newProgramModal(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'New Program' }),
  });
}

function editProgramModal(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Edit Program' }),
  });
}

async function openNewProgramModal(page: Page) {
  await page.getByRole('button', { name: '+ New Program' }).click();
  const modal = newProgramModal(page);
  await expect(modal.getByRole('heading', { name: 'New Program' })).toBeVisible();
  await expect(modal.getByLabel('Program Name')).toBeVisible();
  await expect(modal.getByLabel('Description')).toBeVisible();
  return modal;
}

function programRowByName(page: Page, name: string) {
  return page.locator('tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function createProgram(page: Page, name: string, description: string) {
  const modal = await openNewProgramModal(page);
  await modal.getByLabel('Program Name').fill(name);
  await modal.getByLabel('Description').fill(description);
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

async function attemptCreateProgram(page: Page, name: string, description: string) {
  const modal = await openNewProgramModal(page);
  await modal.getByLabel('Program Name').fill(name);
  await modal.getByLabel('Description').fill(description);
  const createButton = modal.getByRole('button', { name: 'Create' });
  if (await createButton.isDisabled()) {
    return { modal, submitted: false as const };
  }
  await createButton.click();
  await page.waitForTimeout(2_000);
  return { modal, submitted: true as const };
}

async function openEditForProgram(page: Page, programName: string) {
  const row = programRowByName(page, programName);
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: `Edit ${programName}` }).click();
  const modal = editProgramModal(page);
  await expect(modal.getByLabel('Program Name')).toBeVisible();
  return modal;
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-001 — Valid program name with special characters is accepted', async ({ page }) => {
    const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
    const description = `Programme bilingue sciences et IA-${Date.now()}`;

    await createProgram(page, programName, description);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-002 — Standard alphanumeric program name is accepted', async ({ page }) => {
    const programName = `Cloud Engineering 2026-${Date.now()}`;

    await createProgram(page, programName, `AWS and Azure fundamentals-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-003 — Trimmed name with leading and trailing spaces saves as normalized name', async ({
    page,
  }) => {
    const programName = `Mobile Development 2026-${Date.now()}`;
    const paddedName = `  ${programName}  `;

    await createProgram(page, paddedName, `Mobile track-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-004 — Whitespace-only program name is not submitted', async ({ page }) => {
    const modal = await openNewProgramModal(page);
    await modal.getByLabel('Program Name').fill('   ');
    await modal.getByLabel('Description').fill(`Description-${Date.now()}`);

    await expect(modal.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-005 — Empty program name is not submitted', async ({ page }) => {
    const modal = await openNewProgramModal(page);
    await modal.getByLabel('Description').fill(`Description only-${Date.now()}`);

    await expect(modal.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-006 — Duplicate program name shows error and does not create second program', async ({
    page,
  }) => {
    test.fail(true, 'Didaxis allows duplicate program names on create (DS-3 AC gap)');

    const programName = `Web Development 2026-${Date.now()}`;
    await createProgram(page, programName, `First description-${Date.now()}`);

    const { modal, submitted } = await attemptCreateProgram(
      page,
      programName,
      `Second program attempt-${Date.now()}`,
    );
    expect(submitted).toBeTruthy();

    await expect(page.getByText(duplicateErrorPattern)).toBeVisible();
    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(modal).toBeVisible();
  });

  test('TC-007 — Duplicate check applies after trim (whitespace-padded duplicate)', async ({
    page,
  }) => {
    test.fail(true, 'Didaxis allows duplicate names; no trim-aware duplicate check (DS-3 AC gap)');

    const programName = `Web Development 2026-${Date.now()}`;
    await createProgram(page, programName, `Original-${Date.now()}`);

    await attemptCreateProgram(page, `  ${programName}  `, `Padded duplicate-${Date.now()}`);

    await expect(page.getByText(duplicateErrorPattern)).toBeVisible();
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-008 — Invalid name must not partially persist on failed create', async ({ page }) => {
    test.fail(true, 'Duplicate create succeeds today; list count increases (DS-3 AC gap)');

    const programName = `Web Development 2026-${Date.now()}`;
    await createProgram(page, programName, `Stable row-${Date.now()}`);
    const countBefore = await programRowByName(page, programName).count();

    await attemptCreateProgram(page, programName, `Failed duplicate-${Date.now()}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();

    await expect(programRowByName(page, programName)).toHaveCount(countBefore);
  });

  test('TC-009 — Rename to existing name is rejected on edit', async ({ page }) => {
    test.fail(true, 'Didaxis allows rename to an existing program name (DS-3 implied edit rule)');

    const existingName = `Web Development 2026-${Date.now()}`;
    const editTarget = `Data Science Fundamentals-${Date.now()}`;

    await createProgram(page, existingName, `Existing-${Date.now()}`);
    await createProgram(page, editTarget, `Other program-${Date.now()}`);

    const modal = await openEditForProgram(page, editTarget);
    await modal.getByLabel('Program Name').fill(existingName);
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(duplicateErrorPattern)).toBeVisible();
    await expect(programRowByName(page, editTarget)).toHaveCount(1);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-010 — Program name at maximum allowed length is accepted', async ({ page }) => {
    const suffix = String(Date.now());
    const programName = `${'N'.repeat(255 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(255);

    await createProgram(page, programName, `Max length description-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-011 — Program name over maximum length is rejected', async ({ page }) => {
    test.fail(true, 'Didaxis accepts 256-character program names (DS-3 ambiguity #6)');

    const suffix = String(Date.now());
    const programName = `${'N'.repeat(256 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(256);

    const modal = await openNewProgramModal(page);
    await modal.getByLabel('Program Name').fill(programName);
    await modal.getByLabel('Description').fill(`Over max-${Date.now()}`);

    await expect(modal.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-012 — Unicode and accented characters in program name', async ({ page }) => {
    const programName = `Programme été — München 2026-${Date.now()}`;

    await createProgram(page, programName, `Unicode description-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-013 — Emoji in program name (policy-dependent)', async ({ page }) => {
    const programName = `STEM Track 🎓 2026-${Date.now()}`;

    await createProgram(page, programName, `Emoji policy check-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-014 — Duplicate name case sensitivity', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const lowerCaseName = programName.toLowerCase();

    await createProgram(page, programName, `Mixed case seed-${Date.now()}`);
    await createProgram(page, lowerCaseName, `Lower case variant-${Date.now()}`);

    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, lowerCaseName)).toHaveCount(1);
  });

  test('TC-015 — HTML or script-like strings are handled safely', async ({ page }) => {
    const programName = `Test <b>Name</b>-${Date.now()}`;
    let dialogShown = false;
    page.on('dialog', () => {
      dialogShown = true;
    });

    await createProgram(page, programName, `Safe display check-${Date.now()}`);

    expect(dialogShown).toBe(false);
    const row = programRowByName(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(programName, { exact: true })).toBeVisible();
  });

  test('TC-016 — Tabs and newline characters in program name', async ({ page }) => {
    const programName = `QA\tProgram-${Date.now()}`;
    const modal = await openNewProgramModal(page);
    await modal.getByLabel('Program Name').fill(programName);
    await modal.getByLabel('Description').fill(`Tab name check-${Date.now()}`);

    const createButton = modal.getByRole('button', { name: 'Create' });
    const disabled = await createButton.isDisabled();
    if (!disabled) {
      await createButton.click();
      await page.waitForTimeout(2_000);
    }

    const normalizedVisible =
      (await programRowByName(page, programName).count()) > 0 ||
      (await programRowByName(page, programName.replace('\t', ' ')).count()) > 0;

    expect(disabled || normalizedVisible || (await modal.isVisible())).toBeTruthy();
  });

  test('TC-017 — Same name allowed after original program deleted (if delete exists)', async ({
    page,
  }) => {
    test.skip(true, 'Delete confirmation flow is not reliably exposed for automation in test env');

    const programName = `Web Development 2026-${Date.now()}`;
    await createProgram(page, programName, `To delete-${Date.now()}`);
    await programRowByName(page, programName)
      .getByRole('button', { name: `Delete ${programName}` })
      .click();
    await createProgram(page, programName, `Reused after delete-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });
});
