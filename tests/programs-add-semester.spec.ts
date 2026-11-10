import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { seedProgramWithTracking } from './support/programs-flow.helpers';

const START_DATE = '2026-09-08';
const END_DATE = '2026-12-18';

function isCreateSemesterPost(url: string, method: string) {
  return method === 'POST' && url.includes('/semesters');
}

test.describe('Add a semester to a program from the Programs page', () => {
  test('Admin adds a semester to a newly created program', { tag: '@e2e' }, async ({ page, trackProgram }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Semester Flow Program-${Date.now()}`;
    const description = `Semester flow seed-${Date.now()}`;
    const semesterName = `Fall 2026-${Date.now()}`;
    const modal = programsPage.newSemesterModal;

    await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

    await programsPage.selectProgram(programName);

    await expect(programsPage.selectedProgramHeading(programName)).toBeVisible();
    await expect(programsPage.semestersPanelSubtitle).toBeVisible();
    await expect(programsPage.noSemestersMessage).toBeVisible();

    await programsPage.openNewSemesterForm();

    await expect(modal.heading).toBeVisible();

    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const) {
      await expect(modal.weekdayCheckbox(day)).toBeChecked();
    }
    for (const day of ['Sat', 'Sun'] as const) {
      await expect(modal.weekdayCheckbox(day)).not.toBeChecked();
    }

    await expect(modal.maxSessionsPerDayField).toHaveValue('2');
    await expect(modal.maxHoursPerDayField).toHaveValue('8');
    await expect(modal.weeklyHourLimitField).toHaveValue('16');
    await expect(modal.defaultStartTimeField).toHaveValue('08:00');

    await modal.fillSemesterName(semesterName);
    await modal.fillStartDate(START_DATE);
    await modal.fillEndDate(END_DATE);

    const responsePromise = page.waitForResponse((resp) =>
      isCreateSemesterPost(resp.url(), resp.request().method()),
    );
    await modal.clickCreate();
    const createSemesterResponse = await responsePromise;
    expect(createSemesterResponse.ok()).toBe(true);

    await expect(modal.heading).toBeHidden({ timeout: 15_000 });
    await expect(programsPage.semesterNameInPanel(semesterName)).toBeVisible();
    await expect(programsPage.noSemestersMessage).toBeHidden();
  });

  test('Create Semester stays disabled until name and both dates are set, and Cancel saves nothing', { tag: '@regression' }, async ({
    page,
    trackProgram,
  }) => {
    const programsPage = new ProgramsPage(page);
    const programName = `Semester Cancel Program-${Date.now()}`;
    const description = `Semester cancel seed-${Date.now()}`;
    const semesterName = `Fall 2026-${Date.now()}`;
    const modal = programsPage.newSemesterModal;

    await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);

    await programsPage.selectProgram(programName);
    await programsPage.openNewSemesterForm();
    await expect(modal.heading).toBeVisible();

    await modal.fillSemesterName(semesterName);
    await expect(modal.createButton).toBeDisabled();

    await modal.fillStartDate(START_DATE);
    await expect(modal.createButton).toBeDisabled();

    await modal.fillEndDate(END_DATE);
    await expect(modal.createButton).toBeEnabled();

    await modal.fillSemesterName('   ');
    await expect(modal.createButton).toBeDisabled();

    await modal.clickCancel();

    await expect(modal.heading).toBeHidden({ timeout: 15_000 });
    await expect(programsPage.noSemestersMessage).toBeVisible();
  });
});
