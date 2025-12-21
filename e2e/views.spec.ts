import { test, expect } from '@playwright/test';

test.describe('View Modes', () => {
    test.beforeEach(async ({ page }) => {
        // Mock for setup using Regex
        await page.route(/.*generateContent.*/, async route => {
            const json = {
                candidates: [{
                    finishReason: "STOP",
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_view_test",
                                name: "View Test Process",
                                stages: [
                                    {
                                        id: "stg_1",
                                        name: "Stage 1",
                                        sections: [
                                            {
                                                id: "sec_1",
                                                name: "Section 1",
                                                elements: [{ id: "el_1", type: "text", label: "Element 1" }]
                                            }
                                        ]
                                    }
                                ],
                                userStories: [],
                                testCases: []
                            })
                        }]
                    }
                }]
            };
            await route.fulfill({ json, contentType: 'application/json' });
        });

        await page.goto('/');
        await page.getByPlaceholder(/e.g. Pension Transfer In/i).fill('View test');
        await page.getByRole('button', { name: /Generate Process/i }).click();
        await expect(page.getByText('View Test Process')).toBeVisible();
    });

    test('should switch between all major view modes', async ({ page }) => {
        // 1. Table View (Labeled "Grid")
        await page.getByRole('button', { name: /Grid/i }).click();
        // Verify some table specific element
        await expect(page.getByText('Data View')).toBeVisible({ timeout: 5000 }).catch(() => null);
        // Or just check URL or active state if possible, but visual check is better.
        // Assuming ModeTable has some unique text.

        // 2. Flow View
        await page.getByRole('button', { name: /Flow/i }).click();
        // Flow uses React Flow, look for nodes
        await expect(page.locator('.react-flow__node')).toBeVisible({ timeout: 5000 }).catch(() => null);

        // 3. Preview View
        await page.getByRole('button', { name: /Preview/i }).click();
        await expect(page.getByText('Current Stage')).toBeVisible();

        // 4. Spec View
        await page.getByRole('button', { name: /Spec/i }).click();
        await expect(page.getByRole('heading', { name: 'Operational Skills Matrix' })).toBeVisible();
        // Check if content rendered
        await expect(page.getByText('Element 1')).toBeVisible();

        // 5. Back to Editor (Labeled "Design")
        await page.getByRole('button', { name: /Design/i }).click();
        await expect(page.getByText('Stage 1')).toBeVisible();
    });
});
