import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { goToPrograms, signIn } from '../fixtures/didaxis.helpers';

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

  await signIn(page, email, password);
  await goToPrograms(page);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
