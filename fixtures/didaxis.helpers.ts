import { expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';

export const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
export const loginUrl = `${baseUrl}/login`;
export const programsUrl = `${baseUrl}/programs`;

export async function goToPrograms(page: Page) {
  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  await expect(programsPage.heading).toBeVisible();
  await expect(programsPage.newProgramButton).toBeVisible();
}

export async function signIn(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(email, password);
}
