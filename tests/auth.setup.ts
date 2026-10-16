import { expect, test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

function adminCredentials(): { email: string; password: string } {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  if (!email || !password) {
    throw new Error('Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');
  }
  return { email, password };
}

setup('authenticate', async ({ page }) => {
  const { email, password } = adminCredentials();

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(email, password);

  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  await expect(programsPage.heading).toBeVisible();
  await expect(programsPage.newProgramButton).toBeVisible();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
