import { test, expect } from '../fixtures/cleanup.fixture';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';
import { programsUrl } from '../fixtures/didaxis.helpers';
import {
  createProgramWithTracking,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsListStatus,
  mockProgramsPostStatus,
  seedProgramWithTracking,
  waitForProgramsListGet,
} from './support/programs-flow.helpers';

test.describe('DS-294 Mark — Program list filtering and display', () => {
  test.describe('Happy paths', () => {
    test('TC-001 — Display program list with key details', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `DS-294 Display ${suffix}`;
      const description = 'Program list display check';

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.subtitle).toBeVisible();
      await expect(programsPage.programTableColumnHeader).toBeVisible();
      await expect(programsPage.programNameInRow(programName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-002 — Each listed program shows its own description', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const alphaName = `DS-294 Alpha ${suffix}`;
      const betaName = `DS-294 Beta ${suffix}`;
      const alphaDescription = 'Alpha cohort description';
      const betaDescription = 'Beta cohort description';

      await seedProgramWithTracking(page, programsPage, alphaName, alphaDescription, trackProgram);
      await createProgramWithTracking(page, programsPage, betaName, betaDescription, trackProgram);

      await expect(programsPage.descriptionInProgramRow(alphaName, alphaDescription)).toBeVisible();
      await expect(programsPage.descriptionInProgramRow(betaName, betaDescription)).toBeVisible();
      await expect(
        programsPage.textInNamedProgramRow(alphaName, betaDescription),
      ).toBeHidden();
    });

    test('TC-003 — Empty state when no programs exist', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('TC-004 — Empty state prompts the user to create the first program', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.emptyStateCreateProgramButton).toBeVisible();
      await programsPage.openCreateProgramFromEmptyState();
      await expect(programsPage.newProgramModal.dialog).toBeVisible();
      await expect(programsPage.newProgramModal.programNameField).toBeVisible();
      await expect(programsPage.newProgramModal.descriptionField).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('TC-005 — Empty state is not shown when programs exist', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `DS-294 Not Empty ${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        'Proves the list is populated',
        trackProgram,
      );

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.emptyStateCreateProgramButton).toBeHidden();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test.describe('Unauthenticated access', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('TC-006 — Unauthenticated user cannot view the program list', async ({ page }) => {
        const programsPage = new ProgramsPage(page);
        const loginPage = new LoginPage(page);

        await page.goto(programsUrl);

        await expect(page).toHaveURL(/\/login/);
        await expect(loginPage.signInButton).toBeVisible();
        await expect(programsPage.heading).toBeHidden();
      });
    });

    test('TC-007 — Failed program list load is not presented as "no programs" (401)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 401);
      const listLoaded = waitForProgramsListGet(page, 401);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-008 — Failed program list load is not presented as "no programs" (403)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 403);
      const listLoaded = waitForProgramsListGet(page, 403);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-009 — Failed program list load is not presented as "no programs" (404)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 404);
      const listLoaded = waitForProgramsListGet(page, 404);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-010 — Failed program list load is not presented as "no programs" (501)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 501);
      const listLoaded = waitForProgramsListGet(page, 501);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-011 — Failed program list load is not presented as "no programs" (502)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 502);
      const listLoaded = waitForProgramsListGet(page, 502);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-012 — Failed program list load is not presented as "no programs" (300)', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 300);
      const listLoaded = waitForProgramsListGet(page, 300);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-013 — Malformed program list response does not blank the page', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      const listLoaded = waitForProgramsListGet(page, 200);
      await programsPage.goto({ waitForNetworkIdle: true });
      await listLoaded;

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });

    test('TC-014 — Failed save does not add a phantom row to the list', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `DS-294 Save 503 ${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await mockProgramsPostStatus(page, 503);
      const postResponse = page.waitForResponse(
        (resp) =>
          isCreateProgramPost(resp.url(), resp.request().method()) && resp.status() === 503,
      );
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription('Should not be listed');
      await programsPage.newProgramModal.clickCreate();
      await postResponse;

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test('TC-015 — Special characters in name and description are displayed exactly', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = Date.now();
      const programName = `Informatique & IA ${suffix}`;
      const description = 'Curriculum "advanced" & research <R&D>';

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(
        programsPage.descriptionInProgramRow(programName, description),
      ).toBeVisible();
    });

    test('TC-016 — Program with an empty description is still listed', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `DS-294 No Description ${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, '', trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.editButton(programName)).toBeVisible();
      await expect(programsPage.deleteButton(programName)).toBeVisible();
    });

    test('TC-017 — Long program name is listed in full', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = String(Date.now());
      const base = `DS-294 Long ${suffix} `;
      const programName = `${base}${'x'.repeat(255 - base.length)}`;
      expect(programName).toHaveLength(255);

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Long name row-${suffix}`,
        trackProgram,
      );

      await programsPage.scrollProgramRowIntoView(programName);
      await expect(programsPage.programNameInRow(programName)).toBeVisible();
    });

    test('TC-018 — Newly created program appears at the top of a large list', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `DS-294 Newest ${Date.now()}`;
      const description = 'Newest program first';

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.firstProgramListRow()).toContainText(programName);
      await expect(programsPage.firstProgramListRow()).toContainText(description);
    });
  });
});
