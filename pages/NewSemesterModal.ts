import type { Locator, Page } from '@playwright/test';

export class NewSemesterModal {
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly semesterNameField: Locator;
  readonly startDateField: Locator;
  readonly endDateField: Locator;
  readonly allowedWeekdaysGroup: Locator;
  readonly maxSessionsPerDayField: Locator;
  readonly maxHoursPerDayField: Locator;
  readonly weeklyHourLimitField: Locator;
  readonly defaultStartTimeField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'New Semester' }),
    });
    this.heading = this.dialog.getByRole('heading', { name: 'New Semester' });
    this.semesterNameField = this.dialog.getByRole('textbox', { name: 'Semester Name' });
    this.startDateField = this.dialog.getByLabel('Start Date');
    this.endDateField = this.dialog.getByLabel('End Date');
    this.allowedWeekdaysGroup = this.dialog.getByRole('group', { name: 'Allowed Weekdays' });
    this.maxSessionsPerDayField = this.dialog.getByRole('textbox', { name: 'Max Sessions/Day' });
    this.maxHoursPerDayField = this.dialog.getByRole('textbox', { name: 'Max Hours/Day' });
    this.weeklyHourLimitField = this.dialog.getByRole('textbox', { name: 'Weekly Hour Limit' });
    this.defaultStartTimeField = this.dialog.getByLabel('Default Start Time');
    this.createButton = this.dialog.getByRole('button', { name: 'Create Semester' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
  }

  weekdayCheckbox(day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'): Locator {
    return this.allowedWeekdaysGroup.getByRole('checkbox', { name: day });
  }

  async fillSemesterName(name: string) {
    await this.semesterNameField.fill(name);
  }

  async fillStartDate(isoDate: string) {
    await this.startDateField.fill(isoDate);
  }

  async fillEndDate(isoDate: string) {
    await this.endDateField.fill(isoDate);
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}
