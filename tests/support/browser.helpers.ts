import type { Page } from '@playwright/test';

export async function runWithNativeDialogWatcher(
  page: Page,
  action: () => Promise<void>,
): Promise<boolean> {
  let dialogShown = false;
  const onDialog = () => {
    dialogShown = true;
  };
  page.on('dialog', onDialog);
  try {
    await action();
  } finally {
    page.off('dialog', onDialog);
  }
  return dialogShown;
}
