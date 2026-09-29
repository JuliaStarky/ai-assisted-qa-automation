import { test, expect, type Page } from '@playwright/test';

const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const loginUrl = `${baseUrl}/login`;
const programsUrl = `${baseUrl}/programs`;

const emptyStatePattern = /No programs yet|no programs have been created/i;

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
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
}

function newProgramModal(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'New Program' }),
  });
}

async function createProgram(page: Page, name: string, description: string) {
  await page.getByRole('button', { name: '+ New Program' }).click();
  const modal = newProgramModal(page);
  await modal.getByLabel('Program Name').fill(name);
  await modal.getByLabel('Description').fill(description);
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

function programRowByName(page: Page, name: string) {
  return page.locator('tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function seedProgram(page: Page, name: string, description: string) {
  await goToPrograms(page);
  await createProgram(page, name, description);
  await expect(programRowByName(page, name).first()).toBeVisible();
}

async function mockEmptyProgramList(page: Page) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }
    await route.continue();
  });
}

async function confirmDeleteDialog(page: Page, programName: string): Promise<void> {
  const row = programRowByName(page, programName).first();
  await row.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForEvent('dialog').then((dialog) => dialog.accept()),
    row.getByRole('button', { name: `Delete ${programName}` }).click(),
  ]);
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-001 — List shows each program name and description', async ({ page }) => {
    const firstName = `Web Development 2026-${Date.now()}`;
    const firstDesc = `Full-stack web development program-${Date.now()}`;
    const secondName = `Data Science Fundamentals-${Date.now()}`;
    const secondDesc = `Introductory data science track-${Date.now()}`;

    await goToPrograms(page);
    await createProgram(page, firstName, firstDesc);
    await createProgram(page, secondName, secondDesc);

    const firstRow = programRowByName(page, firstName).first();
    const secondRow = programRowByName(page, secondName).first();
    await expect(firstRow.getByText(firstName, { exact: true })).toBeVisible();
    await expect(firstRow.getByText(firstDesc)).toBeVisible();
    await expect(secondRow.getByText(secondName, { exact: true })).toBeVisible();
    await expect(secondRow.getByText(secondDesc)).toBeVisible();
  });

  test('TC-002 — Empty state message and create-first-program prompt', async ({ page }) => {
    await mockEmptyProgramList(page);
    await goToPrograms(page);

    await expect(page.getByText(emptyStatePattern)).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
  });

  test('TC-003 — All existing programs appear in the list', async ({ page }) => {
    const programs = [
      {
        name: `Web Development 2026-${Date.now()}`,
        description: `Full-stack track-${Date.now()}`,
      },
      {
        name: `Mobile Development 2026-${Date.now()}`,
        description: `Mobile track-${Date.now()}`,
      },
      {
        name: `Cybersecurity Bootcamp-${Date.now()}`,
        description: `Security track-${Date.now()}`,
      },
    ];

    await goToPrograms(page);
    for (const program of programs) {
      await createProgram(page, program.name, program.description);
    }

    for (const program of programs) {
      const row = programRowByName(page, program.name).first();
      await expect(row.getByText(program.name, { exact: true })).toBeVisible();
      await expect(row.getByText(program.description)).toBeVisible();
    }
  });

  test('TC-004 — Empty-state create prompt opens program creation', async ({ page }) => {
    await mockEmptyProgramList(page);
    await goToPrograms(page);
    await expect(page.getByText(emptyStatePattern)).toBeVisible();

    const programName = `Test Program-${Date.now()}`;
    const description = `First program-${Date.now()}`;
    await createProgram(page, programName, description);

    await page.unroute('**/api/programs');
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(programRowByName(page, programName).first()).toBeVisible();
    await expect(programRowByName(page, programName).first().getByText(description)).toBeVisible();
    await expect(page.getByText(emptyStatePattern)).toHaveCount(0);
  });

  test('TC-005 — List refreshes after new program is created elsewhere in session', async ({
    page,
  }) => {
    const existingName = `Web Development 2026-${Date.now()}`;
    const newName = `Cloud Engineering 2026-${Date.now()}`;
    const newDesc = `Cloud fundamentals-${Date.now()}`;

    await seedProgram(page, existingName, `Existing program-${Date.now()}`);
    await createProgram(page, newName, newDesc);

    await expect(programRowByName(page, existingName).first()).toBeVisible();
    const newRow = programRowByName(page, newName).first();
    await expect(newRow.getByText(newName, { exact: true })).toBeVisible();
    await expect(newRow.getByText(newDesc)).toBeVisible();
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-006 — Empty state does not show program rows', async ({ page }) => {
    await mockEmptyProgramList(page);
    await goToPrograms(page);

    await expect(page.getByText(emptyStatePattern)).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test('TC-007 — Non-admin empty or populated list follows access rules', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
  });

  test('TC-008 — Failed load does not show false empty state', async ({ page }) => {
    test.fail(
      true,
      'GET /api/programs failure shows "No programs yet" empty state (DS-5 ambiguity #6)',
    );

    const programName = `Load Failure Seed-${Date.now()}`;
    await seedProgram(page, programName, `Exists before mock-${Date.now()}`);

    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    await page.goto(programsUrl);
    await expect(page.getByText(/error|failed|retry|unable to load/i)).toBeVisible();
    await expect(page.getByText(emptyStatePattern)).toHaveCount(0);
  });

  test('TC-009 — Deleted program no longer appears in list', async ({ page }) => {
    const deleteTarget = `Test Program-${Date.now()}`;
    const keepTarget = `Web Development 2026-${Date.now()}`;
    const keepDesc = `Still listed-${Date.now()}`;

    await seedProgram(page, deleteTarget, `Remove from list-${Date.now()}`);
    await createProgram(page, keepTarget, keepDesc);

    await confirmDeleteDialog(page, deleteTarget);
    await expect(programRowByName(page, deleteTarget)).toHaveCount(0);

    const keepRow = programRowByName(page, keepTarget).first();
    await expect(keepRow.getByText(keepTarget, { exact: true })).toBeVisible();
    await expect(keepRow.getByText(keepDesc)).toBeVisible();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-010 — Long program name and description display correctly', async ({ page }) => {
    const suffix = String(Date.now());
    const programName = `${'L'.repeat(255 - suffix.length)}${suffix}`;
    const description = `${'Long description sentence. '.repeat(8)}${Date.now()}`;
    expect(programName).toHaveLength(255);

    await seedProgram(page, programName, description);

    const row = programRowByName(page, programName).first();
    await row.scrollIntoViewIfNeeded();
    await expect(row.getByText(programName, { exact: true })).toBeVisible();
    await expect(row.getByText(description)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
  });

  test('TC-011 — Special characters render correctly in list', async ({ page }) => {
    const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
    const description = `Notes: "quotes", <tags>, émojis 🎓-${Date.now()}`;

    await seedProgram(page, programName, description);

    const row = programRowByName(page, programName).first();
    await expect(row.getByText(programName, { exact: true })).toBeVisible();
    await expect(row.getByText(description)).toBeVisible();
  });

  test('TC-012 — Program with empty description still shows name', async ({ page }) => {
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await goToPrograms(page);
    await createProgram(page, programName, '');

    const row = programRowByName(page, programName).first();
    await expect(row.getByText(programName, { exact: true })).toBeVisible();
  });

  test('TC-013 — Large number of programs in list', async ({ page }) => {
    await goToPrograms(page);
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(50);

    await expect(page.getByText('Program', { exact: true }).first()).toBeVisible();
    const sampleRow = page.locator('tbody tr').first();
    await sampleRow.scrollIntoViewIfNeeded();
    await expect(sampleRow).toBeVisible();
  });

  test('TC-014 — Filter or search narrows list (if filtering UI exists)', async ({ page }) => {
    test.skip(true, 'Programs page has no search/filter control in test.didaxis.studio (DS-5 ambiguity #2)');

    await seedProgram(page, `Web Development 2026-${Date.now()}`, `WD-${Date.now()}`);
  });

  test('TC-015 — Filter with no matches shows appropriate empty result', async ({ page }) => {
    test.skip(true, 'Programs page has no search/filter control in test.didaxis.studio (DS-5 ambiguity #2)');
  });

  test('TC-016 — Duplicate display names remain distinguishable in list', async ({ page }) => {
    const sharedName = `Web Development 2026-${Date.now()}`;
    const firstDesc = `First duplicate row-${Date.now()}`;
    const secondDesc = `Second duplicate row-${Date.now()}`;

    await goToPrograms(page);
    await createProgram(page, sharedName, firstDesc);
    await createProgram(page, sharedName, secondDesc);

    await expect(programRowByName(page, sharedName)).toHaveCount(2);
    await expect(page.getByText(firstDesc)).toBeVisible();
    await expect(page.getByText(secondDesc)).toBeVisible();
  });
});
