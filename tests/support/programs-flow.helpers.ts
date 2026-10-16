import { expect, type Page } from '@playwright/test';
import type { TrackProgram } from '../../fixtures/cleanup.fixture';
import { ProgramsPage } from '../../pages/ProgramsPage';

export async function mockEmptyProgramList(page: Page) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }
    await route.continue();
  });
}

export function isCreateProgramPost(url: string, method: string) {
  return url.includes('/api/programs') && method === 'POST';
}

export async function expectProgramsPageReady(programsPage: ProgramsPage) {
  await expect(programsPage.heading).toBeVisible();
  await expect(programsPage.newProgramButton).toBeVisible();
}

export async function expectNewProgramModalClosed(programsPage: ProgramsPage) {
  await expect(programsPage.newProgramModal.heading).toBeHidden({ timeout: 15_000 });
}

export async function expectEditProgramModalClosed(programsPage: ProgramsPage) {
  await expect(programsPage.editProgramModal.heading).toBeHidden({ timeout: 15_000 });
}

export async function seedProgram(
  page: Page,
  programsPage: ProgramsPage,
  name: string,
  description: string,
  options?: { waitForNetworkIdle?: boolean },
) {
  await programsPage.goto(options);
  await expectProgramsPageReady(programsPage);
  await programsPage.createProgram(name, description);
  await expectNewProgramModalClosed(programsPage);
  await expect(programsPage.programRowByName(name)).toHaveCount(1);
}

export async function trackProgramFromCreateResponse(
  responsePromise: Promise<Awaited<ReturnType<Page['waitForResponse']>>>,
  trackProgram: TrackProgram,
) {
  const response = await responsePromise;
  if (!response.ok()) {
    return;
  }
  const body = (await response.json()) as { data?: { id?: string } };
  const id = body.data?.id;
  if (id) {
    trackProgram(id);
  }
}

export async function createProgramWithTracking(
  page: Page,
  programsPage: ProgramsPage,
  name: string,
  description: string,
  trackProgram: TrackProgram,
) {
  const responsePromise = page.waitForResponse((resp) =>
    isCreateProgramPost(resp.url(), resp.request().method()),
  );
  await programsPage.createProgram(name, description);
  await expectNewProgramModalClosed(programsPage);
  await trackProgramFromCreateResponse(responsePromise, trackProgram);
}

export async function seedProgramWithTracking(
  page: Page,
  programsPage: ProgramsPage,
  name: string,
  description: string,
  trackProgram: TrackProgram,
  options?: { waitForNetworkIdle?: boolean },
) {
  await programsPage.goto(options);
  await expectProgramsPageReady(programsPage);
  await createProgramWithTracking(page, programsPage, name, description, trackProgram);
  await expect(programsPage.programRowByName(name)).toHaveCount(1);
}
