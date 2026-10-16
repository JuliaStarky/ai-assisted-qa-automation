import { test, expect } from '@playwright/test';
import { TodoMvcPage } from '../pages/TodoMvcPage';
import { runWithNativeDialogWatcher } from './support/browser.helpers';

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.openEmptyApp();
  });

  test('TC-001 — New todo appears in the list after valid entry', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.clickNewTodoInput();
    await todoPage.addTodo('Buy milk');

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveCount(1);
    await expect(todoPage.newTodoInput).toHaveValue('');
    await expect(todoPage.newTodoInput).toBeFocused();
    await expect(todoPage.todoCount).toHaveText('1 item left');
    await expect(todoPage.filterLink('All')).toBeVisible();
    await expect(todoPage.filterLink('Active')).toBeVisible();
    await expect(todoPage.filterLink('Completed')).toBeVisible();
    await expect(todoPage.markAllCompleteCheckbox).toBeVisible();

    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Buy milk');
    expect(stored[0].completed).toBe(false);
  });

  test('TC-002 — Multiple todos can be added in sequence', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Walk the dog');
    await todoPage.addTodo('Pay bills');

    await expect(todoPage.todoRowByTitle('Walk the dog')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Pay bills')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('2 items left');
    await expect(todoPage.todoItems.getByRole('checkbox', { name: 'Toggle Todo' })).toHaveCount(2);
    await expect(todoPage.toggleTodo('Walk the dog')).not.toBeChecked();
  });

  test('TC-003 — Todo is marked completed when its toggle is used', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.toggleTodo('Buy milk').click();

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveClass(/completed/);
    await expect(todoPage.todoCount).toHaveText('0 items left');
    await expect(todoPage.clearCompletedButton).toBeVisible();
    await expect(todoPage.todoRowByTitle('Buy milk')).toBeVisible();

    const stored = await todoPage.readStoredTodos();
    expect(stored[0].completed).toBe(true);
  });

  test('TC-004 — Completed todo can be toggled back to active', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    const toggle = todoPage.toggleTodo('Buy milk');
    await toggle.click();
    await toggle.click();

    await expect(todoPage.todoRowByTitle('Buy milk')).not.toHaveClass(/completed/);
    await expect(todoPage.todoCount).toHaveText('1 item left');
    await expect(todoPage.clearCompletedButton).toHaveCount(0);

    const stored = await todoPage.readStoredTodos();
    expect(stored[0].completed).toBe(false);
  });

  test('TC-005 — Mark all as complete completes every active todo', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Walk the dog');
    await todoPage.addTodo('Pay bills');
    await todoPage.markAllComplete();

    await expect(todoPage.todoRowByTitle('Walk the dog')).toHaveClass(/completed/);
    await expect(todoPage.todoRowByTitle('Pay bills')).toHaveClass(/completed/);
    await expect(todoPage.todoCount).toHaveText('0 items left');
    await expect(todoPage.clearCompletedButton).toBeVisible();

    const stored = await todoPage.readStoredTodos();
    expect(stored.every((todo) => todo.completed)).toBe(true);
  });

  test('TC-006 — Todo is removed from the list when Delete is used', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.deleteTodo('Buy milk');

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveCount(0);
    await expect(todoPage.todoCount).toHaveCount(0);
    await expect(todoPage.filterLink('All')).toHaveCount(0);
    await expect(todoPage.newTodoInput).toBeVisible();
    await expect(todoPage.emptyStateHint).toBeVisible();

    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(0);
  });

  test('TC-007 — Clear completed removes only completed todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Walk the dog');
    await todoPage.addTodo('Pay bills');
    await todoPage.toggleTodo('Pay bills').click();
    await todoPage.clearCompleted();

    await expect(todoPage.todoRowByTitle('Pay bills')).toHaveCount(0);
    await expect(todoPage.todoRowByTitle('Walk the dog')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('1 item left');
    await expect(todoPage.clearCompletedButton).toHaveCount(0);

    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Walk the dog');
  });

  test('TC-008 — Completed todo appears under Completed filter', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Walk the dog');
    await todoPage.toggleTodo('Buy milk').click();
    await todoPage.openFilter('Completed');

    await expect(page).toHaveURL(/#\/completed$/);
    await expect(todoPage.todoRowByTitle('Buy milk')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Walk the dog')).toHaveCount(0);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.openEmptyApp();
  });

  test('TC-009 — Empty submission does not create a todo', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.newTodoInput.press('Enter');

    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.filterLink('All')).toHaveCount(0);
    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(0);
  });

  test('TC-010 — Whitespace-only submission does not create a todo', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('   ');

    await expect(todoPage.todoItems).toHaveCount(0);
    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(0);
  });

  test('TC-011 — Delete control does not remove other todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Walk the dog');
    await todoPage.deleteTodo('Buy milk');

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveCount(0);
    await expect(todoPage.todoRowByTitle('Walk the dog')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });

  test('TC-012 — Toggling complete on one item does not complete unrelated items', async ({
    page,
  }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Walk the dog');
    await todoPage.toggleTodo('Buy milk').click();

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveClass(/completed/);
    await expect(todoPage.todoRowByTitle('Walk the dog')).not.toHaveClass(/completed/);
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });

  test('TC-013 — Active filter does not show completed todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Walk the dog');
    await todoPage.toggleTodo('Buy milk').click();
    await todoPage.openFilter('Active');

    await expect(page).toHaveURL(/#\/active$/);
    await expect(todoPage.todoRowByTitle('Walk the dog')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveCount(0);
  });

  test('TC-014 — Clear completed does not remove active todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Walk the dog');
    await todoPage.addTodo('Pay bills');
    await todoPage.toggleTodo('Pay bills').click();
    await todoPage.clearCompleted();

    await expect(todoPage.todoRowByTitle('Walk the dog')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Pay bills')).toHaveCount(0);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.openEmptyApp();
  });

  test('TC-015 — Duplicate titles are allowed as separate todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Buy milk');

    await expect(todoPage.todoRowByTitle('Buy milk')).toHaveCount(2);
    await expect(todoPage.todoCount).toHaveText('2 items left');

    const stored = await todoPage.readStoredTodos();
    expect(stored).toHaveLength(2);
    expect(stored[0].id).not.toBe(stored[1].id);
    expect(stored[0].title).toBe('Buy milk');
    expect(stored[1].title).toBe('Buy milk');
  });

  test('TC-016 — Todo title with special characters is stored and displayed correctly', async ({
    page,
  }) => {
    const todoPage = new TodoMvcPage(page);
    const title = `<script>alert('xss')</script> & "quotes" — 100%`;

    const dialogShown = await runWithNativeDialogWatcher(page, () =>
      todoPage.addTodo(title),
    );

    await expect(todoPage.todoRowByTitle(title)).toHaveCount(1);
    expect(dialogShown).toBe(false);

    const stored = await todoPage.readStoredTodos();
    expect(stored[0].title).toBe(title);
  });

  test('TC-017 — Long todo title is accepted and stored in full', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    const title = 'A'.repeat(500);
    await todoPage.addTodo(title);

    await expect(todoPage.todoRowByTitle(title)).toHaveCount(1);
    await expect(todoPage.newTodoInput).toBeVisible();

    const stored = await todoPage.readStoredTodos();
    expect(stored[0].title).toHaveLength(500);
  });

  test('TC-018 — Leading and trailing spaces in title are trimmed on add', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('  Trim me  ');

    await expect(todoPage.todoRowByTitle('Trim me')).toHaveCount(1);
    const stored = await todoPage.readStoredTodos();
    expect(stored[0].title).toBe('Trim me');
  });

  test('TC-019 — Unicode and emoji in todo title', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    const title = 'Buy naan 🥖 日本語';
    await todoPage.addTodo(title);

    await expect(todoPage.todoRowByTitle(title)).toHaveCount(1);
    await todoPage.toggleTodo(title).click();
    await expect(todoPage.todoRowByTitle(title)).toHaveClass(/completed/);
    await todoPage.deleteTodo(title);
    await expect(todoPage.todoRowByTitle(title)).toHaveCount(0);
  });

  test('TC-020 — Todos survive page reload via localStorage', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    const before = await todoPage.readStoredTodos();
    await todoPage.reload();

    await expect(todoPage.todoRowByTitle('Buy milk')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('1 item left');
    await expect(todoPage.filterLink('All')).toBeVisible();
    const after = await todoPage.readStoredTodos();
    expect(after).toEqual(before);
  });

  test('TC-021 — Deleting the last todo returns UI to initial empty state', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.deleteTodo('Buy milk');

    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.todoCount).toHaveCount(0);
    await expect(todoPage.markAllCompleteCheckbox).toHaveCount(0);
    await expect(todoPage.newTodoInput).toBeVisible();
  });

  test('TC-022 — Rapid Enter key presses create distinct todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.newTodoInput.fill('One');
    await todoPage.newTodoInput.press('Enter');
    await todoPage.newTodoInput.fill('Two');
    await todoPage.newTodoInput.press('Enter');
    await todoPage.newTodoInput.fill('Three');
    await todoPage.newTodoInput.press('Enter');

    await expect(todoPage.todoRowByTitle('One')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Two')).toBeVisible();
    await expect(todoPage.todoRowByTitle('Three')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('3 items left');
  });
});
