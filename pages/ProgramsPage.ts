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
    // Avoid /max(imum)? length/ — it matches the TC-011 fixture text "Over max length".
    this.maxLengthError = this.newProgramModal.dialog.getByText(
      /maximum length|too long|character limit|must be at most/i,
    );
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

  async reload() {
    await this.page.reload();
  }

  async openNewProgramForm() {
    await this.newProgramButton.click();
  }

  async tabToNewProgramButton(maxTabs = 40) {
    for (let i = 0; i < maxTabs; i++) {
      const focused = await this.newProgramButton.evaluate(
        (button) => button === document.activeElement,
      );
      if (focused) {
        return;
      }
      await this.page.keyboard.press('Tab');
    }
    throw new Error(`Could not reach "+ New Program" via keyboard within ${maxTabs} Tab presses`);
  }

  async activateFocusedControlWithKeyboard() {
    await this.page.keyboard.press('Enter');
  }

  programRowByName(name: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  programRowByNameAndDescription(name: string, description: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByText(name, { exact: true }),
    }).filter({
      has: this.page.getByText(description),
    });
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

  programNameInRow(programName: string, description?: string): Locator {
    const row = description
      ? this.programRowByNameAndDescription(programName, description)
      : this.programRowByName(programName);
    return row.getByText(programName, { exact: true });
  }

  descriptionInProgramRow(programName: string, description: string): Locator {
    return this.programRowByNameAndDescription(programName, description).getByText(description);
  }

  visibleText(text: string): Locator {
    return this.page.getByText(text);
  }

  createSessionExpiredFeedback(): Locator {
    return this.signInButton.or(this.sessionExpiredMessage).or(this.newProgramModal.heading);
  }

  editSessionExpiredFeedback(): Locator {
    return this.signInButton.or(this.sessionExpiredMessage).or(this.editProgramModal.heading);
  }

  overlongProgramNameBlockedIndicator(): Locator {
    return this.maxLengthError
      .or(this.newProgramModal.heading)
      .or(this.page.getByRole('button', { name: 'Create', exact: true, disabled: true }));
  }

  tabCharacterNameOutcomeIndicator(programName: string): Locator {
    const spacedName = programName.replace('\t', ' ');
    return this.programRowByName(programName)
      .or(this.programRowByName(spacedName))
      .or(this.newProgramModal.heading)
      .or(this.page.getByRole('button', { name: 'Create', exact: true, disabled: true }));
  }

  async createProgram(name: string, description: string) {
    await this.openNewProgramForm();
    await this.newProgramModal.fillProgramName(name);
    await this.newProgramModal.fillDescription(description);
    await this.newProgramModal.clickCreate();
  }

  async trySubmitNewProgramForm() {
    const createButton = this.newProgramModal.createButton;
    if (await createButton.isEnabled()) {
      await createButton.click();
    }
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
    return { submitted: true };
  }

  async openEditProgram(programName: string) {
    await this.editButton(programName).click();
  }

  async deleteProgramWithDialog(
    programName: string,
    action: 'accept' | 'dismiss',
  ): Promise<{ message: string; type: string }> {
    const row = this.programRowByName(programName);
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
