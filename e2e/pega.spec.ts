
import { test, expect } from '@playwright/test';

test.describe('Pega Mode', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Gemini
        await page.route(/.*generateContent.*/, async route => {
            const json = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                id: "p1",
                                name: "Pega Test",
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
        await page.locator('input[type="text"]').fill('Pega Flow');
        await page.getByRole('button', { name: 'Generate Process' }).click();
        await expect(page.getByText('Stage 1')).toBeVisible({ timeout: 20000 });
    });

    test('should load Pega dashboard and tabs', async ({ page }) => {
        // Switch to Pega Mode
        await page.locator('#nav-pega').click();

        // Assert Dashboard Header
        // Switch to Blueprint Tab
        await page.locator('#tab-pega-blueprint').click();

        // Assert Dashboard Header
        await expect(page.getByRole('heading', { name: 'Pega GenAI Blueprint™ Prompt' })).toBeVisible();

        // Check Design Tab
        await page.locator('#tab-pega-design').click();
        await expect(page.getByText('Primary Stage').first()).toBeVisible();

        // Switch to Data Tab
        await page.getByRole('button', { name: 'Data Model' }).click();
        await expect(page.getByText('Data Objects & References')).toBeVisible();

        // Switch to Logic Tab
        await page.getByRole('button', { name: 'Logic & Routing' }).click();
        await expect(page.getByText('Routing & SLA Configurati...')).toBeVisible(); // Truncated text matching
    });
});
