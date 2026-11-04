import type { Dialog, Locator, Page } from '@playwright/test';
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
  readonly exactEmptyStateMessage: Locator;
  readonly emptyStateCreateProgramButton: Locator;
  readonly subtitle: Locator;
  readonly loadErrorMessage: Locator;
  readonly programNameColumnLabel: Locator;
  readonly programTableColumnHeader: Locator;

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
    this.exactEmptyStateMessage = page.getByText(
      'No programs yet. Create your first program to get started.',
      { exact: true },
    );
    this.emptyStateCreateProgramButton = page.getByRole('button', { name: 'Create Program' });
    this.subtitle = page.getByText('Manage academic programs and semesters');
    this.loadErrorMessage = page.getByText(/error|failed|retry|unable to load/i);
    this.programNameColumnLabel = page.getByText('Program', { exact: true });
    this.programTableColumnHeader = page.getByRole('columnheader', { name: 'Program' });
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

  async openCreateProgramFromEmptyState() {
    await this.emptyStateCreateProgramButton.click();
  }

  firstProgramListRow(): Locator {
    return this.programListRows().nth(0);
  }

  async scrollProgramRowIntoView(programName: string) {
    await this.programRowByName(programName).scrollIntoViewIfNeeded();
  }

  async programRowBoundingBox(programName: string) {
    return this.programRowByName(programName).boundingBox();
  }

  injectedImageInProgramRow(programName: string, description: string): Locator {
    return this.programRowByName(programName)
      .getByRole('cell')
      .filter({ hasText: description })
      .getByRole('img');
  }

  textInProgramRow(programName: string, text: string): Locator {
    return this.programRowByName(programName).getByText(text);
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

  private async activateDeleteControl(
    programName: string,
    activation: 'singleClick' | 'doubleClick' | 'tripleClick',
  ) {
    await this.programRowByName(programName).scrollIntoViewIfNeeded();
    const button = this.deleteButton(programName);
    if (activation === 'singleClick') {
      await button.click();
      return;
    }
    if (activation === 'doubleClick') {
      await button.dblclick();
      return;
    }
    await button.click({ clickCount: 3 });
  }

  private async pollUntilDialogEventsQuiescent(
    readCount: () => number,
    minimumDialogs: number,
    stableMs = 500,
    timeoutMs = 8000,
  ) {
    const start = Date.now();
    let lastCount = 0;
    let stableSince = Date.now();

    while (Date.now() - start < timeoutMs) {
      const count = readCount();
      if (count >= minimumDialogs) {
        if (count !== lastCount) {
          lastCount = count;
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= stableMs) {
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async recordDeleteConfirmationDialogs(
    programName: string,
    activation: 'singleClick' | 'doubleClick' | 'tripleClick',
    resolveMode: 'dismiss-each' | 'accept-first-dismiss-rest',
  ): Promise<{ dialogCount: number; messages: string[]; types: string[] }> {
    const messages: string[] = [];
    const types: string[] = [];
    let handledCount = 0;

    const handler = async (dialog: Dialog) => {
      messages.push(dialog.message());
      types.push(dialog.type());
      handledCount += 1;
      if (resolveMode === 'accept-first-dismiss-rest' && handledCount === 1) {
        await dialog.accept();
        return;
      }
      await dialog.dismiss();
    };

    this.page.on('dialog', handler);
    try {
      await this.activateDeleteControl(programName, activation);
      await this.pollUntilDialogEventsQuiescent(() => messages.length, 1);
    } finally {
      this.page.off('dialog', handler);
    }

    return { dialogCount: messages.length, messages, types };
  }

  async doubleClickDeleteRecordDialogs(
    programName: string,
    resolveMode: 'dismiss-each' | 'accept-first-dismiss-rest',
  ) {
    return this.recordDeleteConfirmationDialogs(programName, 'doubleClick', resolveMode);
  }

  async singleClickDeleteRecordDialogs(programName: string) {
    return this.recordDeleteConfirmationDialogs(programName, 'singleClick', 'dismiss-each');
  }

  async tripleClickDeleteRecordDialogs(programName: string) {
    return this.recordDeleteConfirmationDialogs(programName, 'tripleClick', 'dismiss-each');
  }

  async waitForNoFurtherNativeDialog(graceMs = 750) {
    try {
      await this.page.waitForEvent('dialog', { timeout: graceMs });
      throw new Error('Unexpected native dialog appeared');
    } catch (error) {
      if (error instanceof Error && error.message === 'Unexpected native dialog appeared') {
        throw error;
      }
    }
  }
}
