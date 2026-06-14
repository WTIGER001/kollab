# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor-macros.spec.ts >> Phase 1 Editor Macros >> should support toggling edit mode and typing standard text
- Location: tests/editor-macros.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.ProseMirror') to be visible

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { setupMockAPI } from './helpers';
  3   | 
  4   | test.describe('Phase 1 Editor Macros', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Setup API mocking
  7   |     await setupMockAPI(page);
  8   |     
  9   |     // Navigate to page
  10  |     await page.goto('/teams/team-1/proj-1/doc-1');
  11  |     
  12  |     // Pipe browser console logs
  13  |     page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  14  |     
  15  |     // Wait for document to load and initialize content
> 16  |     await page.waitForSelector('.ProseMirror');
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  17  |     await expect(page.locator('.ProseMirror')).toContainText('Welcome to the mock editor canvas');
  18  |   });
  19  | 
  20  |   test('should support toggling edit mode and typing standard text', async ({ page }) => {
  21  |     const editButton = page.getByRole('button', { name: 'Edit', exact: true });
  22  |     await expect(editButton).toBeVisible();
  23  |     
  24  |     // Default mode should be readonly
  25  |     const editor = page.locator('.ProseMirror');
  26  |     await expect(editor).toHaveAttribute('contenteditable', 'false');
  27  | 
  28  |     // Toggle edit mode
  29  |     await editButton.click();
  30  |     await expect(editor).toHaveAttribute('contenteditable', 'true');
  31  |     
  32  |     // Clear content programmatically
  33  |     await page.evaluate(() => {
  34  |       (window as any).editor.commands.setContent('');
  35  |     });
  36  |     
  37  |     // Type text
  38  |     await editor.click();
  39  |     await page.keyboard.type('Testing phase 1 features.');
  40  |     await expect(editor).toContainText('Testing phase 1 features.');
  41  |   });
  42  | 
  43  |   test('should insert and interact with Inline Status Badges', async ({ page }) => {
  44  |     // Switch to edit mode
  45  |     await page.getByRole('button', { name: 'Edit', exact: true }).click();
  46  |     
  47  |     const editor = page.locator('.ProseMirror');
  48  |     
  49  |     // Clear content programmatically
  50  |     await page.evaluate(() => {
  51  |       (window as any).editor.commands.setContent('');
  52  |     });
  53  |     
  54  |     // Click toolbar button to insert status
  55  |     await page.locator('button[aria-label="Insert Status Badge"]').click();
  56  |     
  57  |     // Check if Status chip is inserted
  58  |     const statusChip = editor.locator('.MuiChip-root:has-text("TODO")');
  59  |     await expect(statusChip).toBeVisible();
  60  |     
  61  |     // Click on status chip to open Popover
  62  |     await statusChip.click();
  63  |     
  64  |     // Popover text field should be visible
  65  |     const textInput = page.locator('input[placeholder="Status label..."]');
  66  |     await expect(textInput).toBeVisible();
  67  |     
  68  |     // Edit label
  69  |     await textInput.fill('IN PROGRESS');
  70  |     await page.keyboard.press('Enter');
  71  |     
  72  |     // Verify status chip label updated (Tiptap status node converts text uppercase)
  73  |     await expect(editor.locator('.MuiChip-root:has-text("IN PROGRESS")')).toBeVisible();
  74  |   });
  75  | 
  76  |   test('should insert and interact with Inline Date selector', async ({ page }) => {
  77  |     await page.getByRole('button', { name: 'Edit', exact: true }).click();
  78  |     
  79  |     const editor = page.locator('.ProseMirror');
  80  |     
  81  |     // Clear content programmatically
  82  |     await page.evaluate(() => {
  83  |       (window as any).editor.commands.setContent('');
  84  |     });
  85  |     
  86  |     // Click toolbar button for date
  87  |     await page.locator('button[aria-label="Insert Date Pill"]').click();
  88  |     
  89  |     // Check if Date chip is inserted
  90  |     const dateChip = editor.locator('.MuiChip-root:has-text("Select Date")').or(editor.locator('.MuiChip-root:has-text("2026")'));
  91  |     await expect(dateChip).toBeVisible();
  92  |     
  93  |     // Click Date chip
  94  |     await dateChip.click();
  95  |     
  96  |     // Date input should be visible inside Popover
  97  |     const dateInput = page.locator('input[type="date"]');
  98  |     await expect(dateInput).toBeVisible();
  99  |     
  100 |     // Set date value
  101 |     await dateInput.fill('2026-06-15');
  102 |     
  103 |     // Date chip text should update to friendly date
  104 |     await expect(dateChip).toContainText('Jun 15, 2026');
  105 |   });
  106 | 
  107 |   test('should insert and toggle Details Summary (Collapsible block)', async ({ page }) => {
  108 |     // 1. In edit mode, check transaction toggle
  109 |     await page.getByRole('button', { name: 'Edit', exact: true }).click();
  110 |     
  111 |     const editor = page.locator('.ProseMirror');
  112 |     
  113 |     // Clear content programmatically
  114 |     await page.evaluate(() => {
  115 |       (window as any).editor.commands.setContent('');
  116 |     });
```