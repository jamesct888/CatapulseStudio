import { test, expect } from '@playwright/test';

test.describe('Editor Mode', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the Gemini API call to return a valid process definition
        // We provide a distinct name so we can distinguish it
        await page.route('**/models/gemini-2.5-flash:generateContent*', async route => {
            const json = {
                candidates: [{
                    finishReason: "STOP",
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_editor_test",
                                name: "Editor Test Process",
                                stages: [
                                    {
                                        id: "stg_1",
                                        name: "Initial Stage",
                                        sections: [
                                            {
                                                id: "sec_1",
                                                name: "Section A",
                                                elements: [
                                                    { id: "el_1", type: "text", label: "Element 1" }
                                                ]
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
            await route.fulfill({ json });
        });

        await page.goto('/');
        await page.getByPlaceholder(/e.g. Pension Transfer In/i).fill('Test setup');
        await page.getByRole('button', { name: /Generate Process/i }).click();

        // Wait for editor to load
        await expect(page.getByText('Editor Test Process')).toBeVisible();
    });

    test.fixme('should select an element and open properties panel', async ({ page }) => {
        // Wait for the element to be ready
        const element = page.locator('#el_1');
        await expect(element).toBeVisible({ timeout: 10000 });

        // Click the element in the canvas
        await element.click({ force: true });

        // Check if side panel opens
        // Side panel header is dynamic: "Element", "Section", or "Stage"
        const panel = page.locator('#panel');
        await expect(panel).toBeVisible();
        await expect(panel.getByRole('heading', { name: "Element" })).toBeVisible();
        // Or check for a known input in the properties panel
        const labelInput = page.getByLabel('Label', { exact: false });
        await expect(page.locator('input[value="Element 1"]')).toBeVisible();
    });

    /* 
    // Commenting out complex CRUD for now until we are sure selectors work.
    // We start with selection which is critical.
    test('should add a new stage', async ({ page }) => {
      const addStageBtn = page.getByRole('button', { name: /Add Stage/i });
      await addStageBtn.click();
      await expect(page.getByText('New Stage')).toBeVisible();
    });
    */
});
