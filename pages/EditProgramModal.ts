import type { Locator, Page } from '@playwright/test';

export class EditProgramModal {
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
    this.heading = page.getByRole('heading', { name: 'Edit Program' });
    this.programNameField = page.getByRole('textbox', { name: 'Program Name' });
    this.descriptionField = page.getByRole('textbox', { name: 'Description' });
    this.totalProgramHours = page.getByLabel('Total Program Hours');
    this.defaultSessionHours = page.getByLabel('Default Session Hours');
    this.defaultExamHours = page.getByLabel('Default Exam Hours');
    this.targetAudience = page.getByLabel('Target Audience');
    this.focusAreas = page.getByLabel('Focus Areas');
    this.showAiGenerationConfigButton = page.getByRole('button', {
      name: '▸ Show AI Generation Config',
    });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
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
