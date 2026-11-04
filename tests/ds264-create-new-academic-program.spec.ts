import { test, expect, type Page } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsPostBadGateway,
  mockProgramsPostForbidden,
  mockProgramsPostMultipleChoices,
  mockProgramsPostNotFound,
  mockProgramsPostNotImplemented,
  mockProgramsPostServiceUnavailable,
  mockProgramsPostUnauthorized,
  seedProgramWithTracking,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

const defaultDescription = () => `Full-stack web development program-${Date.now()}`;

async function openProgramCreationForm(programsPage: ProgramsPage) {
  await programsPage.openNewProgramForm();
  await expect(programsPage.newProgramModal.heading).toBeVisible();
}

test.describe('DS-264 Create new academic program', () => {
  test.describe('Happy paths', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Navigate to program creation form', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await openProgramCreationForm(programsPage);

      await expect(programsPage.newProgramModal.programNameField).toBeVisible();
      await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
      await expect(programsPage.newProgramModal.createButton).toBeVisible();
    });

    test('Successfully create a program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = defaultDescription();

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('Create another valid program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Data Science Fundamentals-${Date.now()}`;
      const description = `Introductory data science track-${Date.now()}`;

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Validation prevents empty program name', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillDescription(defaultDescription());

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      await programsPage.trySubmitNewProgramForm();
      await expect(programsPage.programRowByName('')).toHaveCount(0);
    });

    test('Whitespace-only program name does not create a program', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillProgramName('   ');
      await programsPage.newProgramModal.fillDescription(defaultDescription());

      await expect(programsPage.newProgramModal.createButton).toBeDisabled();
      await expect(programsPage.programRowByName('   ')).toHaveCount(0);
    });

    test('Cancel closes the form without creating a program', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = defaultDescription();

      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);
      await programsPage.newProgramModal.clickCancel();

      await expect(programsPage.newProgramModal.heading).toBeHidden();
      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Duplicate program name is not created', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = defaultDescription();

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(`Duplicate attempt-${Date.now()}`);

      const duplicateResponse = page.waitForResponse((resp) =>
        isCreateProgramPost(resp.url(), resp.request().method()),
      );
      await programsPage.newProgramModal.clickCreate();
      await duplicateResponse;

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(
        programsPage.newProgramModal.heading.or(programsPage.duplicateNameError),
      ).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    test('Accept program name with special characters', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
      const description = defaultDescription();

      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Leading and trailing spaces are not stored as part of the name', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const paddedName = `  ${programName}  `;
      const description = defaultDescription();

      await createProgramWithTracking(page, programsPage, paddedName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programRowByName(paddedName)).toHaveCount(0);
    });

    test('Double-click Create adds the program once', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = defaultDescription();

      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

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

  test.describe('API outcomes', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
    });

    async function assertCreateBlockedByPostError(
      page: Page,
      programsPage: ProgramsPage,
      mockPost: (page: Page) => Promise<void>,
      expectedStatus: number,
    ) {
      const programName = `Web Development 2026-${Date.now()}`;
      const description = defaultDescription();

      await openProgramCreationForm(programsPage);
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription(description);

      await mockPost(page);

      const responsePromise = page.waitForResponse((resp) =>
        isCreateProgramPost(resp.url(), resp.request().method()),
      );
      await programsPage.newProgramModal.clickCreate();
      const response = await responsePromise;
      expect(response.status()).toBe(expectedStatus);

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expect(programsPage.heading).toBeVisible();
    }

    test('Save returns HTTP 503', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(
        page,
        programsPage,
        mockProgramsPostServiceUnavailable,
        503,
      );
    });

    test('Program list returns HTTP 200 with an empty list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('Program list returns HTTP 200 with a malformed body', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('Program list or save returns HTTP 401', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(
        page,
        programsPage,
        mockProgramsPostUnauthorized,
        401,
      );
    });

    test('Program list or save returns HTTP 403', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(page, programsPage, mockProgramsPostForbidden, 403);
    });

    test('Program list or save returns HTTP 404', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(page, programsPage, mockProgramsPostNotFound, 404);
    });

    test('Program list or save returns HTTP 501', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(
        page,
        programsPage,
        mockProgramsPostNotImplemented,
        501,
      );
    });

    test('Program list or save returns HTTP 502', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(page, programsPage, mockProgramsPostBadGateway, 502);
    });

    test('Program list or save returns HTTP 300', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await assertCreateBlockedByPostError(
        page,
        programsPage,
        mockProgramsPostMultipleChoices,
        300,
      );
    });
  });
});
