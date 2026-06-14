import { test, expect } from '@playwright/test';
import { setupMockAPI } from './helpers';

test.describe('Editor Canvas Modes & Page Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPI(page);
    await page.goto('/teams/team-1/proj-1/doc-1');
    await page.waitForSelector('.ProseMirror');
    await expect(page.locator('.ProseMirror')).toContainText('Welcome to the mock editor canvas');
  });

  test('should display breadcrumbs and readonly toolbar by default', async ({ page }) => {
    // 1. Check editor is locked
    const editor = page.locator('.ProseMirror');
    await expect(editor).toHaveAttribute('contenteditable', 'false');

    // 2. Check title field is locked
    const titleInput = page.locator('input[placeholder="Untitled Document"]');
    await expect(titleInput).toHaveAttribute('readonly', '');

    // 3. Check breadcrumbs are present in the main canvas area
    const mainArea = page.locator('main');
    const breadcrumbs = mainArea.locator('text=Mock Workspace');
    await expect(breadcrumbs).toBeVisible();
    await expect(mainArea.locator('text=Design Project')).toBeVisible();
    await expect(mainArea.locator('text=Welcome Document')).toBeVisible();

    // 4. Check action buttons are visible on right
    await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('should open Page Analytics Dialog with statistics', async ({ page }) => {
    // Click Analytics button
    await page.getByRole('button', { name: 'Analytics' }).click();
    
    // Check Dialog header
    await expect(page.locator('h6:has-text("Page Analytics")')).toBeVisible();
    
    // Check words metric (our mock content is "Welcome to the mock editor canvas. Type something!" which has 8 words) using data-testid
    await expect(page.getByTestId('kpi-words')).toContainText('8');
    
    // Check read time metric using data-testid
    await expect(page.getByTestId('kpi-read-time')).toContainText('1');

    // Check SVG chart view
    const sparklineSvg = page.locator('svg:has-text("Jun 8")');
    await expect(sparklineSvg).toBeVisible();

    // Close Dialog
    await page.locator('button:has(svg.lucide-x)').click();
    await expect(page.locator('h6:has-text("Page Analytics")')).not.toBeVisible();
  });

  test('should toggle edit mode, allow typing, and return to readonly', async ({ page }) => {
    const editor = page.locator('.ProseMirror');
    const titleInput = page.locator('input[placeholder="Untitled Document"]');
    const mainArea = page.locator('main');

    // 1. Click edit
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await expect(titleInput).not.toHaveAttribute('readonly');

    // Breadcrumbs should be replaced by edit mode badge
    await expect(mainArea.locator('text=EDIT MODE')).toBeVisible();
    await expect(mainArea.locator('text=Saved')).toBeVisible();

    // 2. Change title
    await titleInput.fill('Updated Project Page');
    
    // 3. Click Done
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Skip Checkpoint' }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'false');
    await expect(titleInput).toHaveAttribute('readonly');

    // Breadcrumbs should re-appear and display updated title
    await expect(mainArea.locator('text=Mock Workspace')).toBeVisible();
    await expect(mainArea.locator('text=Design Project')).toBeVisible();
    await expect(mainArea.locator('text=Updated Project Page')).toBeVisible();
  });
});
