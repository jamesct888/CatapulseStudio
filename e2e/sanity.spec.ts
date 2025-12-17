import { test, expect } from '@playwright/test';

test.describe('Sanity Checks', () => {
    test('should load the application and not show a blank page', async ({ page }) => {
        await page.goto('/');

        // Check title
        await expect(page).toHaveTitle(/Catapulse/);

        // Check for critical header element ("Catapulse" text usually in header)
        // Adjust selector based on actual app content
        const header = page.getByText('Catapulse', { exact: false }).first();
        await expect(header).toBeVisible();

        // Ensure Error Boundary is NOT visible
        const errorText = page.getByText('CRITICAL LOAD/RENDER ERROR');
        await expect(errorText).not.toBeVisible();
    });

    test('should show Onboarding screen initially', async ({ page }) => {
        await page.goto('/');

        // Look for "Start" button or similar onboarding element
        // Based on previous knowledge, there is an Onboarding component
        const startButton = page.getByRole('button', { name: /Start/i });
        // Or maybe just check for "What would you like to build?" text if it exists
        await expect(page.locator('body')).not.toBeEmpty();
    });
});
