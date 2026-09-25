import { test, expect, type Page } from '@playwright/test';

const TODO_MVC_URL = 'https://demo.playwright.dev/todomvc/#/';

const newTodoInput = (page: Page) =>
  page.getByRole('textbox', { name: 'What needs to be done?' });

async function openEmptyTodoApp(page: Page) {
  await page.goto(TODO_MVC_URL);
  await page.evaluate(() => localStorage.removeItem('react-todos'));
  await page.reload();
}

async function addTodo(page: Page, title: string) {
  const input = newTodoInput(page);
  await input.fill(title);
  await input.press('Enter');
}

function todoRow(page: Page, title: string) {
  return page.locator('.todo-list li').filter({
    has: page.locator('label', { hasText: title }),
  });
}

async function deleteTodo(page: Page, title: string) {
  const row = todoRow(page, title).first();
  await row.hover();
  await row.getByRole('button', { name: 'Delete' }).click();
}

async function readStoredTodos(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('react-todos'));
  if (!raw) return [];
  return JSON.parse(raw) as Array<{ id: string; title: string; completed: boolean }>;
}

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await openEmptyTodoApp(page);
  });

  test('TC-001 — New todo appears in the list after valid entry', async ({ page }) => {
    const input = newTodoInput(page);
    await input.click();
    await addTodo(page, 'Buy milk');

    await expect(todoRow(page, 'Buy milk')).toHaveCount(1);
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
    await expect(page.getByRole('link', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Completed' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Mark all as complete' })).toBeVisible();

    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Buy milk');
    expect(stored[0].completed).toBe(false);
  });

  test('TC-002 — Multiple todos can be added in sequence', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay bills');

    await expect(page.locator('.todo-list li')).toHaveText(['Walk the dog', 'Pay bills']);
    await expect(page.locator('.todo-count')).toHaveText('2 items left');
    await expect(page.getByRole('checkbox', { name: 'Toggle Todo' })).toHaveCount(2);
    await expect(page.getByRole('checkbox', { name: 'Toggle Todo' }).first()).not.toBeChecked();
  });

  test('TC-003 — Todo is marked completed when its toggle is used', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await todoRow(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' }).click();

    await expect(todoRow(page, 'Buy milk')).toHaveClass(/completed/);
    await expect(page.locator('.todo-count')).toHaveText('0 items left');
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeVisible();
    await expect(todoRow(page, 'Buy milk')).toBeVisible();

    const stored = await readStoredTodos(page);
    expect(stored[0].completed).toBe(true);
  });

  test('TC-004 — Completed todo can be toggled back to active', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    const toggle = todoRow(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' });
    await toggle.click();
    await toggle.click();

    await expect(todoRow(page, 'Buy milk')).not.toHaveClass(/completed/);
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
    await expect(page.getByRole('button', { name: 'Clear completed' })).toHaveCount(0);

    const stored = await readStoredTodos(page);
    expect(stored[0].completed).toBe(false);
  });

  test('TC-005 — Mark all as complete completes every active todo', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay bills');
    await page.getByRole('checkbox', { name: 'Mark all as complete' }).click();

    await expect(todoRow(page, 'Walk the dog')).toHaveClass(/completed/);
    await expect(todoRow(page, 'Pay bills')).toHaveClass(/completed/);
    await expect(page.locator('.todo-count')).toHaveText('0 items left');
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeVisible();

    const stored = await readStoredTodos(page);
    expect(stored.every((todo) => todo.completed)).toBe(true);
  });

  test('TC-006 — Todo is removed from the list when Delete is used', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await deleteTodo(page, 'Buy milk');

    await expect(todoRow(page, 'Buy milk')).toHaveCount(0);
    await expect(page.locator('.todo-count')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'All' })).toHaveCount(0);
    await expect(newTodoInput(page)).toBeVisible();
    await expect(page.getByText('Double-click to edit a todo')).toBeVisible();

    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(0);
  });

  test('TC-007 — Clear completed removes only completed todos', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay bills');
    await todoRow(page, 'Pay bills').getByRole('checkbox', { name: 'Toggle Todo' }).click();
    await page.getByRole('button', { name: 'Clear completed' }).click();

    await expect(todoRow(page, 'Pay bills')).toHaveCount(0);
    await expect(todoRow(page, 'Walk the dog')).toBeVisible();
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
    await expect(page.getByRole('button', { name: 'Clear completed' })).toHaveCount(0);

    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Walk the dog');
  });

  test('TC-008 — Completed todo appears under Completed filter', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await todoRow(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' }).click();
    await page.getByRole('link', { name: 'Completed' }).click();

    await expect(page).toHaveURL(/#\/completed$/);
    await expect(todoRow(page, 'Buy milk')).toBeVisible();
    await expect(todoRow(page, 'Walk the dog')).toHaveCount(0);
  });
});

