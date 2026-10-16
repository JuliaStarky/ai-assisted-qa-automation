import type { Locator, Page } from '@playwright/test';

export class EditProgramModal {
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly totalProgramHours: Locator;
  readonly defaultSessionHours: Locator;
  readonly defaultExamHours: Locator;
  readonly targetAudience: Locator;
  readonly focusAreas: Locator;
  readonly showAiGenerationConfigButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'Edit Program' }),
    });
    this.heading = this.dialog.getByRole('heading', { name: 'Edit Program' });
    this.programNameField = this.dialog.getByRole('textbox', { name: 'Program Name' });
    this.descriptionField = this.dialog.getByRole('textbox', { name: 'Description' });
    this.totalProgramHours = this.dialog.getByLabel('Total Program Hours');
    this.defaultSessionHours = this.dialog.getByLabel('Default Session Hours');
    this.defaultExamHours = this.dialog.getByLabel('Default Exam Hours');
    this.targetAudience = this.dialog.getByLabel('Target Audience');
    this.focusAreas = this.dialog.getByLabel('Focus Areas');
    this.showAiGenerationConfigButton = this.dialog.getByRole('button', {
      name: '▸ Show AI Generation Config',
    });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
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

  async clickSave() {
    await this.saveButton.click();
  }

  async doubleClickSave() {
    await this.saveButton.dblclick();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}
