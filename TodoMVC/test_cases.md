# Test Plan: Playwright TodoMVC Demo

| Field | Value |
| --- | --- |
| **Application URL** | https://demo.playwright.dev/todomvc/#/ |
| **Page title** | React • TodoMVC |
| **Scope** | Core list operations covered by acceptance criteria (add, complete, delete) plus related UI on the demo page |
| **Out of scope (unless noted)** | Third-party links (TodoMVC, Remo H. Jansen, “real TodoMVC app”), visual regression, performance |
| **Automated tests** | [test_cases.md](./test_cases.md) (`tests/todomvc.spec.ts`) |

## Application overview

The demo shows a yellow banner: *“This is just a demo of TodoMVC for testing, not the real TodoMVC app.”* The main widget includes:

| UI element | Name / label | Notes |
| --- | --- | --- |
| New todo input | Placeholder and accessible name: **What needs to be done?** | CSS class `new-todo`; submit with **Enter** |
| Page heading | **todos** | Shown above the input |
| Toggle all | **Mark all as complete** | Checkbox left of the input; visible when at least one todo exists |
| Per-item toggle | **Toggle Todo** | Circular checkbox on each row |
| Per-item delete | **Delete** | Button with class `destroy`; typically visible on row hover |
| Item label | Todo title text (e.g. **Buy milk**) | Double-click hint: *“Double-click to edit a todo”* |
| Footer count | e.g. **1 item left**, **0 items left**, **2 items left** | Element class `todo-count` |
| Filters | **All** (`#/`), **Active** (`#/active`), **Completed** (`#/completed`) | Shown when list is non-empty |
| Clear completed | **Clear completed** | Shown when at least one todo is completed |

Todos persist in browser **localStorage** under key `react-todos` (JSON array of `{ id, title, completed }`).

---

## Positive flows

### TC-001 — New todo appears in the list after valid entry

**Preconditions**

- Browser opened to https://demo.playwright.dev/todomvc/#/
- Todo list is empty (fresh session or all items removed)
- Footer filters and **Mark all as complete** are not shown

**Steps**

1. Click the **What needs to be done?** field.
2. Type `Buy milk`.
3. Press **Enter**.

**Expected result**

- One row appears in the todo list with label **Buy milk**.
- The **What needs to be done?** field is empty and still focused.
- Footer shows **1 item left**.
- Filter links **All**, **Active**, and **Completed** are visible.
- **Mark all as complete** checkbox is visible.
- `localStorage` key `react-todos` contains one object with `title` `"Buy milk"` and `completed` `false`.

---

### TC-002 — Multiple todos can be added in sequence

**Preconditions**

- On https://demo.playwright.dev/todomvc/#/ with an empty list

**Steps**

1. Enter `Walk the dog` and press **Enter**.
2. Enter `Pay bills` and press **Enter**.

**Expected result**

- List shows **Walk the dog** then **Pay bills** (order preserved as entered).
- Footer shows **2 items left**.
- Both items have unchecked **Toggle Todo** state.

---

### TC-003 — Todo is marked completed when its toggle is used

**Preconditions**

- List contains exactly one active todo: **Buy milk**

**Steps**

1. Click the **Toggle Todo** checkbox for **Buy milk**.

**Expected result**

- Row for **Buy milk** shows completed styling (list item has class `completed`; title appears struck through).
- Footer updates to **0 items left**.
- **Clear completed** button appears with label **Clear completed**.
- `react-todos` entry for **Buy milk** has `completed` `true`.
- **Buy milk** remains visible on the **All** filter.

---

### TC-004 — Completed todo can be toggled back to active

**Preconditions**

- **Buy milk** exists and is completed (as after TC-003)

**Steps**

1. Click the **Toggle Todo** checkbox for **Buy milk** again.

**Expected result**

- **Buy milk** is active again (no `completed` styling).
- Footer shows **1 item left**.
- **Clear completed** button is hidden if no completed items remain.
- `completed` is `false` in `react-todos`.

---

### TC-005 — **Mark all as complete** completes every active todo

**Preconditions**

- List contains active todos **Walk the dog** and **Pay bills** (neither completed)

**Steps**

1. Click **Mark all as complete**.

**Expected result**

