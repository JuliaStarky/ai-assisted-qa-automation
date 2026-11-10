import { expect, type Page } from '@playwright/test';
import type { TrackProgram } from '../../fixtures/cleanup.fixture';
import { ProgramsPage } from '../../pages/ProgramsPage';

export function waitForProgramsListGet(page: Page, status?: number) {
  return page.waitForResponse((resp) => {
    const isListGet =
      new URL(resp.url()).pathname === '/api/programs' && resp.request().method() === 'GET';
    return isListGet && (status === undefined || resp.status() === status);
  });
}

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

export async function mockProgramsListStatus(page: Page, status: number) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: `HTTP ${status}` }),
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

export async function mockProgramPatchStatus(page: Page, status: number) {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() === 'PATCH') {
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

export async function mockProgramsPostServiceUnavailable(page: Page) {
  await mockProgramsPostStatus(page, 503);
}

export async function mockProgramsPostUnauthorized(page: Page) {
  await mockProgramsPostStatus(page, 401);
}

export async function mockProgramsPostForbidden(page: Page) {
  await mockProgramsPostStatus(page, 403);
}

export async function mockProgramsPostNotFound(page: Page) {
  await mockProgramsPostStatus(page, 404);
}

export async function mockProgramsPostNotImplemented(page: Page) {
  await mockProgramsPostStatus(page, 501);
}

export async function mockProgramsPostBadGateway(page: Page) {
  await mockProgramsPostStatus(page, 502);
}

export async function mockProgramsPostMultipleChoices(page: Page) {
  await mockProgramsPostStatus(page, 300);
}

export async function mockProgramPatchUnauthorized(page: Page) {
  await mockProgramPatchStatus(page, 401);
}

export type ProgramApiRecord = {
  id: string;
  name: string;
  description?: string | null;
  total_hours?: number | null;
  default_session_hours?: number | null;
  default_exam_hours?: number | null;
  target_audience?: string | null;
  focus_areas?: string | null;
  sync_async_ratio?: number | null;
};

export async function seedProgramWithTrackingAndCaptureCreateData(
  page: Page,
  programsPage: ProgramsPage,
  name: string,
  description: string,
  trackProgram: TrackProgram,
) {
  await programsPage.goto();
  await expectProgramsPageReady(programsPage);
  await programsPage.openNewProgramForm();
  await programsPage.newProgramModal.fillProgramName(name);
  await programsPage.newProgramModal.fillDescription(description);
  const responsePromise = page.waitForResponse((resp) =>
    isCreateProgramPost(resp.url(), resp.request().method()),
  );
  await programsPage.newProgramModal.clickCreate();
  const response = await responsePromise;
  await expectNewProgramModalClosed(programsPage);
  const body = (await response.json()) as { data?: ProgramApiRecord };
  const data = body.data;
  if (!data?.id) {
    throw new Error('Create program response missing data.id');
  }
  trackProgram(data.id);
  await expect(programsPage.programRowByName(name)).toHaveCount(1);
  return data;
}

export async function expectFailedSaveKeepsEditProgramFormOpen(
  programsPage: ProgramsPage,
  editedProgramName: string,
  originalProgramName: string,
) {
  await expect(programsPage.editProgramModal.heading).toBeVisible();
  await expect(programsPage.editProgramModal.programNameField).toHaveValue(editedProgramName);
  await expect(programsPage.editProgramModal.saveButton).toBeEnabled();
  await expect(programsPage.programRowByName(originalProgramName)).toHaveCount(1);
  await expect(programsPage.programRowByName(editedProgramName)).toHaveCount(0);
}

export async function mockProgramDeleteStatus(page: Page, status: number) {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: `HTTP ${status}` }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramDeleteServerError(page: Page) {
  await mockProgramDeleteStatus(page, 500);
}

export function isProgramDeleteRequest(url: string, method: string) {
  return url.includes('/api/programs') && method === 'DELETE';
}

export async function mockProgramDeleteHttpStatus(page: Page, status: number) {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Delete request failed' }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramDeleteWithStatus(page: Page, status: number) {
  await mockProgramDeleteHttpStatus(page, status);
}

export async function mockProgramDeleteServiceUnavailable(page: Page) {
  await mockProgramDeleteHttpStatus(page, 503);
}

export async function mockProgramDeleteUnauthorized(page: Page) {
  await mockProgramDeleteHttpStatus(page, 401);
}

export async function mockProgramDeleteForbidden(page: Page) {
  await mockProgramDeleteHttpStatus(page, 403);
}

export async function mockProgramDeleteNotFound(page: Page) {
  await mockProgramDeleteHttpStatus(page, 404);
}

export async function mockProgramDeleteNotImplemented(page: Page) {
  await mockProgramDeleteHttpStatus(page, 501);
}

export async function mockProgramDeleteBadGateway(page: Page) {
  await mockProgramDeleteHttpStatus(page, 502);
}

export async function mockProgramDeleteMultipleChoices(page: Page) {
  await mockProgramDeleteHttpStatus(page, 300);
}

export async function mockProgramDelete503(page: Page) {
  await mockProgramDeleteHttpStatus(page, 503);
}

export async function mockProgramDelete401(page: Page) {
  await mockProgramDeleteHttpStatus(page, 401);
}

export async function mockProgramDelete403(page: Page) {
  await mockProgramDeleteHttpStatus(page, 403);
}

export async function mockProgramDelete404(page: Page) {
  await mockProgramDeleteHttpStatus(page, 404);
}

export async function mockProgramDelete501(page: Page) {
  await mockProgramDeleteHttpStatus(page, 501);
}

export async function mockProgramDelete502(page: Page) {
  await mockProgramDeleteHttpStatus(page, 502);
}

export async function mockProgramDelete300(page: Page) {
  await mockProgramDeleteHttpStatus(page, 300);
}

export function isCreateProgramPost(url: string, method: string) {
  return url.includes('/api/programs') && method === 'POST';
}

export function isProgramPatch(url: string, method: string) {
  if (method !== 'PATCH') {
    return false;
  }
  const path = url.includes('://') ? new URL(url).pathname : url.split('?')[0] ?? url;
  return /^\/api\/programs\/[^/]+$/.test(path);
}

export async function clickSaveAndWaitForPatchResponse(
  page: Page,
  programsPage: ProgramsPage,
) {
  const responsePromise = page.waitForResponse((resp) =>
    isProgramPatch(resp.url(), resp.request().method()),
  );
  await programsPage.editProgramModal.clickSave();
  return responsePromise;
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

export async function expectNoErrorAlertShown(programsPage: ProgramsPage) {
  await expect(programsPage.errorAlert).toHaveCount(0);
}

export function trackCreateProgramPostRequests(page: Page) {
  let postCount = 0;
  const onRequest = (request: { url: () => string; method: () => string }) => {
    if (isCreateProgramPost(request.url(), request.method())) {
      postCount += 1;
    }
  };
  page.on('request', onRequest);
  return {
    getPostCount: () => postCount,
    stop: () => page.off('request', onRequest),
  };
}

export async function expectFailedSaveKeepsNewProgramFormOpenWithNoError(
  programsPage: ProgramsPage,
  programName: string,
) {
  await expectFailedSaveKeepsNewProgramFormOpen(programsPage, programName);
  await expectNoErrorAlertShown(programsPage);
}

export async function gotoProgramsAndOpenNewProgramForm(page: Page) {
  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  await expectProgramsPageReady(programsPage);
  await programsPage.openNewProgramForm();
  return programsPage;
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
