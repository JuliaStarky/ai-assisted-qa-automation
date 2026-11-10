import { expect, type Page, type Request } from '@playwright/test';
import type { ProgramsPage } from '../../pages/ProgramsPage';
import { isCreateProgramPost } from './programs-flow.helpers';

export function uniqueTestSuffix(parallelIndex: number): string {
  return `${Date.now()}-w${parallelIndex}`;
}

export function programNameOfExactLength(length: number, suffix: string): string {
  const name = `${'N'.repeat(length - suffix.length)}${suffix}`;
  expect(name).toHaveLength(length);
  return name;
}

export async function mockProgramsListStatus(page: Page, status: number) {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() === 'GET') {
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

export async function gotoProgramsAndAwaitListResponse(
  page: Page,
  programsPage: ProgramsPage,
) {
  const listResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/programs') && resp.request().method() === 'GET',
  );
  await programsPage.goto();
  await listResponsePromise;
}

export async function expectNoCreatePostSent(page: Page, action: () => Promise<void>) {
  let postCount = 0;
  const listener = (request: Request) => {
    if (isCreateProgramPost(request.url(), request.method())) {
      postCount += 1;
    }
  };
  page.on('request', listener);
  try {
    await action();
    await expect.poll(() => postCount).toBe(0);
  } finally {
    page.off('request', listener);
  }
}

export async function expectNoPageAlerts(programsPage: ProgramsPage) {
  await expect(programsPage.pageAlerts).toHaveCount(0);
}
