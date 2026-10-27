import { test, expect } from '../fixtures/cleanup.fixture';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';
import { programsUrl } from '../fixtures/didaxis.helpers';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsListServerError,
  seedProgramWithTracking,
  trackProgramFromCreateResponse,
} from './support/programs-flow.helpers';

test.describe('DS-5 Program list display', () => {
  test.describe('Positive flows', () => {
    test('TC-001 — Display program list with key details', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.subtitle).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
      await expect(programsPage.programTableColumnHeader).toBeVisible();
      await expect(programsPage.firstProgramListRow()).toBeVisible();
    });

    test('TC-002 — Newly created program appears at top with name and description', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const description = `Full-stack web development program-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
      await expect(programsPage.firstProgramListRow()).toContainText(programName);
    });

    test('TC-003 — Empty state when no programs exist', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.programListRows()).toHaveCount(0);
    });

    test('TC-004 — Empty state Create Program opens New Program form', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.emptyStateCreateProgramButton).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
      await programsPage.openCreateProgramFromEmptyState();
      await expect(programsPage.newProgramModal.heading).toBeVisible();
    });

    test('TC-005 — Program list persists after page refresh', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Data Science Fundamentals-${Date.now()}`;
      const description = `Introductory data science track-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
      await programsPage.reload();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-006 — Admin can manage each listed program', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Cloud Engineering 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Manage row actions-${Date.now()}`,
        trackProgram,
      );

      await expect(programsPage.editButton(programName)).toBeVisible();
      await expect(programsPage.deleteButton(programName)).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test('TC-007 — Failed program list load shows error instead of empty state', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListServerError(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.loadErrorMessage).toBeVisible();
      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
    });

    test('TC-008 — Malformed program list response does not blank the page', async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();

      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
      await expect(programsPage.loadErrorMessage).toBeVisible();
    });

    test.describe('Unauthenticated access', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('TC-009 — Unauthenticated user is redirected away from program list', async ({
        page,
      }) => {
        const programsPage = new ProgramsPage(page);
        const loginPage = new LoginPage(page);

        await page.goto(programsUrl);

        await expect(page).toHaveURL(/\/login/);
        await expect(loginPage.signInButton).toBeVisible();
        await expect(programsPage.heading).toBeHidden();
      });
    });

    test('TC-010 — Empty state is not shown when programs exist', async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Cybersecurity Bootcamp-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Bootcamp row-${Date.now()}`,
        trackProgram,
      );

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('TC-011 — Duplicate program names remain distinguishable by description', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Web Development 2026-${Date.now()}`;
      const firstDescription = `First program-${Date.now()}`;
      const secondDescription = `Second program-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        firstDescription,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        programName,
        secondDescription,
        trackProgram,
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(2);
      await expect(programsPage.descriptionInProgramRow(programName, firstDescription)).toBeVisible();
      await expect(
        programsPage.descriptionInProgramRow(programName, secondDescription),
      ).toBeVisible();
    });

    test('TC-012 — Program with empty description still appears in the list', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Cybersecurity Bootcamp-${Date.now()}`;
      const otherDescription = `Other program description-${Date.now()}`;
      const otherName = `Sibling Program-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      const emptyDescResponse = page.waitForResponse((resp) =>
        isCreateProgramPost(resp.url(), resp.request().method()),
      );
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription('');
      await programsPage.newProgramModal.clickCreate();
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(emptyDescResponse, trackProgram);

      await createProgramWithTracking(
        page,
        programsPage,
        otherName,
        otherDescription,
        trackProgram,
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.textInProgramRow(programName, otherDescription)).toHaveCount(0);
    });

    test('TC-013 — Special characters in name and description are displayed exactly', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;
      const description = `Curriculum "advanced" & research-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-014 — Unicode and emoji in name and description are displayed', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Programme été — München 2026-${Date.now()}`;
      const description = `Cohort 🎓 — naïve résumé-${Date.now()}`;

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
    });

    test('TC-015 — Maximum-length program name remains readable in the list', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const suffix = String(Date.now());
      const programName = `${'A'.repeat(255 - suffix.length)}${suffix}`;
      expect(programName).toHaveLength(255);

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Max length list row-${Date.now()}`,
        trackProgram,
      );

      await programsPage.scrollProgramRowIntoView(programName);
      await expect(programsPage.programNameInRow(programName)).toBeVisible();

      const box = await programsPage.programRowBoundingBox(programName);
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      if (box && viewport) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      }
    });

    test('TC-016 — HTML in program description is shown as text, not executed', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `QA XSS Probe-${Date.now()}`;
      const description = '<img src=x onerror=alert(1)> script probe';

      await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
      await expect(programsPage.injectedImageInProgramRow(programName, description)).toHaveCount(0);
    });

    test('TC-017 — Newly created program is findable in a large existing list', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Mobile Development 2026-${Date.now()}`;
      const description = `iOS and Android track-${Date.now()}`;

      await programsPage.goto();
      await expectProgramsPageReady(programsPage);
      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await programsPage.scrollProgramRowIntoView(programName);
      await expect(programsPage.programRowByNameAndDescription(programName, description)).toHaveCount(
        1,
      );
    });
  });
});
