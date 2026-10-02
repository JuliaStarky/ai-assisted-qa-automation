import { test, expect, type Locator, type Page } from '@playwright/test';

const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const loginUrl = `${baseUrl}/login`;
const programsUrl = `${baseUrl}/programs`;

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

/** Mantine panel — scope by heading instead of page-wide labels. */
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

function programNameField(modal: Locator) {
  return modal.getByRole('textbox', { name: 'Program Name' });
}

function descriptionField(modal: Locator) {
  return modal.getByRole('textbox', { name: 'Description' });
}

function programRowByName(page: Page, name: string) {
  return page.locator('tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function createProgram(page: Page, name: string, description: string) {
  await page.getByRole('button', { name: '+ New Program' }).click();
  const modal = newProgramModal(page);
  await programNameField(modal).fill(name);
  await descriptionField(modal).fill(description);
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

async function seedProgram(page: Page, name: string, description: string) {
  await goToPrograms(page);
  await createProgram(page, name, description);
  await expect(programRowByName(page, name)).toHaveCount(1);
}

async function openEditForProgram(page: Page, programName: string) {
  const row = programRowByName(page, programName);
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: `Edit ${programName}` }).click();
  const modal = editProgramModal(page);
  await expect(modal.getByRole('heading', { name: 'Edit Program' })).toBeVisible();
  await expect(programNameField(modal)).toBeVisible();
  await expect(descriptionField(modal)).toBeVisible();
  return modal;
}