- Both rows show completed styling.
- Footer shows **0 items left**.
- **Clear completed** is visible.
- All entries in `react-todos` have `completed` `true`.

---

### TC-006 — Todo is removed from the list when Delete is used

**Preconditions**

- List contains **Buy milk** (active or completed)

**Steps**

1. Hover the row for **Buy milk** so the **Delete** control is visible.
2. Click **Delete**.

**Expected result**

- **Buy milk** is no longer in the list.
- If it was the only item, footer filters and **Mark all as complete** disappear; main section shows only the **What needs to be done?** input and hint *“Double-click to edit a todo”*.
- Footer count reflects remaining active items (or footer hidden when list empty).
- `react-todos` no longer contains **Buy milk**.

---

### TC-007 — **Clear completed** removes only completed todos

**Preconditions**

- **Walk the dog** is active.
- **Pay bills** is completed.

**Steps**

1. Click **Clear completed**.

**Expected result**

- **Pay bills** is removed from the list.
- **Walk the dog** remains active.
- Footer shows **1 item left**.
- **Clear completed** is hidden.
- Only **Walk the dog** remains in `react-todos`.

---

### TC-008 — Completed todo appears under **Completed** filter

**Preconditions**

- **Buy milk** is completed; at least one other todo may be active

**Steps**

1. Click the **Completed** filter link.

**Expected result**

- URL hash is `#/completed`.
- Only completed todos (e.g. **Buy milk**) are listed.
- Active todos are hidden on this view.

---

## Negative flows

### TC-009 — Empty submission does not create a todo

**Preconditions**

- Empty todo list on https://demo.playwright.dev/todomvc/#/

**Steps**

1. Focus **What needs to be done?** without typing.
2. Press **Enter**.

**Expected result**

- No new list items appear.
- Footer filters do not appear.
- `react-todos` is null or `[]`.

---

### TC-010 — Whitespace-only submission does not create a todo

**Preconditions**

- Empty list

**Steps**

1. In **What needs to be done?**, type three spaces (`   `).
2. Press **Enter**.

**Expected result**

- No todo row is added.
- Input is cleared or trimmed; list remains empty.
- No spurious entry in `react-todos`.

---

### TC-011 — Delete control does not remove other todos

**Preconditions**

- List contains **Buy milk** and **Walk the dog**

**Steps**

1. Hover **Buy milk** and click **Delete**.

**Expected result**

- **Buy milk** is removed.
- **Walk the dog** remains unchanged and still active.
- Footer shows **1 item left** (not **0 items left** unless **Walk the dog** was also removed).

---

### TC-012 — Toggling complete on one item does not complete unrelated items

**Preconditions**

- **Buy milk** and **Walk the dog** are both active

**Steps**

1. Click **Toggle Todo** only for **Buy milk**.

**Expected result**

- Only **Buy milk** shows completed styling.
- **Walk the dog** stays active.
- Footer shows **1 item left** (one active item remaining).

---

### TC-013 — **Active** filter does not show completed todos

**Preconditions**

- **Buy milk** completed; **Walk the dog** active

**Steps**

1. Click **Active**.

**Expected result**

- URL hash is `#/active`.
- **Walk the dog** is visible.
- **Buy milk** is not listed on this view.
- Completed styling is not shown for hidden items.

---

### TC-014 — **Clear completed** does not remove active todos

**Preconditions**

- **Walk the dog** active; **Pay bills** completed

**Steps**

1. Click **Clear completed**.

**Expected result**

- **Walk the dog** still present and active.
- **Pay bills** removed.
- User cannot use **Clear completed** to delete active work items.

---

## Edge cases

### TC-015 — Duplicate titles are allowed as separate todos

**Preconditions**

- Empty list

**Steps**

1. Add `Buy milk` and press **Enter**.
2. Add `Buy milk` again and press **Enter**.

**Expected result**

- Two separate rows both labeled **Buy milk**, each with its own **Toggle Todo** and **Delete**.
- Footer shows **2 items left**.
- `react-todos` contains two distinct `id` values with the same `title`.

---

### TC-016 — Todo title with special characters is stored and displayed correctly

**Preconditions**

- Empty list

**Steps**

1. Enter `<script>alert('xss')</script> & "quotes" — 100%` into **What needs to be done?**.
2. Press **Enter**.

**Expected result**

