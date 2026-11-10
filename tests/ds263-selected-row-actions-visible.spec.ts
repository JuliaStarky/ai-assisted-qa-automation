import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  createProgramWithTracking,
  expectProgramsPageReady,
  mockEmptyProgramList,
  mockProgramDelete300,
  mockProgramDelete401,
  mockProgramDelete403,
  mockProgramDelete404,
  mockProgramDelete501,
  mockProgramDelete502,
  mockProgramDelete503,
  mockProgramsListMalformedResponse,
  seedProgramWithTracking,
} from './support/programs-flow.helpers';

type BoundingBox = { x: number; y: number; width: number; height: number };

function assertBoxInsidePanel(panel: BoundingBox, control: BoundingBox) {
  expect(control.x).toBeGreaterThanOrEqual(panel.x);
  expect(control.y).toBeGreaterThanOrEqual(panel.y);
  expect(control.x + control.width).toBeLessThanOrEqual(panel.x + panel.width);
  expect(control.y + control.height).toBeLessThanOrEqual(panel.y + panel.height);
}

async function expectControlVisibleInsideProgramListPanel(
  programsPage: ProgramsPage,
  programName: string,
  control: 'edit' | 'delete',
) {
  const controlLocator =
    control === 'edit' ? programsPage.editButton(programName) : programsPage.deleteButton(programName);
  await expect(controlLocator).toBeVisible();

  const panelBox = await programsPage.programListPanelBoundingBox();
  const controlBox =
    control === 'edit'
      ? await programsPage.editButtonBoundingBox(programName)
      : await programsPage.deleteButtonBoundingBox(programName);

  expect(panelBox).not.toBeNull();
  expect(controlBox).not.toBeNull();
  assertBoxInsidePanel(panelBox!, controlBox!);
}

async function expectEditAndDeleteInsideProgramListPanel(
  programsPage: ProgramsPage,
  programName: string,
) {
  await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'edit');
  await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'delete');
}

async function seedAndSelectProgramRow(
  page: Parameters<typeof seedProgramWithTracking>[0],
  programsPage: ProgramsPage,
  trackProgram: Parameters<typeof seedProgramWithTracking>[4],
  programName: string,
  description: string,
) {
  await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
  await programsPage.selectProgramRow(programName);
}

async function expectPageStaysUsable(programsPage: ProgramsPage) {
  await expectProgramsPageReady(programsPage);
}

async function expectErrorStateOrPageUsable(programsPage: ProgramsPage) {
  await expect(programsPage.heading.or(programsPage.loadErrorMessage)).toBeVisible();
}

function deleteConfirmationMessage(programName: string) {
  return `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.`;
}