test.describe('Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await openEmptyTodoApp(page);
  });

  test('TC-009 — Empty submission does not create a todo', async ({ page }) => {
    await newTodoInput(page).press('Enter');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'All' })).toHaveCount(0);
    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(0);
  });

  test('TC-010 — Whitespace-only submission does not create a todo', async ({ page }) => {
    await addTodo(page, '   ');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(0);
  });

  test('TC-011 — Delete control does not remove other todos', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await deleteTodo(page, 'Buy milk');

    await expect(todoRow(page, 'Buy milk')).toHaveCount(0);
    await expect(todoRow(page, 'Walk the dog')).toBeVisible();
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
  });

  test('TC-012 — Toggling complete on one item does not complete unrelated items', async ({
    page,
  }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await todoRow(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' }).click();

    await expect(todoRow(page, 'Buy milk')).toHaveClass(/completed/);
    await expect(todoRow(page, 'Walk the dog')).not.toHaveClass(/completed/);
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
  });

  test('TC-013 — Active filter does not show completed todos', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await todoRow(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' }).click();
    await page.getByRole('link', { name: 'Active' }).click();

    await expect(page).toHaveURL(/#\/active$/);
    await expect(todoRow(page, 'Walk the dog')).toBeVisible();
    await expect(todoRow(page, 'Buy milk')).toHaveCount(0);
  });

  test('TC-014 — Clear completed does not remove active todos', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay bills');
    await todoRow(page, 'Pay bills').getByRole('checkbox', { name: 'Toggle Todo' }).click();
    await page.getByRole('button', { name: 'Clear completed' }).click();

    await expect(todoRow(page, 'Walk the dog')).toBeVisible();
    await expect(todoRow(page, 'Pay bills')).toHaveCount(0);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await openEmptyTodoApp(page);
  });

  test('TC-015 — Duplicate titles are allowed as separate todos', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Buy milk');

    await expect(todoRow(page, 'Buy milk')).toHaveCount(2);
    await expect(page.locator('.todo-count')).toHaveText('2 items left');

    const stored = await readStoredTodos(page);
    expect(stored).toHaveLength(2);
    expect(stored[0].id).not.toBe(stored[1].id);
    expect(stored[0].title).toBe('Buy milk');
    expect(stored[1].title).toBe('Buy milk');
  });

  test('TC-016 — Todo title with special characters is stored and displayed correctly', async ({
    page,
  }) => {
    const title = `<script>alert('xss')</script> & "quotes" — 100%`;
    let dialogShown = false;
    page.on('dialog', () => {
      dialogShown = true;
    });

    await addTodo(page, title);

    await expect(todoRow(page, title)).toHaveCount(1);
    expect(dialogShown).toBe(false);

    const stored = await readStoredTodos(page);
    expect(stored[0].title).toBe(title);
  });

  test('TC-017 — Long todo title is accepted and stored in full', async ({ page }) => {
    const title = 'A'.repeat(500);
    await addTodo(page, title);

    await expect(todoRow(page, title)).toHaveCount(1);
    await expect(newTodoInput(page)).toBeVisible();

    const stored = await readStoredTodos(page);
    expect(stored[0].title).toHaveLength(500);
  });

  test('TC-018 — Leading and trailing spaces in title are trimmed on add', async ({ page }) => {
    await addTodo(page, '  Trim me  ');

    await expect(todoRow(page, 'Trim me')).toHaveCount(1);
    const stored = await readStoredTodos(page);
    expect(stored[0].title).toBe('Trim me');
  });

  test('TC-019 — Unicode and emoji in todo title', async ({ page }) => {
    const title = 'Buy naan 🥖 日本語';
    await addTodo(page, title);

    await expect(todoRow(page, title)).toHaveCount(1);
    await todoRow(page, title).getByRole('checkbox', { name: 'Toggle Todo' }).click();
    await expect(todoRow(page, title)).toHaveClass(/completed/);
    await deleteTodo(page, title);
    await expect(todoRow(page, title)).toHaveCount(0);
  });

  test('TC-020 — Todos survive page reload via localStorage', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    const before = await readStoredTodos(page);
    await page.reload();

    await expect(todoRow(page, 'Buy milk')).toBeVisible();
    await expect(page.locator('.todo-count')).toHaveText('1 item left');
    await expect(page.getByRole('link', { name: 'All' })).toBeVisible();
    const after = await readStoredTodos(page);
    expect(after).toEqual(before);
  });

  test('TC-021 — Deleting the last todo returns UI to initial empty state', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await deleteTodo(page, 'Buy milk');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
    await expect(page.locator('.todo-count')).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Mark all as complete' })).toHaveCount(0);
    await expect(newTodoInput(page)).toBeVisible();
  });

  test('TC-022 — Rapid Enter key presses create distinct todos', async ({ page }) => {
    const input = newTodoInput(page);
    await input.fill('One');
    await input.press('Enter');
    await input.fill('Two');
    await input.press('Enter');
    await input.fill('Three');
    await input.press('Enter');

    await expect(page.locator('.todo-list li')).toHaveText(['One', 'Two', 'Three']);
    await expect(page.locator('.todo-count')).toHaveText('3 items left');
  });
});
