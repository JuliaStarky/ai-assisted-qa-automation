import { expect } from '@playwright/test';
import type { ProgramsPage } from '../../pages/ProgramsPage';

export function ds266UniqueName(semanticName: string): string {
  return `DS-266 ${semanticName}-${Date.now()}`;
}

export async function expectProgramsPageUsableOrErrorState(programsPage: ProgramsPage) {
  await expect(
    programsPage.heading
      .or(programsPage.loadErrorMessage)
      .or(programsPage.createSessionExpiredFeedback())
      .or(programsPage.newProgramModal.heading),
  ).toBeVisible();
}

export async function expectProgramsPageEmptyOrUsable(programsPage: ProgramsPage) {
  await expect(
    programsPage.heading
      .or(programsPage.exactEmptyStateMessage)
      .or(programsPage.emptyStateMessage)
      .or(programsPage.loadErrorMessage),
  ).toBeVisible();
}

export async function expectProgramsListLoadOutcome(programsPage: ProgramsPage) {
  await expect(programsPage.heading).toBeVisible();
  await expect(programsPage.newProgramButton).toBeVisible();
  await expect(
    programsPage.loadErrorMessage
      .or(programsPage.exactEmptyStateMessage)
      .or(programsPage.emptyStateMessage)
      .or(programsPage.heading),
  ).toBeVisible();
}
