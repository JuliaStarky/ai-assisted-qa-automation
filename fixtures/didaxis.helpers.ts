import { expect, type Page } from '@playwright/test';

export const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
export const loginUrl = `${baseUrl}/login`;
export const programsUrl = `${baseUrl}/programs`;

export async function goToPrograms(page: Page) {
  await page.goto(programsUrl);
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto(loginUrl);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}
