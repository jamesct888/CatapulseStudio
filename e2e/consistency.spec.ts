
import { test, expect } from '@playwright/test';

test.describe('Cross-View Consistency', () => {

    test.beforeEach(async ({ page }) => {
        await page.route(/.*generateContent.*/, async route => {
            const json = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_consist",
                                name: "Consistency Test",
                                stages: [{
                                    id: "stg_1", title: "Stage 1", sections: [
                                        { id: "sec_1", title: "Section 1", elements: [] }
                                    ]
                                }]
                            })
                        }]
                    }
                }]
            };
            await route.fulfill({ json, contentType: 'application/json' });
        });
        await page.goto('/');
        await page.locator('input[type="text"]').fill('Sync Test');
        await page.getByRole('button', { name: 'Generate Process' }).click();
        await page.waitForSelector('#canvas');
    });

    test('should sync elements between Editor, Table, and Spec views', async ({ page }) => {
        // 1. Add Element under 'Section 1' via Editor
        // Click section header to select it
        await page.waitForTimeout(500);
        await page.getByText(/Section 1/i).click({ force: true });
        // Click Add Field
        await page.getByText('Add Field').click();

        // Rename Field via Properties Panel
        await page.locator('input[value="New Field"]').fill('Sync Check Field');

        // 2. Switch to Table View
        await page.locator('#nav-table').click();

        // Assert Field is present in Table
        await expect(page.getByRole('cell', { name: 'Sync Check Field' })).toBeVisible();

        // 3. Switch to Spec View
        await page.locator('#nav-spec').click();

        // Assert Field is present in Spec Document
        await expect(page.getByText('Sync Check Field')).toBeVisible();
    });
});