test.describe('DS-263 Delete and edit icons clipped off-screen when a program row is selected', () => {
  test.describe('Happy paths', () => {
    test('Selected program row keeps edit and delete actions visible', { tag: '@smoke' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Visible actions-${Date.now()}`,
        trackProgram,
      );
      await programsPage.selectProgramRow(programName);

      await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'edit');
      await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'delete');
    });

    test('Delete from a selected row opens one confirmation dialog', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Dialog check-${Date.now()}`,
      );

      let dialogCount = 0;
      page.on('dialog', () => {
        dialogCount += 1;
      });

      const { message } = await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      expect(dialogCount).toBe(1);
      expect(message).toBe(deleteConfirmationMessage(programName));
    });

    test('Confirming delete from a selected row removes the program', { tag: '@sanity' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Remove on confirm-${Date.now()}`,
      );

      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(0);
    });

    test('Edit from a selected row opens the edit form', { tag: '@sanity' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Edit from selection-${Date.now()}`,
      );

      await programsPage.editButton(programName).click();

      await expect(programsPage.editProgramModal.heading).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('Selected-row actions are not clipped outside the list panel', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Not clipped-${Date.now()}`,
        trackProgram,
      );
      await programsPage.selectProgramRow(programName);

      await expectEditAndDeleteInsideProgramListPanel(programsPage, programName);

      await programsPage.deleteProgramWithDialog(programName, 'dismiss');
      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
    });

    test('Hovering a selected row does not move the actions off-screen', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Hover selected-${Date.now()}`,
      );

      await programsPage.hoverProgramRow(programName);

      await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'delete');
      await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'edit');
    });

    test('Cancelling delete from a selected row keeps the program', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Cancel delete-${Date.now()}`,
      );

      await programsPage.deleteProgramWithDialog(programName, 'dismiss');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectControlVisibleInsideProgramListPanel(programsPage, programName, 'delete');
    });
  });

  test.describe('Edge cases', () => {
    test('Actions stay visible for a selected program with special characters', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Informatique & IA - Niveau 2-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Special chars row-${Date.now()}`,
        trackProgram,
      );
      await programsPage.selectProgramRow(programName);

      await expectEditAndDeleteInsideProgramListPanel(programsPage, programName);
    });

    test('Actions stay visible when the selected program is the only row', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        programName,
        `Only row-${Date.now()}`,
        trackProgram,
      );
      await expect(programsPage.programListRows()).toHaveCount(1);
      await programsPage.selectProgramRow(programName);

      await expectEditAndDeleteInsideProgramListPanel(programsPage, programName);
    });

    test('Unselected row hover still shows actions inside the panel', { tag: '@regression' }, async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      const firstProgram = `Test program-${Date.now()}`;
      const selectedProgram = `Web Development 2026-${Date.now()}`;

      await seedProgramWithTracking(
        page,
        programsPage,
        firstProgram,
        `Hover unselected-${Date.now()}`,
        trackProgram,
      );
      await createProgramWithTracking(
        page,
        programsPage,
        selectedProgram,
        `Selected row-${Date.now()}`,
        trackProgram,
      );

      await programsPage.selectProgramRow(selectedProgram);
      await programsPage.hoverProgramRow(firstProgram);

      await expectControlVisibleInsideProgramListPanel(programsPage, firstProgram, 'delete');
    });
  });

  test.describe('API outcomes', () => {
    test('Delete save returns HTTP 503', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 503-${Date.now()}`,
      );

      await mockProgramDelete503(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectErrorStateOrPageUsable(programsPage);
    });

    test('Program list returns HTTP 200 with an empty list', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockEmptyProgramList(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.exactEmptyStateMessage).toBeVisible();
      await expectPageStaysUsable(programsPage);
    });

    test('Program list returns HTTP 200 with a malformed body', { tag: '@regression' }, async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await mockProgramsListMalformedResponse(page);
      await programsPage.goto();
      await expectProgramsPageReady(programsPage);

      await expect(programsPage.programListRows()).toHaveCount(0);
      await expect(programsPage.loadErrorMessage).toBeHidden();
    });

    test('Program list or delete returns HTTP 401', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 401-${Date.now()}`,
      );

      await mockProgramDelete401(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectPageStaysUsable(programsPage);
    });

    test('Program list or delete returns HTTP 403', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 403-${Date.now()}`,
      );

      await mockProgramDelete403(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectPageStaysUsable(programsPage);
    });

    test('Program list or delete returns HTTP 404', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 404-${Date.now()}`,
      );

      await mockProgramDelete404(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectPageStaysUsable(programsPage);
    });

    test('Program list or delete returns HTTP 501', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 501-${Date.now()}`,
      );

      await mockProgramDelete501(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectErrorStateOrPageUsable(programsPage);
    });

    test('Program list or delete returns HTTP 502', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 502-${Date.now()}`,
      );

      await mockProgramDelete502(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectErrorStateOrPageUsable(programsPage);
    });

    test('Program list or delete returns HTTP 300', { tag: '@regression' }, async ({ page, trackProgram }) => {
      const programsPage = new ProgramsPage(page);
      const programName = `Test program-${Date.now()}`;

      await seedAndSelectProgramRow(
        page,
        programsPage,
        trackProgram,
        programName,
        `Delete 300-${Date.now()}`,
      );

      await mockProgramDelete300(page);
      await programsPage.deleteProgramWithDialog(programName, 'accept');

      await expect(programsPage.programRowByName(programName)).toHaveCount(1);
      await expectPageStaysUsable(programsPage);
    });
  });
});
