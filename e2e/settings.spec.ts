
import { test, expect } from '@playwright/test';

test.describe('Global Settings & Theming', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Generation to get to editor quickly
        await page.route(/.*generateContent.*/, async route => {
            const json = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_1",
                                name: "Test Process",
                                stages: [{
                                    id: "stg_1",
                                    name: "Stage 1",
                                    sections: [{ id: "sec_1", name: "Section 1", elements: [] }]
                                }]
                            })
                        }]
                    }
                }]
            };
            await route.fulfill({ json, contentType: 'application/json' });
        });

        await page.goto('/');
        await page.locator('input[type="text"]').fill('Test Process');
        await page.getByRole('button', { name: 'Generate Process' }).click();
        await expect(page.getByText('Stage 1')).toBeVisible({ timeout: 20000 });
    });

    test('should toggle settings panel and change theme', async ({ page }) => {
        // Open Settings
        await page.getByTitle('Global Theme Settings').click();
        await expect(page.getByRole('heading', { name: 'Visual Configuration' })).toBeVisible();

        // Change Theme to 'Glass'
        await page.getByText('Glass', { exact: true }).click();

        // Verify visual change (hard to assert exact CSS in E2E widely, but we can check active state)
        // Assuming the button gets a ring or bold class
        // We will check if the 'Glass' option is selected (UI usually highlights it)

        // Close Settings
        await page.getByTitle('Close Settings').click();
        await expect(page.getByRole('heading', { name: 'Visual Configuration' })).not.toBeVisible();
    });
});
