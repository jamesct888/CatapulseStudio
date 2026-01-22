import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import { vi, describe, it, expect } from 'vitest';

// Mock child components to isolate App logic and avoid deep rendering issues
vi.mock('./components/PartiesManager', () => ({
    PartiesManager: () => <div data-testid="parties-manager">PartiesManager</div>
}));

describe('App Hook Regression', () => {
    it('should not throw "Rendered more hooks" error when transitioning from loading to loaded', async () => {
        const { unmount } = render(<App />);

        // 1. Initial render is Onboarding.
        expect(screen.getByText(/What do you want to build/i)).toBeInTheDocument();

        // 2. Trigger state change: Onboarding -> Editor
        const demoBtn = screen.getByText(/Interactive Demo/i);
        demoBtn.click();

        // 3. Wait for Editor to appear
        // If the hook order was wrong, React would throw immediately here and we'd likely see Error Boundary text.
        try {
            await waitFor(() => {
                // Check for the process name which appears in the header or canvas
                const processName = screen.getByText(/Pension Transfer Request/i);
                expect(processName).toBeInTheDocument();
            }, { timeout: 3000 });
        } catch (e) {
            // Check if we crashed
            const errorBoundary = screen.queryByText(/Something went wrong/i);
            if (errorBoundary) {
                // Print the error details if visible
                screen.debug();
                throw new Error("App crashed: " + errorBoundary.innerHTML);
            }

            // If not crashed, just timed out finding the text.
            // Print debug to see what IS there.
            console.log("Timeout waiting for 'Pension Transfer Request'. Current DOM:");
            screen.debug();
            throw e;
        }

        unmount();
    });
});
