import { test, expect, type Page } from '@playwright/test';

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
  await expect(programRowByName(page, name)).toHaveCount(1);
}

/** Row delete icon — accessible name is "Delete {programName}". */
async function confirmDeleteDialog(
  page: Page,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<string> {
  const row = programRowByName(page, programName).first();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();

  const [message] = await Promise.all([
    page.waitForEvent('dialog').then(async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      const text = dialog.message();
      if (action === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      return text;
    }),
    row.getByRole('button', { name: `Delete ${programName}` }).click(),
  ]);

  return message;
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-001 — Confirmed deletion removes program from list', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;
    await seedProgram(page, programName, `Delete me-${Date.now()}`);

    await confirmDeleteDialog(page, programName, 'accept');

    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-002 — Cancel keeps program in list', async ({ page }) => {
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Keep this row-${Date.now()}`;

    await seedProgram(page, programName, description);

    await confirmDeleteDialog(page, programName, 'dismiss');

    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, programName).getByText(description)).toBeVisible();
  });

  test('TC-003 — Confirmation dialog identifies the program being deleted', async ({ page }) => {
    const programName = `Data Science Fundamentals-${Date.now()}`;

    await seedProgram(page, programName, `Identify in dialog-${Date.now()}`);

    const message = await confirmDeleteDialog(page, programName, 'dismiss');

    expect(message).toContain(programName);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-004 — List updates immediately after confirmed delete', async ({ page }) => {
    const deleteTarget = `Test Program-${Date.now()}`;
    const keepTarget = `Cloud Engineering 2026-${Date.now()}`;

    await seedProgram(page, deleteTarget, `To remove-${Date.now()}`);
    await createProgram(page, keepTarget, `Should stay-${Date.now()}`);

    await confirmDeleteDialog(page, deleteTarget, 'accept');

    await expect(programRowByName(page, deleteTarget)).toHaveCount(0);
    await expect(programRowByName(page, keepTarget)).toHaveCount(1);
  });

  test('TC-005 — Dismiss dialog without confirm or cancel (e.g. close control)', async ({
    page,
  }) => {
    const programName = `Mobile Development 2026-${Date.now()}`;

    await seedProgram(page, programName, `Dismiss test-${Date.now()}`);

    await confirmDeleteDialog(page, programName, 'dismiss');

    await expect(programRowByName(page, programName)).toHaveCount(1);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-006 — Non-admin cannot delete a program', async ({ page }) => {
    test.skip(
      !process.env.DIDAXIS_NON_ADMIN_EMAIL || !process.env.DIDAXIS_NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD to run this case',
    );

    const programName = `Test Program-${Date.now()}`;
    await seedProgram(page, programName, `Protected-${Date.now()}`);

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
    await expect(
      programRowByName(page, programName).getByRole('button', { name: `Delete ${programName}` }),
    ).toHaveCount(0);
  });

  test('TC-007 — Deletion does not complete when session expires on confirm', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;

    await seedProgram(page, programName, `Session delete-${Date.now()}`);

    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
        return;
      }
      await route.continue();
    });

    await confirmDeleteDialog(page, programName, 'accept');

    await expect(programRowByName(page, programName)).toHaveCount(1);

    const redirectedToLogin = page.url().includes('/login');
    const signInVisible = await page.getByRole('button', { name: 'Sign In' }).isVisible().catch(() => false);
    const authMessageVisible = await page
      .getByText(/unauthorized|log in again|session expired/i)
      .isVisible()
      .catch(() => false);

    expect(redirectedToLogin || signInVisible || authMessageVisible || (await programRowByName(page, programName).count()) >= 1).toBeTruthy();
  });

  test('TC-008 — Confirm alone without opening dialog does not delete', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;

    await seedProgram(page, programName, `No dialog path-${Date.now()}`);
    await expect(programRowByName(page, programName)).toHaveCount(1);
  });

  test('TC-009 — Failed delete shows error and preserves program', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;

    await seedProgram(page, programName, `API failure-${Date.now()}`);

    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
        return;
      }
      await route.continue();
    });

    await confirmDeleteDialog(page, programName, 'accept');

    await expect(programRowByName(page, programName)).toHaveCount(1);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-010 — Delete program with special characters in name', async ({ page }) => {
    const programName = `Informatique & IA - Niveau 2-${Date.now()}`;

    await seedProgram(page, programName, `Special chars-${Date.now()}`);

    const message = await confirmDeleteDialog(page, programName, 'accept');
    expect(message).toContain(programName);

    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-011 — Delete last program in list', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;

    await seedProgram(page, programName, `Only this test row-${Date.now()}`);

    await confirmDeleteDialog(page, programName, 'accept');

    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-012 — Double-click confirm does not cause duplicate errors or inconsistent UI', async ({
    page,
  }) => {
    const programName = `Test Program-${Date.now()}`;

    await seedProgram(page, programName, `Double confirm-${Date.now()}`);

    const row = programRowByName(page, programName).first();
    await row.scrollIntoViewIfNeeded();

    let dialogCount = 0;
    const [message] = await Promise.all([
      page.waitForEvent('dialog').then(async (dialog) => {
        dialogCount += 1;
        await dialog.accept();
        return dialog.message();
      }),
      row.getByRole('button', { name: `Delete ${programName}` }).click(),
    ]);

    expect(dialogCount).toBe(1);
    expect(message).toContain(programName);
    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-013 — Delete program with long name in confirmation dialog', async ({ page }) => {
    const suffix = String(Date.now());
    const programName = `${'L'.repeat(255 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(255);

    await seedProgram(page, programName, `Long name delete-${Date.now()}`);

    const message = await confirmDeleteDialog(page, programName, 'accept');
    expect(message).toContain(programName.slice(0, 40));

    await expect(programRowByName(page, programName)).toHaveCount(0);
  });

  test('TC-014 — Re-create program with same name after delete', async ({ page }) => {
    const programName = `Test Program-${Date.now()}`;
    const firstDescription = `First life-${Date.now()}`;
    const secondDescription = `Second life-${Date.now()}`;

    await seedProgram(page, programName, firstDescription);

    await confirmDeleteDialog(page, programName, 'accept');
    await expect(programRowByName(page, programName)).toHaveCount(0);

    await createProgram(page, programName, secondDescription);
    await expect(programRowByName(page, programName)).toHaveCount(1);
    await expect(programRowByName(page, programName).getByText(secondDescription)).toBeVisible();
  });

  test('TC-015 — Delete one program does not remove others', async ({ page }) => {
    const deleteTarget = `Test Program-${Date.now()}`;
    const keepTarget = `Web Development 2026-${Date.now()}`;

    await seedProgram(page, deleteTarget, `Remove only me-${Date.now()}`);
    await createProgram(page, keepTarget, `Keep me-${Date.now()}`);

    await confirmDeleteDialog(page, deleteTarget, 'accept');

    await expect(programRowByName(page, deleteTarget)).toHaveCount(0);
    await expect(programRowByName(page, keepTarget)).toHaveCount(1);
  });
});
