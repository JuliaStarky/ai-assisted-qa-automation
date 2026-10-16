import { test, expect, type Page } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
  });

  test('TC-001 — Program creation form displays required fields', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.openNewProgramForm();

    await expect(programsPage.newProgramModal.heading).toBeVisible();
    await expect(programsPage.newProgramModal.programNameField).toBeVisible();
    await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
    await expect(programsPage.newProgramModal.createButton).toBeVisible();
  });

  test('TC-002 — New program appears in list after successful create', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Full-stack web development program-${Date.now()}`;

    await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-003 — Program can be created with valid name and description', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Data Science Fundamentals-${Date.now()}`;
    const description = `Introductory data science track-${Date.now()}`;

    await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
  });

  test('TC-004 — Cancel dismisses form without saving', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Temporary Program-${Date.now()}`;
    const description = `Should not be saved-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(description);
    await programsPage.newProgramModal.clickCancel();

    await expect(programsPage.newProgramModal.heading).toBeHidden();
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
  });

  test('TC-005 — Create remains disabled when program name is empty', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillDescription(`Optional description-${Date.now()}`);

    await expect(programsPage.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-006 — Whitespace-only program name does not enable create', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName('   ');
    await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

    await expect(programsPage.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-007 — Non-admin user cannot create a program', async () => {
    test.skip(true, 'Requires a non-admin test account (not available in this environment)');
  });

  test('TC-008 — Duplicate program name is not silently accepted', async ({ page, trackProgram }) => {
    test.fail(
      true,
      'Didaxis test env allows duplicate program names without validation (DS-1 ambiguity #2)',
    );

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;

    await createProgramWithTracking(
      page,
      programsPage,
      programName,
      `Original description-${Date.now()}`,
      trackProgram,
    );

    const duplicateResponse = page.waitForResponse((resp) =>
      isCreateProgramPost(resp.url(), resp.request().method()),
    );
    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Duplicate attempt-${Date.now()}`);
    await programsPage.newProgramModal.clickCreate();
    await expectNewProgramModalClosed(programsPage);
    await trackProgramFromCreateResponse(duplicateResponse, trackProgram);

    await expect(programsPage.duplicateNameError).toBeVisible();
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-009 — Create does not succeed when session expired', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Session Expired Program-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

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

    await programsPage.newProgramModal.clickCreate();

    await expect(programsPage.programRowByName(programName)).toHaveCount(0);

    const redirectedToLogin = page.url().includes('/login');
    const signInVisible = await programsPage.signInButton.isVisible().catch(() => false);
    const authMessageVisible = await programsPage.sessionExpiredMessage.isVisible().catch(() => false);
    const modalStillOpen = await programsPage.newProgramModal.heading.isVisible();

    expect(redirectedToLogin || signInVisible || authMessageVisible || modalStillOpen).toBeTruthy();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await expectProgramsPageReady(programsPage);
  });

  test('TC-010 — Program name at maximum allowed length', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const suffix = String(Date.now());
    const programName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(255);

    await createProgramWithTracking(
      page,
      programsPage,
      programName,
      `Max length name test-${Date.now()}`,
      trackProgram,
    );
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-011 — Program name exceeding maximum length is rejected', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const suffix = String(Date.now());
    const programName = `${'A'.repeat(256 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(256);

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Over max length-${Date.now()}`);

    const createDisabled = await programsPage.newProgramModal.createButton.isDisabled();
    if (!createDisabled) {
      await programsPage.newProgramModal.clickCreate();
    }

    const maxLengthMessageVisible = await programsPage.maxLengthError.isVisible().catch(() => false);
    const modalStillOpen = await programsPage.newProgramModal.heading.isVisible();
    const blocked = createDisabled || maxLengthMessageVisible || modalStillOpen;

    expect(blocked).toBeTruthy();
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-012 — Special characters in program name and description', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `QA & Testing — Cohort #1 (2026)-${Date.now()}`;
    const description = `Description with "quotes", <tags>, and émojis 🎓-${Date.now()}`;

    await createProgramWithTracking(page, programsPage, programName, description, trackProgram);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-013 — Empty description with valid program name', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;
    const responsePromise = page.waitForResponse((resp) =>
      isCreateProgramPost(resp.url(), resp.request().method()),
    );

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription('');

    await expect(programsPage.newProgramModal.createButton).toBeEnabled();
    await programsPage.newProgramModal.clickCreate();
    await expectNewProgramModalClosed(programsPage);
    await trackProgramFromCreateResponse(responsePromise, trackProgram);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-014 — Leading and trailing spaces in program name are normalized', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Mobile Development 2026-${Date.now()}`;
    const paddedName = `  ${programName}  `;

    await createProgramWithTracking(
      page,
      programsPage,
      paddedName,
      `Trim behavior check-${Date.now()}`,
      trackProgram,
    );

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-015 — Rapid double-click on Create does not duplicate program', async ({ page, trackProgram }) => {
    test.fail(
      true,
      'Didaxis test env creates two programs on double-click Create (DS-1 TC-015)',
    );

    const programsPage = new ProgramsPage(page);
    const programName = `Cloud Engineering 2026-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Double submit test-${Date.now()}`);

    const createdIds: string[] = [];
    const parseCreates: Promise<void>[] = [];
    const onCreateResponse = (resp: Awaited<ReturnType<Page['waitForResponse']>>) => {
      parseCreates.push(
        (async () => {
          if (!isCreateProgramPost(resp.url(), resp.request().method()) || !resp.ok()) {
            return;
          }
          const body = (await resp.json()) as { data?: { id?: string } };
          if (body.data?.id) {
            createdIds.push(body.data.id);
          }
        })(),
      );
    };
    page.on('response', onCreateResponse);
    await programsPage.newProgramModal.doubleClickCreate();
    await expectNewProgramModalClosed(programsPage);
    await Promise.all(parseCreates);
    page.off('response', onCreateResponse);
    for (const id of createdIds) {
      trackProgram(id);
    }

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });
});
