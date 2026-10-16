import type { Locator, Page } from '@playwright/test';
import { programsUrl } from '../fixtures/didaxis.helpers';
import { EditProgramModal } from './EditProgramModal';
import { NewProgramModal } from './NewProgramModal';

export class ProgramsPage {
  readonly heading: Locator;
  readonly newProgramButton: Locator;
  readonly newProgramModal: NewProgramModal;
  readonly editProgramModal: EditProgramModal;
  readonly signInButton: Locator;
  readonly duplicateNameError: Locator;
  readonly maxLengthError: Locator;
  readonly sessionExpiredMessage: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadErrorMessage: Locator;
  readonly programNameColumnLabel: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Programs' });
    this.newProgramButton = page.getByRole('button', { name: '+ New Program' });
    this.newProgramModal = new NewProgramModal(page);
    this.editProgramModal = new EditProgramModal(page);
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.duplicateNameError = page.getByText(/duplicate|already exists|unique|name already/i);
    this.maxLengthError = page.getByText(/max(imum)? length|too long|characters/i);
    this.sessionExpiredMessage = page.getByText(/unauthorized|log in again|session expired/i);
    this.emptyStateMessage = page.getByText(/No programs yet|no programs have been created/i);
    this.loadErrorMessage = page.getByText(/error|failed|retry|unable to load/i);
    this.programNameColumnLabel = page.getByText('Program', { exact: true });
  }

  async goto(options?: { waitForNetworkIdle?: boolean }) {
    await this.page.goto(programsUrl);
    if (options?.waitForNetworkIdle) {
      await this.page.waitForLoadState('networkidle');
    }
  }

  async openNewProgramForm() {
    await this.newProgramButton.click();
  }

  programRowByName(name: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  programRowFirst(name: string): Locator {
    return this.programRowByName(name).first();
  }

  programListRows(): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('button', { name: /^Edit / }),
    });
  }

  editButton(programName: string): Locator {
    return this.programRowByName(programName).getByRole('button', { name: `Edit ${programName}` });
  }

  deleteButton(programName: string): Locator {
    return this.programRowByName(programName).getByRole('button', { name: `Delete ${programName}` });
  }

  programNameInRow(programName: string): Locator {
    return this.programRowFirst(programName).getByText(programName, { exact: true });
  }

  descriptionInProgramRow(programName: string, description: string): Locator {
    return this.programRowByName(programName).getByText(description);
  }

  descriptionInProgramRowFirst(programName: string, description: string): Locator {
    return this.programRowFirst(programName).getByText(description);
  }

  visibleText(text: string): Locator {
    return this.page.getByText(text);
  }

  async createProgram(name: string, description: string) {
    await this.openNewProgramForm();
    await this.newProgramModal.fillProgramName(name);
    await this.newProgramModal.fillDescription(description);
    await this.newProgramModal.clickCreate();
  }

  async attemptCreateProgram(
    name: string,
    description: string,
  ): Promise<{ submitted: boolean }> {
    await this.openNewProgramForm();
    await this.newProgramModal.fillProgramName(name);
    await this.newProgramModal.fillDescription(description);
    if (await this.newProgramModal.createButton.isDisabled()) {
      return { submitted: false };
    }
    await this.newProgramModal.clickCreate();
    await this.page.waitForTimeout(2_000);
    return { submitted: true };
  }

  async openEditProgram(programName: string) {
    await this.editButton(programName).click();
  }

  async deleteProgramWithDialog(
    programName: string,
    action: 'accept' | 'dismiss',
  ): Promise<{ message: string; type: string }> {
    const row = this.programRowFirst(programName);
    await row.scrollIntoViewIfNeeded();

    const [dialogResult] = await Promise.all([
      this.page.waitForEvent('dialog').then(async (dialog) => {
        const result = { message: dialog.message(), type: dialog.type() };
        if (action === 'accept') {
          await dialog.accept();
        } else {
          await dialog.dismiss();
        }
        return result;
      }),
      this.deleteButton(programName).click(),
    ]);

    return dialogResult;
  }
}