- One todo appears showing the literal text (HTML is escaped, not executed).
- No script alert runs.
- Title in `react-todos` matches the entered string (properly JSON-escaped).

---

### TC-017 — Long todo title is accepted and fully visible or truncated consistently

**Preconditions**

- Empty list

**Steps**

1. Enter a string of 500 characters: repeat `A` 500 times.
2. Press **Enter**.

**Expected result**

- One todo is created with the full title stored in `react-todos` (length 500).
- UI displays the item without breaking layout (scroll or wrap as implemented); app remains usable.

---

### TC-018 — Leading and trailing spaces in title are handled predictably

**Preconditions**

- Empty list

**Steps**

1. Enter `  Trim me  ` and press **Enter**.

**Expected result**

- Either the stored/displayed title is `Trim me` (trimmed) or `  Trim me  ` (preserved)—behavior is consistent on display, in edit mode, and in `react-todos`. *(Record actual behavior during execution; demo typically trims on add.)*

---

### TC-019 — Unicode and emoji in todo title

**Preconditions**

- Empty list

**Steps**

1. Enter `Buy naan 🥖 日本語` and press **Enter**.

**Expected result**

- Todo appears with exact characters **Buy naan 🥖 日本語**.
- Toggle and **Delete** work on this row.
- Persistence after page reload matches entered title.

---

### TC-020 — Todos survive page reload via localStorage

**Preconditions**

- List contains **Buy milk** (active)

**Steps**

1. Reload the browser tab on https://demo.playwright.dev/todomvc/#/.

**Expected result**

- **Buy milk** is still listed as active.
- Footer and filters match pre-reload state.
- `react-todos` unchanged across reload.

---

### TC-021 — Deleting the last todo returns UI to initial empty state

**Preconditions**

- Single todo **Buy milk** in the list

**Steps**

1. Hover row and click **Delete**.

**Expected result**

- List empty; no footer count or filters.
- **Mark all as complete** not shown.
- **What needs to be done?** remains available for new input.

---

### TC-022 — Rapid Enter key presses create distinct todos

**Preconditions**

- Empty list

**Steps**

1. Type `One` and press **Enter**.
2. Immediately type `Two` and press **Enter**.
3. Immediately type `Three` and press **Enter**.

**Expected result**

- Three rows **One**, **Two**, **Three** in order.
- Footer shows **3 items left**.
- No merged or lost entries.

---

## Traceability to acceptance criteria

| Acceptance criterion | Test case IDs |
| --- | --- |
| User can add a todo item to the list | TC-001, TC-002, TC-015–TC-019, TC-022 |
| User can complete an item | TC-003, TC-004, TC-005, TC-008 |
| User can delete item from the list | TC-006, TC-007, TC-021 |

---

## Ambiguities and gaps in the acceptance criteria

1. **Submit method** — ACs do not state that todos are added only via **Enter** (not a separate Add button). The demo has no Add button; plan assumes Enter-only submission.

2. **Whitespace and trimming** — No rule for leading/trailing spaces or empty-looking strings; TC-010 and TC-018 need a documented expected rule from product owners.

3. **Duplicate titles** — ACs neither allow nor forbid duplicate text; demo allows duplicates (TC-015). Confirm if production should deduplicate.

4. **Complete vs delete** — ACs do not mention **Clear completed**, **Mark all as complete**, or filters (**All** / **Active** / **Completed**). These are included as supporting flows for complete/delete behavior.

5. **Persistence** — ACs do not require localStorage; demo persists via `react-todos` (TC-020). Clarify if persistence is in scope for “real” requirements.

6. **Edit todo** — UI hint *“Double-click to edit a todo”* is not in ACs; inline edit, empty edit, and cancel behavior are undefined for this plan.

7. **Delete affordance** — **Delete** appears on hover; ACs do not specify keyboard or touch access. Mobile/touch and accessibility expectations are open.

8. **Max length** — No stated character limit; TC-017 probes de facto browser/app limits but no official maximum is documented.

9. **Demo vs production** — Banner states this is not the real TodoMVC app; ACs may target generic TodoMVC behavior while this plan targets the Playwright demo implementation specifically.

10. **Negative completion** — ACs do not define whether completing an already completed item or using **Mark all as complete** when all are complete should no-op or toggle; verify expected behavior for regressions.
