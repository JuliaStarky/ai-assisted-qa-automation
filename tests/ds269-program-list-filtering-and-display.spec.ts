import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectNewProgramModalClosed,
  expectProgramsPageReady,
  isCreateProgramPost,
  mockEmptyProgramList,
  mockProgramsListMalformedResponse,
  mockProgramsListStatus,
  seedProgramWithTracking,
  trackProgramFromCreateResponse,
  waitForProgramsListGet,
} from './support/programs-flow.helpers';

function uniqueSuffix(testInfo: { parallelIndex: number }) {
  return `${Date.now()}-${testInfo.parallelIndex}`;
}

async function expectProgramsPageReadyWithListLoad(programsPage: ProgramsPage) {
  await expect(programsPage.heading).toBeVisible({ timeout: 15_000 });
  await expect(programsPage.newProgramButton).toBeVisible({ timeout: 15_000 });
}

test.describe('DS-269 Program list filtering and display', () => {
  test.describe('Happy paths', () => {
    test('TC-001 — Display program list with key details', { tag: '@smoke' }, async ({ page, trackProgram }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Web Development 2026-${suffix}`;
      const description = `Full-stack web development program-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        description,
        trackProgram,
        { waitForNetworkIdle: true },
      );

      await expect(programsPage.heading).toHaveText('Programs');
      await expect(programsPage.subtitle).toHaveText('Manage academic programs and semesters');
      await expect(programsPage.programTableColumnHeader).toBeVisible();
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
      await expect(programsPage.editButton(programName)).toBeVisible();
      await expect(programsPage.deleteButton(programName)).toBeVisible();
    });

    test('TC-002 — Newly created program appears at the top of the list', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Data Science Fundamentals-${suffix}`;
      const description = `Introductory data science track-${suffix}`;

      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReadyWithListLoad(programsPage);
      await createProgramWithTracking(page, programsPage, programName, description, trackProgram);

      await expect(programsPage.firstProgramListRow()).toContainText(programName, { timeout: 15_000 });
    });

    test('TC-003 — Empty state when no programs exist', { tag: '@sanity' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.emptyStateCreateProgramButton).toBeVisible();
      await programsPage.openCreateProgramFromEmptyState();
      await expect(programsPage.newProgramModal.dialog).toBeVisible();
      await expect(programsPage.newProgramModal.heading).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test('TC-004 — Empty state is not shown when programs exist', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Web Development 2026-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Listed program-${suffix}`,
        trackProgram,
        { waitForNetworkIdle: true },
      );

      await expect(programsPage.exactEmptyStateMessage).toBeHidden();
    });

    test('TC-005 — Malformed program list body renders nothing', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      const listResponse = waitForProgramsListGet(page);
      await programsPage.goto();
      await listResponse;

      await expect(programsPage.heading).toBeHidden();
      await expect(programsPage.newProgramButton).toBeHidden();
      await expect(programsPage.programListAlertOrStatus).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    test('TC-006 — List request returns 503 and the empty state is shown', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListStatus(page, 503);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();
      await expect(programsPage.programListAlertOrStatus).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    const listErrorStatuses: { tc: string; status: number }[] = [
      { tc: 'TC-007', status: 401 },
      { tc: 'TC-008', status: 403 },
      { tc: 'TC-009', status: 404 },
      { tc: 'TC-010', status: 501 },
      { tc: 'TC-011', status: 502 },
      { tc: 'TC-012', status: 300 },
    ];

    for (const { tc, status } of listErrorStatuses) {
      test(`${tc} — List request returns ${status} and the empty state is shown`, { tag: '@regression' }, async ({
        page,
      }) => {
        const programsPage = new ProgramsPage(page);
        await mockProgramsListStatus(page, status);
        await programsPage.goto();
        await expectProgramsPageReady(programsPage);

        await expect(programsPage.exactEmptyStateMessage).toBeVisible();
        await expect(programsPage.newProgramButton).toBeVisible();
        await expect(programsPage.programListAlertOrStatus).toHaveCount(0);
        await expect(programsPage.loadErrorMessage).toBeHidden();
      });
    }
  });

  test.describe('Edge cases', () => {
    test('TC-013 — Program without a description shows only its name', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Cybersecurity Bootcamp-${suffix}`;

      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReadyWithListLoad(programsPage);

      const emptyDescResponse = page.waitForResponse((resp) =>
        isCreateProgramPost(resp.url(), resp.request().method()),
      );
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fillProgramName(programName);
      await programsPage.newProgramModal.fillDescription('');
      await programsPage.newProgramModal.clickCreate();
      await expectNewProgramModalClosed(programsPage);
      await trackProgramFromCreateResponse(emptyDescResponse, trackProgram);

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.paragraphsInProgramRow(programName)).toHaveCount(1);
      await expect(programsPage.paragraphsInProgramRow(programName)).toHaveText(programName);
    });

    test('TC-014 — Special characters display unchanged in the list', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }, testInfo) => {
      const programsPage = new ProgramsPage(page);
      const suffix = uniqueSuffix(testInfo);
      const programName = `Informatique & IA — Cohorte #1 (2026)-${suffix}`;
      const description = `Programme "bilingue" <FR/EN> 🎓-${suffix}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        description,
        trackProgram,
        { waitForNetworkIdle: true },
      );

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expect(programsPage.programNameInRow(programName)).toBeVisible();
      await expect(programsPage.descriptionInProgramRow(programName, description)).toBeVisible();
      await expect(
        programsPage.injectedImageInProgramRow(programName, description),
      ).toHaveCount(0);
    });

    test('TC-015 — Programs page has no search or filter control', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto({ waitForNetworkIdle: true });
      await expectProgramsPageReadyWithListLoad(programsPage);

      await expect(programsPage.programSearchBox).toHaveCount(0);
    });
  });

  test.describe('Accessibility', () => {
    test('TC-016 — axe scan of empty-state Programs view (wcag2a, wcag2aa)', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expect(programsPage.emptyStateCreateProgramButton).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      if (results.violations.length > 0) {
        const ids = results.violations.map((v) => v.id).join(', ');
        test.fail(true, `axe violations on empty-state Programs view: ${ids}`);
      }
      await expect(results.violations).toEqual([]);
    });
  });
});