async function saveEdit(modal: Locator) {
  await modal.getByRole('button', { name: 'Save' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-001 — Edit form shows current program data', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Full-stack web development program-${Date.now()}`;

    await seedProgram(page, programName, description);
    const modal = await openEditForProgram(page, programName);

    await expect(programNameField(modal)).toHaveValue(programName);
    await expect(descriptionField(modal)).toHaveValue(description);
    await expect(modal.getByLabel('Default Session Hours')).toHaveValue('4');
    await expect(modal.getByLabel('Default Exam Hours')).toHaveValue('3');
  });

  test('TC-002 — Updated program name appears in list after save', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const updatedName = `Web Development 2026 - Updated-${Date.now()}`;

    await seedProgram(page, programName, `Original description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(updatedName);
    await saveEdit(modal);

    await expect(programRowByName(page, updatedName)).toHaveCount(1);
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-003 — Unchanged fields stay the same when only description is edited', async ({ page }) => {
    const programName = `Data Science Fundamentals-${Date.now()}`;
    const originalDescription = `Introductory data science track-${Date.now()}`;
    const updatedDescription = `Updated curriculum for 2026 cohort-${Date.now()}`;

    await seedProgram(page, programName, originalDescription);
    const modal = await openEditForProgram(page, programName);
    const totalHours = await modal.getByLabel('Total Program Hours').inputValue();
    const sessionHours = await modal.getByLabel('Default Session Hours').inputValue();
    const examHours = await modal.getByLabel('Default Exam Hours').inputValue();
    const targetAudience = await modal.getByLabel('Target Audience').inputValue();
    const focusAreas = await modal.getByLabel('Focus Areas').inputValue();

    await descriptionField(modal).fill(updatedDescription);
    await saveEdit(modal);

    const row = programRowByName(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(updatedDescription)).toBeVisible();
    await expect(row.getByText(originalDescription)).toHaveCount(0);

    const reopen = await openEditForProgram(page, programName);
    await expect(programNameField(reopen)).toHaveValue(programName);
    await expect(reopen.getByLabel('Total Program Hours')).toHaveValue(totalHours);
    await expect(reopen.getByLabel('Default Session Hours')).toHaveValue(sessionHours);
    await expect(reopen.getByLabel('Default Exam Hours')).toHaveValue(examHours);
    await expect(reopen.getByLabel('Target Audience')).toHaveValue(targetAudience);
    await expect(reopen.getByLabel('Focus Areas')).toHaveValue(focusAreas);
  });

  test('TC-004 — Edit both name and description in one save', async ({ page }) => {
    const programName = `Mobile Development 2026-${Date.now()}`;
    const updatedName = `Mobile Development 2026 - Advanced-${Date.now()}`;
    const updatedDescription = `iOS and Android track with capstone project-${Date.now()}`;

    await seedProgram(page, programName, `Original mobile track-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(updatedName);
    await descriptionField(modal).fill(updatedDescription);
    await saveEdit(modal);

    await expect(programRowByName(page, updatedName)).toHaveCount(1);
    const reopen = await openEditForProgram(page, updatedName);
    await expect(descriptionField(reopen)).toHaveValue(updatedDescription);
  });

  test('TC-005 — Dismiss edit form without saving changes', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Original description-${Date.now()}`;

    await seedProgram(page, programName, description);
    const modal = await openEditForProgram(page, programName);
    const unsavedName = 'Should Not Persist';
    await programNameField(modal).fill(unsavedName);
    await modal.getByRole('button', { name: 'Cancel' }).click();

    await expect(modal).toBeHidden();
    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, programName).getByText(description)).toBeVisible();
    await expect(programRowByName(page, unsavedName)).toHaveCount(0);
  });

  test('TC-018 — Edit modal exposes extended program fields', async ({ page }) => {
    const programName = `Extended Fields Probe-${Date.now()}`;
    await seedProgram(page, programName, `Description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);

    await expect(programNameField(modal)).toBeVisible();
    await expect(descriptionField(modal)).toBeVisible();
    await expect(modal.getByLabel('Total Program Hours')).toBeVisible();
    await expect(modal.getByLabel('Default Session Hours')).toBeVisible();
    await expect(modal.getByLabel('Default Exam Hours')).toBeVisible();
    await expect(modal.getByLabel('Target Audience')).toBeVisible();
    await expect(modal.getByLabel('Focus Areas')).toBeVisible();
    await expect(modal.getByRole('button', { name: '▸ Show AI Generation Config' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-006 — Empty name cannot be saved', async ({ page }) => {
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await seedProgram(page, programName, `Bootcamp description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill('');

    await expect(modal.getByRole('button', { name: 'Save' })).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-007 — Whitespace-only name is rejected on save', async ({ page }) => {
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await seedProgram(page, programName, `Bootcamp description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill('   ');

    await expect(modal.getByRole('button', { name: 'Save' })).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-008 — Non-admin cannot edit program details', async ({ page }) => {
    test.skip(
      !process.env.DIDAXIS_NON_ADMIN_EMAIL || !process.env.DIDAXIS_NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD to run this case',
    );

    const programName = `Web Development 2026-${Date.now()}`;
    await seedProgram(page, programName, `Shared program-${Date.now()}`);

    const { email, password } = {
      email: process.env.DIDAXIS_NON_ADMIN_EMAIL!,
      password: process.env.DIDAXIS_NON_ADMIN_PASSWORD!,
    };

    await page.goto(loginUrl);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });

    await goToPrograms(page);
    const row = programRowByName(page, programName);
    await expect(row.getByRole('button', { name: `Edit ${programName}` })).toHaveCount(0);
  });

  test('TC-009 — Renaming to an existing program name is allowed', async ({ page }) => {
    const existingName = `Web Development 2026-${Date.now()}`;
    const renameTarget = `Data Science Fundamentals-${Date.now()}`;

    await seedProgram(page, existingName, `Existing A-${Date.now()}`);
    await goToPrograms(page);
    await createProgram(page, renameTarget, `Existing B-${Date.now()}`);

    const modal = await openEditForProgram(page, renameTarget);
    await programNameField(modal).fill(existingName);
    await saveEdit(modal);

    await expect(programRowByName(page, existingName)).toHaveCount(2);
  });

  test('TC-010 — Save fails when session expired', async ({ page }) => {
    const programName = `Session Edit Program-${Date.now()}`;
    const originalDescription = `Before session expiry-${Date.now()}`;
    const newDescription = `Session expiry test-${Date.now()}`;

    await seedProgram(page, programName, originalDescription);
    const modal = await openEditForProgram(page, programName);
    await descriptionField(modal).fill(newDescription);

    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
        return;
      }
      await route.continue();
    });

    await modal.getByRole('button', { name: 'Save' }).click();

    const row = programRowByName(page, programName);
    await expect(row.getByText(newDescription)).toHaveCount(0);
    await expect(row.getByText(originalDescription)).toBeVisible();

    const redirectedToLogin = page.url().includes('/login');
    const signInVisible = await page.getByRole('button', { name: 'Sign In' }).isVisible().catch(() => false);
    const authMessageVisible = await page
      .getByText(/unauthorized|log in again|session expired/i)
      .isVisible()
      .catch(() => false);
    const modalStillOpen = await modal.isVisible();

    expect(redirectedToLogin || signInVisible || authMessageVisible || modalStillOpen).toBeTruthy();
  });

  test('TC-011 — Save with no changes does not corrupt data', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Unchanged description-${Date.now()}`;

    await seedProgram(page, programName, description);
    const modal = await openEditForProgram(page, programName);
    await saveEdit(modal);

    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, programName).getByText(description)).toBeVisible();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-012 — Name at maximum allowed length after edit', async ({ page }) => {
    const programName = `Max Length Seed-${Date.now()}`;
    const suffix = String(Date.now());
    const maxName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
    expect(maxName).toHaveLength(255);

    await seedProgram(page, programName, `Seed description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(maxName);
    await saveEdit(modal);

    await expect(programRowByName(page, maxName)).toHaveCount(1);
  });

  test('TC-013 — Name at 256 characters is accepted', async ({ page }) => {
    const programName = `Original Name-${Date.now()}`;
    const suffix = String(Date.now());
    const overMaxName = `${'B'.repeat(256 - suffix.length)}${suffix}`;
    expect(overMaxName).toHaveLength(256);

    await seedProgram(page, programName, `Seed description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(overMaxName);
    await expect(modal.getByRole('button', { name: 'Save' })).toBeEnabled();
    await saveEdit(modal);

    await expect(programRowByName(page, overMaxName)).toHaveCount(1);
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-014 — Special characters in edited name and description', async ({ page }) => {
    const programName = `QA Program Pilot-${Date.now()}`;
    const updatedName = `QA & Testing — Cohort #1 (2026)-${Date.now()}`;
    const updatedDescription = `Notes: "updated", <review>, émojis 🎓-${Date.now()}`;

    await seedProgram(page, programName, `Pilot description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(updatedName);
    await descriptionField(modal).fill(updatedDescription);
    await saveEdit(modal);

    await expect(programRowByName(page, updatedName)).toHaveCount(1);
    await expect(programRowByName(page, updatedName).getByText(updatedDescription)).toBeVisible();

    const reopen = await openEditForProgram(page, updatedName);
    await expect(programNameField(reopen)).toHaveValue(updatedName);
    await expect(descriptionField(reopen)).toHaveValue(updatedDescription);
  });

  test('TC-015 — Leading and trailing spaces in name are preserved', async ({ page }) => {
    const programName = `Cloud Engineering 2026-${Date.now()}`;
    const paddedName = `  Cloud Engineering 2026 - Revised-${Date.now()}  `;

    await seedProgram(page, programName, `Cloud track-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await programNameField(modal).fill(paddedName);
    await saveEdit(modal);

    await expect(programRowByName(page, paddedName)).toHaveCount(1);
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-016 — Double-click Save does not create duplicate programs', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const newDescription = `Double save test-${Date.now()}`;

    await seedProgram(page, programName, `Original description-${Date.now()}`);
    const modal = await openEditForProgram(page, programName);
    await descriptionField(modal).fill(newDescription);
    await modal.getByRole('button', { name: 'Save' }).dblclick();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, programName).getByText(newDescription)).toBeVisible();
  });

  test('TC-017 — Empty description after edit is saved', async ({ page }) => {
    const programName = `Description Clear Test-${Date.now()}`;
    const originalDescription = `Non-empty description-${Date.now()}`;

    await seedProgram(page, programName, originalDescription);
    const modal = await openEditForProgram(page, programName);
    await descriptionField(modal).fill('');

    const saveButton = modal.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    const row = programRowByName(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(originalDescription)).toHaveCount(0);

    const reopen = await openEditForProgram(page, programName);
    await expect(programNameField(reopen)).toHaveValue(programName);
    await expect(descriptionField(reopen)).toHaveValue('');
  });
});
