import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  clickCreateAndWaitForPostResponse,
  createProgramWithTracking,
  expectFailedSaveKeepsNewProgramFormOpen,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockProgramsPostStatus,
  mockProgramsPostUnauthorized,
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
    await expect(programsPage.newProgramModal.cancelButton).toBeVisible();
  });

  test('TC-002 — New program appears in list after successful create', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;
    const description = `Full-stack web development program-${Date.now()}`;

    await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
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
    test.fail(true, 'Didaxis test env allows duplicate program names without validation (DS-122)');

    const programsPage = new ProgramsPage(page);
    const programName = `Web Development 2026-${Date.now()}`;

    await createProgramWithTracking(
      page,
      programsPage,
      programName,
      `Original description-${Date.now()}`,
      trackProgram,
    );

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Duplicate attempt-${Date.now()}`);
    const duplicateResponse = await clickCreateAndWaitForPostResponse(page, programsPage);
    await trackProgramFromCreateResponse(Promise.resolve(duplicateResponse), trackProgram);

    expect(duplicateResponse.ok()).toBe(false);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-009 — Create does not succeed when session expired', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Session Expired Program-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

    await mockProgramsPostUnauthorized(page);

    const response = await clickCreateAndWaitForPostResponse(page, programsPage);
    expect(response.status()).toBe(401);

    await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
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

  test('TC-011 — Program name exceeding maximum length is rejected', async ({ page, trackProgram }) => {
    test.fail(true, 'Didaxis accepts Program Name over 255 chars (DS-138)');

    const programsPage = new ProgramsPage(page);
    const suffix = String(Date.now());
    const programName = `${'A'.repeat(256 - suffix.length)}${suffix}`;
    expect(programName).toHaveLength(256);

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(`Over max length-${Date.now()}`);

    const response = await clickCreateAndWaitForPostResponse(page, programsPage);
    await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

    expect(response.ok()).toBe(false);
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  test('TC-012 — Special characters in program name and description', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `QA & Testing — Cohort #1 (2026)-${Date.now()}`;
    const description = `Description with "quotes", <tags>, and émojis 🎓-${Date.now()}`;

    await createProgramWithTracking(page, programsPage, programName, description, trackProgram);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
  });

  test('TC-013 — Empty description with valid program name', async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Cybersecurity Bootcamp-${Date.now()}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription('');

    await expect(programsPage.newProgramModal.createButton).toBeEnabled();
    const responsePromise = clickCreateAndWaitForPostResponse(page, programsPage);
    await expectNewProgramModalClosed(programsPage);
    await trackProgramFromCreateResponse(responsePromise, trackProgram);
    await expect(programsPage.programRowByName(programName)).toHaveCount(1);
  });

  test('TC-014 — Leading and trailing spaces in program name are normalized', async ({
    page,
    trackProgram,
  }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Mobile Development 2026-${Date.now()}`;
    const paddedName = `  ${programName}  `;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(paddedName);
    await programsPage.newProgramModal.fillDescription(`Trim behavior check-${Date.now()}`);

    const response = await clickCreateAndWaitForPostResponse(page, programsPage);
    await expectNewProgramModalClosed(programsPage);
    await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

    const body = (await response.json()) as { data?: { name?: string } };
    expect(body.data?.name).toBe(programName);
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

  test('TC-016 — Case-variant duplicate program name is rejected', async ({ page, trackProgram }) => {
    test.fail(true, 'Didaxis allows case-variant duplicate program names (DS-146)');

    const programsPage = new ProgramsPage(page);
    const ts = Date.now();
    const programName = `Web Development 2026-${ts}`;
    const lowercaseName = `web development 2026-${ts}`;

    await createProgramWithTracking(
      page,
      programsPage,
      programName,
      `Original description-${ts}`,
      trackProgram,
    );

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(lowercaseName);
    await programsPage.newProgramModal.fillDescription(`Case variant duplicate-${ts}`);

    const response = await clickCreateAndWaitForPostResponse(page, programsPage);
    await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

    expect(response.ok()).toBe(false);
    await expect(programsPage.programRowByName(lowercaseName)).toHaveCount(0);
  });

  test('TC-017 — Description exceeding maximum length is rejected', async ({ page, trackProgram }) => {
    test.fail(true, 'Didaxis accepts Description over 2000 chars (DS-139)');

    const programsPage = new ProgramsPage(page);
    const programName = `Valid Program Name-${Date.now()}`;
    const overlongDescription = `${'D'.repeat(2001)}`;

    await programsPage.openNewProgramForm();
    await programsPage.newProgramModal.fillProgramName(programName);
    await programsPage.newProgramModal.fillDescription(overlongDescription);

    const response = await clickCreateAndWaitForPostResponse(page, programsPage);
    await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

    expect(response.ok()).toBe(false);
    await expect(programsPage.programRowByName(programName)).toHaveCount(0);
  });

  for (const status of [403, 404, 501, 502, 503, 300] as const) {
    test(`TC-018 — Save returning ${status} keeps the form open`, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Save Error ${status}-${Date.now()}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

      await mockProgramsPostStatus(page, status);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(status);

      await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
    });
  }
});
