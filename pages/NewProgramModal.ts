import type { Locator, Page } from '@playwright/test';

export class NewProgramModal {
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'New Program' }),
    });
    this.heading = this.dialog.getByRole('heading', { name: 'New Program' });
    this.programNameField = this.dialog.getByRole('textbox', { name: 'Program Name' });
    this.descriptionField = this.dialog.getByRole('textbox', { name: 'Description' });
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Maps the dialog root to an axe-core `.include()` selector (axe expects CSS, not Playwright locators). */
  async axeIncludeSelector(): Promise<string> {
    return this.dialog.evaluate((element) => {
      element.setAttribute('data-axe-include-root', 'true');
      return '[data-axe-include-root="true"]';
    });
  }

  async fillProgramName(name: string) {
    await this.programNameField.fill(name);
  }

  async fillDescription(description: string) {
    await this.descriptionField.fill(description);
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async doubleClickCreate() {
    await this.createButton.dblclick();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}
