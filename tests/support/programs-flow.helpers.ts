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

export async function mockProgramsListServerError(page: Page) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramsListMalformedResponse(page: Page) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'not-json',
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramsPostStatus(page: Page, status: number) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          message: status === 401 ? 'Unauthorized' : 'Error',
        }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramsPostUnauthorized(page: Page) {
  await mockProgramsPostStatus(page, 401);
}

export async function mockProgramPatchUnauthorized(page: Page) {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramDeleteServerError(page: Page) {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
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

export async function clickCreateAndWaitForPostResponse(
  page: Page,
  programsPage: ProgramsPage,
) {
  const responsePromise = page.waitForResponse((resp) =>
    isCreateProgramPost(resp.url(), resp.request().method()),
  );
  await programsPage.newProgramModal.clickCreate();
  return responsePromise;
}

export async function expectFailedSaveKeepsNewProgramFormOpen(
  programsPage: ProgramsPage,
  programName: string,
) {
  await expect(programsPage.newProgramModal.heading).toBeVisible();
  await expect(programsPage.newProgramModal.programNameField).toHaveValue(programName);
  await expect(programsPage.newProgramModal.createButton).toBeEnabled();
  await expect(programsPage.programRowByName(programName)).toHaveCount(0);
}

export async function createProgramWithTracking(
  page: Page,
  programsPage: ProgramsPage,
  name: string,
  description: string,
  trackProgram: TrackProgram,
) {
  await programsPage.openNewProgramForm();
  await programsPage.newProgramModal.fillProgramName(name);
  await programsPage.newProgramModal.fillDescription(description);
  const responsePromise = clickCreateAndWaitForPostResponse(page, programsPage);
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
