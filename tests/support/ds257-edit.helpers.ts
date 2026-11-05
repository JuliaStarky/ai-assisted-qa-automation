import { expect, type Page } from '@playwright/test';
import type { TrackProgram } from '../../fixtures/cleanup.fixture';
import { ProgramsPage } from '../../pages/ProgramsPage';
import {
  expectEditProgramModalClosed,
  expectProgramsPageReady,
  seedProgramWithTracking,
} from './programs-flow.helpers';

export function isProgramListGet(url: string, method: string): boolean {
  if (method !== 'GET') {
    return false;
  }
  try {
    const pathname = new URL(url).pathname;
    return pathname === '/api/programs' || pathname.endsWith('/api/programs');
  } catch {
    return url.includes('/api/programs') && !url.match(/\/api\/programs\/[^/?]+/);
  }
}

export function isProgramPatch(url: string, method: string): boolean {
  return method === 'PATCH' && /\/api\/programs\/[^/?]+/.test(url);
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

export async function mockProgramsListGetStatus(page: Page, status: number) {
  await page.route('**/api/programs', async (route) => {
    if (isProgramListGet(route.request().url(), route.request().method())) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error' }),
      });
      return;
    }
    await route.continue();
  });
}

export async function mockProgramsListMalformedBody(page: Page) {
  await page.route('**/api/programs', async (route) => {
    if (isProgramListGet(route.request().url(), route.request().method())) {
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

export async function seedProgramAndOpenEdit(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
  description: string,
  trackProgram: TrackProgram,
) {
  await seedProgramWithTracking(page, programsPage, programName, description, trackProgram);
  await programsPage.openEditProgram(programName);
  await expect(programsPage.editProgramModal.heading).toBeVisible();
}

export async function expectEditFailedSilently(
  programsPage: ProgramsPage,
  programName: string,
  originalDescription: string,
) {
  await expect(programsPage.editProgramModal.heading).toBeVisible({ timeout: 15_000 });
  await expect(programsPage.pageAlerts).toHaveCount(0);
  await expect(
    programsPage.descriptionInProgramRow(programName, originalDescription),
  ).toBeVisible();
}

export async function navigateProgramsAndAwaitListGet(page: Page, programsPage: ProgramsPage) {
  const listResponsePromise = page.waitForResponse((response) =>
    isProgramListGet(response.url(), response.request().method()),
  );
  await programsPage.goto();
  await listResponsePromise;
  await expectProgramsPageReady(programsPage);
}

export async function waitForProgramPatch(page: Page) {
  return page.waitForResponse((response) =>
    isProgramPatch(response.url(), response.request().method()),
  );
}

export { expectEditProgramModalClosed, expectProgramsPageReady };
