import { test, expect } from '@playwright/test';
import { setupMockAPI } from './helpers';

test.describe('Phase 1 Editor Macros', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocking
    await setupMockAPI(page);
    
    // Navigate to page
    await page.goto('/teams/team-1/proj-1/doc-1');
    
    // Pipe browser console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // Wait for document to load and initialize content
    await page.waitForSelector('.ProseMirror');
    await expect(page.locator('.ProseMirror')).toContainText('Welcome to the mock editor canvas');
  });

  test('should support toggling edit mode and typing standard text', async ({ page }) => {
    const editButton = page.getByRole('button', { name: 'Edit', exact: true });
    await expect(editButton).toBeVisible();
    
    // Default mode should be readonly
    const editor = page.locator('.ProseMirror');
    await expect(editor).toHaveAttribute('contenteditable', 'false');

    // Toggle edit mode
    await editButton.click();
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Type text
    await editor.click();
    await page.keyboard.type('Testing phase 1 features.');
    await expect(editor).toContainText('Testing phase 1 features.');
  });

  test('should insert and interact with Inline Status Badges', async ({ page }) => {
    // Switch to edit mode
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Click toolbar button to insert status
    await page.locator('button[aria-label="Insert Status Badge"]').click();
    
    // Check if Status chip is inserted
    const statusChip = editor.locator('.MuiChip-root:has-text("TODO")');
    await expect(statusChip).toBeVisible();
    
    // Click on status chip to open Popover
    await statusChip.click();
    
    // Popover text field should be visible
    const textInput = page.locator('input[placeholder="Status label..."]');
    await expect(textInput).toBeVisible();
    
    // Edit label
    await textInput.fill('IN PROGRESS');
    await page.keyboard.press('Enter');
    
    // Verify status chip label updated (Tiptap status node converts text uppercase)
    await expect(editor.locator('.MuiChip-root:has-text("IN PROGRESS")')).toBeVisible();
  });

  test('should insert and interact with Inline Date selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Click toolbar button for date
    await page.locator('button[aria-label="Insert Date Pill"]').click();
    
    // Check if Date chip is inserted
    const dateChip = editor.locator('.MuiChip-root:has-text("Select Date")').or(editor.locator('.MuiChip-root:has-text("2026")'));
    await expect(dateChip).toBeVisible();
    
    // Click Date chip
    await dateChip.click();
    
    // Date input should be visible inside Popover
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    
    // Set date value
    await dateInput.fill('2026-06-15');
    
    // Date chip text should update to friendly date
    await expect(dateChip).toContainText('Jun 15, 2026');
  });

  test('should insert and toggle Details Summary (Collapsible block)', async ({ page }) => {
    // 1. In edit mode, check transaction toggle
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Click toolbar button for details
    await page.locator('button[aria-label="Insert Expandable Box"]').click();
    
    // Verify details block is inserted
    const detailsNode = editor.locator('details.details-macro');
    await expect(detailsNode).toBeVisible();
    await expect(detailsNode).toHaveAttribute('open', '');
    
    const summary = detailsNode.locator('summary');
    await expect(summary).toBeVisible();
    
    // Click summary to toggle closed
    await summary.click();
    await expect(detailsNode).not.toHaveAttribute('open', '');
    
    // Click summary to toggle open again
    await summary.click();
    await expect(detailsNode).toHaveAttribute('open', '');

    // 2. Click "Done" to go to read-only, check local DOM toggle
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Skip Checkpoint' }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'false');
    
    // Click summary to toggle closed in read-only
    await summary.click();
    await expect(detailsNode).not.toHaveAttribute('open', '');
  });

  test('should insert and interact with Task Lists', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Click toolbar button for task list
    await page.locator('button[aria-label="Insert Task List"]').click();
    await editor.focus();
    await page.keyboard.type('Test checklist item');
    
    // Check if task item is created
    const taskItem = editor.getByRole('listitem');
    await expect(taskItem).toBeVisible();
    
    // Verify checkbox is present
    const checkbox = taskItem.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    
    // Click checkbox
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('should support No Format plain monospace panels', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });
    
    // Click toolbar button for no format panel
    await page.locator('button[aria-label="Insert No Format Panel"]').click();
    
    // Verify pre block created
    const noFormatPanel = editor.locator('pre[data-type="no-format"]');
    await expect(noFormatPanel).toBeVisible();
  });

  test('should insert and interact with Table of Contents', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Set content with headings and Table of Contents node directly
    await page.evaluate(() => {
      const editor = (window as any).editor;
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Heading' }]
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Sub Heading' }]
          },
          {
            type: 'tableOfContents'
          }
        ]
      });
    });

    // Verify Table of Contents node is visible
    const tocNode = editor.locator('.table-of-contents-node');
    await expect(tocNode).toBeVisible();

    // Verify headings are listed in TOC
    await expect(tocNode.locator('text=Main Heading')).toBeVisible();
    await expect(tocNode.locator('text=Sub Heading')).toBeVisible();

    // Click heading in TOC
    await tocNode.locator('text=Sub Heading').click();

    // Hover over the TOC node and click delete button
    await tocNode.hover();
    const deleteButton = tocNode.locator('button[aria-label="Delete Outline"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Verify TOC node is removed
    await expect(tocNode).not.toBeVisible();
  });

  test('should support selecting headings 1-8 and Normal text from the dropdown selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    const editor = page.locator('.ProseMirror');
    
    // Clear content programmatically
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });

    // Locate the select dropdown and click it
    const headingDropdown = page.locator('.MuiSelect-select');
    await expect(headingDropdown).toBeVisible();
    await headingDropdown.click();

    // Click on Heading 3 option in listbox
    const optionH3 = page.getByRole('option', { name: 'Heading 3' });
    await expect(optionH3).toBeVisible();
    await optionH3.click();

    // Type text
    await editor.focus();
    await page.keyboard.type('This is a Level 3 Heading');

    // Verify h3 node is in editor DOM
    const h3Heading = editor.locator('h3:has-text("This is a Level 3 Heading")');
    await expect(h3Heading).toBeVisible();

    // Clear and then select Heading 8
    await page.evaluate(() => {
      (window as any).editor.commands.setContent('');
    });

    await headingDropdown.click();
    const optionH8 = page.getByRole('option', { name: 'Heading 8' });
    await expect(optionH8).toBeVisible();
    await optionH8.click();

    // Type new text
    await editor.focus();
    await page.keyboard.type('This is a Level 8 Heading');

    // Verify h8 node is in editor DOM
    const h8Heading = editor.locator('h8:has-text("This is a Level 8 Heading")');
    await expect(h8Heading).toBeVisible();
  });
});
