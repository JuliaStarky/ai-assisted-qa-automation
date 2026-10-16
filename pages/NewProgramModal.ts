import type { Locator, Page } from '@playwright/test';

export class NewProgramModal {
  readonly heading: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    const modal = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'New Program' }),
    });
    this.heading = modal.getByRole('heading', { name: 'New Program' });
    this.programNameField = modal.getByRole('textbox', { name: 'Program Name' });
    this.descriptionField = modal.getByRole('textbox', { name: 'Description' });
    this.createButton = modal.getByRole('button', { name: 'Create', exact: true });
    this.cancelButton = modal.getByRole('button', { name: 'Cancel', exact: true });
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
