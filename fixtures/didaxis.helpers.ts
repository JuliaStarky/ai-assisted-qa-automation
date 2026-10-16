import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';

export const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
export const loginUrl = `${baseUrl}/login`;
export const programsUrl = `${baseUrl}/programs`;

export async function goToPrograms(page: Page): Promise<ProgramsPage> {
  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  return programsPage;
}

export async function signIn(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(email, password);
}
