
import { test, expect } from '@playwright/test';

test.describe('QA Mode & Analytics', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Gemini for Story Generation
        await page.route(/.*generateContent.*/, async route => {
            const request = route.request();
            const postData = request.postData() || '';

            if (postData.toLowerCase().includes('user stories') || postData.toLowerCase().includes('strategies')) {
                // Return User Stories
                const json = {
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify([
                                    {
                                        id: "us_1",
                                        title: "Mocked Story 1",
                                        narrative: "As a User, I want...",
                                        acceptanceCriteria: "GIVEN I am a user WHEN I do X THEN Y",
                                        dataElements: [
                                            { label: "Mock Field", type: "text" }
                                        ]
                                    }
                                ])
                            }],
                            finishReason: "STOP"
                        }
                    }]
                };
                await route.fulfill({ json, contentType: 'application/json' });
            } else {
                // Return Process Definition (Initial Generation)
                const json = {
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    id: "proc_qa",
                                    name: "QA Process",
                                    stages: [{
                                        id: "stg_1",
                                        name: "Stage 1",
                                        sections: [{ id: "sec_1", name: "Section 1", elements: [] }]
                                    }]
                                })
                            }],
                            finishReason: "STOP"
                        }
                    }]
                };
                await route.fulfill({ json, contentType: 'application/json' });
            }
        });

        // Start App and Generate Initial Process
        await page.goto('/');
        await page.locator('input[type="text"]').fill('Test Process');
        await page.getByRole('button', { name: 'Generate Process' }).click();
        await expect(page.getByText('Stage 1')).toBeVisible({ timeout: 20000 });
    });

    test('should generate user stories and switch tabs', async ({ page }) => {
        // Go to QA Mode
        await page.locator('#nav-qa').click();

        // Check we are on Stories tab by default
        await expect(page.getByRole('heading', { name: 'Stories & Test Cases' })).toBeVisible();

        // Click Generate Stories
        await page.getByRole('button', { name: 'Generate Stories' }).click();

        // Verify Mock Story Appears
        await expect(page.getByText('Mocked Story 1')).toBeVisible({ timeout: 10000 });

        // Assert Narrative content (click card to expand if needed, but text usually visible or in summary)
        // Check Data Dictionary Sync
        await page.locator('#tab-qa-dictionary').click();
        await expect(page.getByRole('heading', { name: 'Global Data Dictionary' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Mock Field' })).toBeVisible(); // Field label
        await expect(page.getByRole('cell', { name: 'text' })).toBeVisible();      // Type

        // Check Manual Cases Tab click
        await page.locator('#tab-qa-cases').click();
        await expect(page.getByRole('button', { name: 'Generate Test Cases' })).toBeVisible();
    });

    test('should support strategy advisor interaction', async ({ page }) => {
        await page.locator('#nav-qa').click();

        // Open Advisor
        await page.getByRole('button', { name: 'Strategy Advisor' }).click();

        // Expect Chat Panel
        await expect(page.getByText('AI Strategy Consultant')).toBeVisible();

        // Close Advisor
        await page.getByText('Close').click();
        await expect(page.getByText('AI Strategy Consultant')).not.toBeVisible();
    });
});
