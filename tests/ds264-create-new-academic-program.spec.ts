import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  clickCreateAndWaitForPostResponse,
  createProgramWithTracking,
  expectFailedSaveKeepsNewProgramFormOpen,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsPostStatus,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

test.describe('DS-264 Create new academic program', () => {
  test.describe('Happy paths', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('TC-001 — Navigate to program creation form', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.openNewProgramForm();

      await expect(programsPage.newProgramModal.heading).toBeVisible();
      await expect(programsPage.newProgramModal.programNameField).toBeVisible();
      await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
      await expect(programsPage.newProgramModal.createButton).toBeVisible();
      await expect(programsPage.newProgramModal.cancelButton).toBeVisible();
    });

    test('TC-002 — Successfully create a program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(201);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-003 — Newly created program appears at the top of the list', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Data Science Fundamentals-${Date.now()}`;
      const description = `Introductory data science track-${Date.now()}`;

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.firstProgramListRow()).toContainText(programName);
    });

    test('TC-004 — Create a program with an empty description', async ({ page, trackProgram }) => {
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
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('TC-005 — Validation prevents empty program name', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillDescription(`Optional description-${Date.now()}`);

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('TC-006 — Whitespace-only program name keeps Create disabled', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName('   ');

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('TC-007 — Clearing a typed program name disables Create again', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(`Cloud Engineering 2026-${Date.now()}`);

      await expect(programsPage.newProgramModal.createButton).toBeEnabled();
      await programsPage.newProgramModal.fillProgramName('');

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
    });

    test('TC-008 — Cancel dismisses the form without saving', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Temporary Program-${Date.now()}`;
      const description = `Should not be saved-${Date.now()}`;

      let createPostSeen = false;
      const onRequest = (request: { url: () => string; method: () => string }) => {
        if (isCreateProgramPost(request.url(), request.method())) {
          createPostSeen = true;
        }
      };
      page.on('request', onRequest);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);
      await programsPage.newProgramModal.clickCancel();

      page.off('request', onRequest);

      await expect(programsPage.newProgramModal.heading).toBeHidden();
      expect(createPostSeen).toBe(false);
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('TC-009 — Save returns 503 and the form stays open', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Save Error 503-${Date.now()}`;

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Valid description-${Date.now()}`);

      await mockProgramsPostStatus(page, 503);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      expect(response.status()).toBe(503);

      await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
    });

    for (const status of [401, 403, 404, 501, 502, 300] as const) {
      test(`TC-010 — Save returns ${status} and the form stays open`, async ({ page }) => {
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

  test.describe('Edge cases', () => {
    test('TC-011 — Empty program list still allows creating the first program', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.emptyStateCreateProgramButton).toBeVisible();
      await expectProgramsPageReady(programsPage);

      await programsPage.openNewProgramForm();
      await expect(programsPage.newProgramModal.heading).toBeVisible();
    });

    test('TC-012 — Malformed program list body renders nothing', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expect(programsPage.heading).toBeHidden();
      await expect(programsPage.newProgramButton).toBeHidden();
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    test('TC-013 — Special characters in name and description are preserved', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA — Cohorte #1 (2026)-${Date.now()}`;
      const description = `Programme "bilingue" <FR/EN> 🎓-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-014 — Leading and trailing spaces in the name are trimmed', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Mobile Development 2026-${Date.now()}`;
      const paddedName = `  ${programName}  `;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(paddedName);
      await programsPage.newProgramModal.fillDescription(`Trim check-${Date.now()}`);

      const response = await clickCreateAndWaitForPostResponse(page, programsPage);
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(Promise.resolve(response), trackProgram);

      const body = (await response.json()) as { data?: { name?: string } };
      expect(body.data?.name).toBe(programName);
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Accessibility', () => {
    test('TC-015 — New Program dialog meets wcag2a and wcag2aa', async ({ page }) => {
      test.fail(
        true,
        'New Program dialog close control has no accessible name (DS-246)',
      );

      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await expect(programsPage.newProgramModal.heading).toBeVisible();

      const includeSelector = await programsPage.newProgramModal.axeIncludeSelector();
      const results = await new AxeBuilder({ page })
        .include(includeSelector)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      await expect(results.violations).toEqual([]);
    });
  });
});
