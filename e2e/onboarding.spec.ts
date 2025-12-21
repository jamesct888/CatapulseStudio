import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the Gemini API call to return a valid process definition
        // Use Regex to match any generateContent call
        await page.route(/.*generateContent.*/, async route => {
            console.log('*** MOCK HIT: generateContent ***');
            const json = {
                candidates: [{
                    finishReason: "STOP",
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "proc_123",
                                name: "Mocked Process",
                                stages: [
                                    {
                                        id: "stg_1",
                                        name: "Stage 1",
                                        sections: [
                                            {
                                                id: "sec_1",
                                                name: "Section 1",
                                                elements: [
                                                    { id: "el_1", type: "text", label: "Mock Element" }
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
            await route.fulfill({ json, contentType: 'application/json' });
        });

        await page.goto('/');
    });

    test('should allow entering a prompt and generating a process', async ({ page }) => {
        // 1. Initial State: Input field and Generate button
        const textarea = page.getByPlaceholder(/e.g. Pension Transfer In/i);
        const generateBtn = page.getByRole('button', { name: /Generate Process/i });

        // If placeholder/button text is different, we'll fail and fix.
        // Assuming standard "Describe..." and "Generate" or similar.

        // Check if we are on onboarding
        await expect(textarea).toBeVisible();

        // 2. Interaction: Type prompt
        await textarea.fill('Create a simple login process');

        // 3. Click Generate
        await generateBtn.click();

        // 4. Verify loading state (optional, might happen too fast with mock)
        // await expect(page.getByText('Generating...')).toBeVisible();

        // 5. Verify transition to Editor
        // After "generation", the App switches to 'editor' mode.
        // Editor has a "Properties" panel or "Stages" list.
        await expect(page.getByText('Stage 1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Mocked Process')).toBeVisible();
    });
});
