
import { test, expect } from '@playwright/test';

test.describe('Advanced Editor Functions', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Mock the specific AI endpoint using Regex
        await page.route(/.*generateContent.*/, async route => {
            const json = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_adv_123",
                                name: "Advanced Editor Test",
                                stages: [
                                    {
                                        id: "stg_1",
                                        name: "Stage 1",
                                        sections: [
                                            {
                                                id: "sec_1",
                                                name: "Section 1",
                                                elements: [
                                                    { id: "el_1", type: "text", label: "Element 1" },
                                                    { id: "el_2", type: "text", label: "Element 2" }
                                                ]
                                            }
                                        ]
                                    }
                                ],
                                userStories: [],
                                testCases: []
                            })
                        }],
                        finishReason: "STOP"
                    }
                }]
            };
            await route.fulfill({ json, contentType: 'application/json' });
        });

        // 2. Load and Generate
        await page.goto('/');
        await page.getByPlaceholder(/e.g. Pension Transfer In/i).fill('Advanced Setup');
        await page.getByRole('button', { name: /Generate Process/i }).click();
        await expect(page.getByText('Advanced Editor Test')).toBeVisible({ timeout: 10000 });
    });

    test('should change field types and configure options', async ({ page }) => {
        // 1. Select Element 1
        // Target the Node Wrapper explicitly to ensure click registration
        // Double click can sometimes bypass drag-initiation checks in canvas tests
        // Use getByText for robustness
        // Use ID selector for robustness (bypassing pointer-events-none issues on children)
        const element = page.locator('#el_1');
        await expect(element).toBeVisible({ timeout: 20000 });
        // Click to select (add small wait for animation stability)
        await page.waitForTimeout(500);
        await element.click({ force: true });

        // Wait for panel to open and show correct context
        const panel = page.locator('#panel');
        await expect(panel).toBeVisible();
        // Check for either generic 'Element' header or specific label if updated
        await expect(panel.getByRole('heading', { name: "Element" })).toBeVisible({ timeout: 10000 });

        // 2. Change Type to Dropdown (Select)
        // Note: Label is "Field Type"
        await page.getByLabel('Field Type').selectOption('select');

        // 3. Verify Options Input appears
        const optionsInput = page.getByLabel('Options (comma separated)');
        await expect(optionsInput).toBeVisible();

        // 4. Add Options
        await optionsInput.fill('Option A,Option B,Option C');

        // 5. Change Type to Radio
        await page.getByLabel('Field Type').selectOption('radio');

        // 6. Verify Options interaction persists or input remains valid
        await expect(optionsInput).toBeVisible();
        await expect(optionsInput).toHaveValue('Option A,Option B,Option C');
    });

    test('should configure visibility logic', async ({ page }) => {
        // 1. Select Element 2
        const element2 = page.getByText('Element 2', { exact: true });
        await expect(element2).toBeVisible({ timeout: 20000 });
        await element2.click({ force: true });

        // Wait for panel to open
        const panel = page.locator('#panel');
        await expect(panel).toBeVisible();

        // 2. Switch to Logic Tab
        await page.getByRole('button', { name: 'Logic' }).click();

        // 3. Open Visibility Modal
        // Looking for card "Visibility Logic"
        await page.getByText('Visibility Logic').click();

        // 4. Verify Modal
        await expect(page.getByRole('heading', { name: 'Configure Visibility Logic' })).toBeVisible();

        // 5. Close Modal (basic check)
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.getByRole('heading', { name: 'Configure Visibility Logic' })).not.toBeVisible();
    });

});
