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

/** Mantine panel — no role="dialog"; scope by heading instead of page-wide labels. */
function newProgramModal(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'New Program' }),
  });
}

function programNameField(modal: Locator) {
  return modal.getByRole('textbox', { name: 'Program Name' });
}

function descriptionField(modal: Locator) {
  return modal.getByRole('textbox', { name: 'Description' });
}

async function openNewProgramModal(page: Page) {
  await page.getByRole('button', { name: '+ New Program' }).click();
  const modal = newProgramModal(page);
  await expect(modal.getByRole('heading', { name: 'New Program' })).toBeVisible();
  await expect(programNameField(modal)).toBeVisible();
  await expect(descriptionField(modal)).toBeVisible();
  return modal;
}

function programRowByName(page: Page, name: string) {
  return page.locator('tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function createProgram(page: Page, name: string, description: string) {
  const modal = await openNewProgramModal(page);
  await programNameField(modal).fill(name);
  await descriptionField(modal).fill(description);
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-001 — Program creation form displays required fields', async ({ page }) => {
    await goToPrograms(page);
    const modal = await openNewProgramModal(page);

    await expect(programNameField(modal)).toBeVisible();
    await expect(descriptionField(modal)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('TC-002 — New program appears in list after successful create', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Full-stack web development program-${Date.now()}`;

    await goToPrograms(page);
    await createProgram(page, programName, description);

    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-003 — Program can be created with valid name and description', async ({ page }) => {
    const programName = `Data Science Fundamentals-${Date.now()}`;
    const description = `Introductory data science track-${Date.now()}`;

    await goToPrograms(page);
    await createProgram(page, programName, description);

    const row = programRowByName(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(description)).toBeVisible();
  });

  test('TC-004 — Cancel dismisses form without saving', async ({ page }) => {
    const programName = `Temporary Program-${Date.now()}`;
    const description = `Should not be saved-${Date.now()}`;

    await goToPrograms(page);
    const modal = await openNewProgramModal(page);
    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill(description);
    await modal.getByRole('button', { name: 'Cancel' }).click();

    await expect(modal).toBeHidden();
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-005 — Create remains disabled when program name is empty', async ({ page }) => {
    const modal = await openNewProgramModal(page);
    await descriptionField(modal).fill(`Optional description-${Date.now()}`);

    await expect(modal.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-006 — Whitespace-only program name does not enable create', async ({ page }) => {
    const modal = await openNewProgramModal(page);
    await programNameField(modal).fill('   ');
    await descriptionField(modal).fill(`Valid description-${Date.now()}`);

    await expect(modal.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-007 — Non-admin user cannot create a program', async ({ page }) => {
    test.skip(
      !process.env.DIDAXIS_NON_ADMIN_EMAIL || !process.env.DIDAXIS_NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD to run this case',
    );

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
    await expect(page.getByRole('button', { name: '+ New Program' })).toHaveCount(0);
    await expect(newProgramModal(page)).toHaveCount(0);
  });

  test('TC-008 — Duplicate program name is not silently accepted', async ({ page }) => {
    test.fail(
      true,
      'Didaxis test env allows duplicate program names without validation (DS-1 ambiguity #2)',
    );

    const programName = `Web Development 2026-${Date.now()}`;

    await createProgram(page, programName, `Original description-${Date.now()}`);

    const modal = await openNewProgramModal(page);
    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill(`Duplicate attempt-${Date.now()}`);
    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    await expect(page.getByText(/duplicate|already exists|unique/i)).toBeVisible();
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-009 — Create does not succeed when session expired', async ({ page }) => {
    const programName = `Session Expired Program-${Date.now()}`;
    const modal = await openNewProgramModal(page);

    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill(`Valid description-${Date.now()}`);

    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
        return;
      }
      await route.continue();
    });

    await modal.getByRole('button', { name: 'Create' }).click();

    await expect(programRowByName(page, programName)).toHaveCount(0);

    const redirectedToLogin = page.url().includes('/login');
    const signInVisible = await page.getByRole('button', { name: 'Sign In' }).isVisible().catch(() => false);
    const authMessageVisible = await page
      .getByText(/unauthorized|log in again|session expired/i)
      .isVisible()
      .catch(() => false);
    const modalStillOpen = await modal.isVisible();

    expect(redirectedToLogin || signInVisible || authMessageVisible || modalStillOpen).toBeTruthy();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-010 — Program name at maximum allowed length', async ({ page }) => {
    const suffix = String(Date.now());
    const programName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(255);

    await createProgram(page, programName, `Max length name test-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-011 — Program name exceeding maximum length is rejected', async ({ page }) => {
    const suffix = String(Date.now());
    const programName = `${'A'.repeat(256 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(256);

    const modal = await openNewProgramModal(page);
    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill(`Over max length-${Date.now()}`);

    const createButton = modal.getByRole('button', { name: 'Create' });
    const createDisabled = await createButton.isDisabled();
    if (!createDisabled) {
      await createButton.click();
    }

    const maxLengthMessage = page.getByText(/max(imum)? length|too long|characters/i);
    const blocked =
      createDisabled ||
      (await maxLengthMessage.isVisible().catch(() => false)) ||
      (await modal.isVisible());

    expect(blocked).toBeTruthy();
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-012 — Special characters in program name and description', async ({ page }) => {
    const programName = `QA & Testing — Cohort #1 (2026)-${Date.now()}`;
    const description = `Description with "quotes", <tags>, and émojis 🎓-${Date.now()}`;

    await createProgram(page, programName, description);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-013 — Empty description with valid program name', async ({ page }) => {
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;
    const modal = await openNewProgramModal(page);

    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill('');

    const createButton = modal.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await expect(modal).toBeHidden({ timeout: 15_000 });
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-014 — Leading and trailing spaces in program name are normalized', async ({ page }) => {
    const programName = `Mobile Development 2026-${Date.now()}`;
    const paddedName = `  ${programName}  `;

    await createProgram(page, paddedName, `Trim behavior check-${Date.now()}`);

    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-015 — Rapid double-click on Create does not duplicate program', async ({ page }) => {
    test.fail(
      true,
      'Didaxis test env creates two programs on double-click Create (DS-1 TC-015)',
    );

    const programName = `Cloud Engineering 2026-${Date.now()}`;
    const modal = await openNewProgramModal(page);

    await programNameField(modal).fill(programName);
    await descriptionField(modal).fill(`Double submit test-${Date.now()}`);
    await modal.getByRole('button', { name: 'Create' }).dblclick();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    await expect(programRowByName(page, programName)).toHaveCount(1);
  });
});
