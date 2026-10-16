import type { Locator, Page } from '@playwright/test';

const TODO_MVC_URL = 'https://demo.playwright.dev/todomvc/#/';

export class TodoMvcPage {
  readonly newTodoInput: Locator;
  readonly todoCount: Locator;
  readonly todoItems: Locator;
  readonly markAllCompleteCheckbox: Locator;
  readonly clearCompletedButton: Locator;
  readonly emptyStateHint: Locator;

  constructor(private readonly page: Page) {
    this.newTodoInput = page.getByRole('textbox', { name: 'What needs to be done?' });
    this.todoCount = page.getByText(/\d+ items? left/);
    this.todoItems = page.getByRole('listitem');
    this.markAllCompleteCheckbox = page.getByRole('checkbox', { name: 'Mark all as complete' });
    this.clearCompletedButton = page.getByRole('button', { name: 'Clear completed' });
    this.emptyStateHint = page.getByText('Double-click to edit a todo');
  }

  filterLink(name: 'All' | 'Active' | 'Completed'): Locator {
    return this.page.getByRole('link', { name });
  }

  todoRowByTitle(title: string): Locator {
    return this.todoItems.filter({
      has: this.page.getByText(title, { exact: true }),
    });
  }

  toggleTodo(title: string): Locator {
    return this.todoRowByTitle(title).getByRole('checkbox', { name: 'Toggle Todo' });
  }

  async openEmptyApp() {
    await this.page.goto(TODO_MVC_URL);
    await this.page.evaluate(() => localStorage.removeItem('react-todos'));
    await this.page.reload();
  }

  async reload() {
    await this.page.reload();
  }

  async addTodo(title: string) {
    await this.newTodoInput.fill(title);
    await this.newTodoInput.press('Enter');
  }

  async clickNewTodoInput() {
    await this.newTodoInput.click();
  }

  async deleteTodo(title: string) {
    const row = this.todoRowByTitle(title);
    await row.hover();
    await row.getByRole('button', { name: 'Delete' }).click();
  }

  async markAllComplete() {
    await this.markAllCompleteCheckbox.click();
  }

  async clearCompleted() {
    await this.clearCompletedButton.click();
  }

  async openFilter(name: 'All' | 'Active' | 'Completed') {
    await this.filterLink(name).click();
  }

  async readStoredTodos(): Promise<Array<{ id: string; title: string; completed: boolean }>> {
    const raw = await this.page.evaluate(() => localStorage.getItem('react-todos'));
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as Array<{ id: string; title: string; completed: boolean }>;
  }
}
