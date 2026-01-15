
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Onboarding } from './Onboarding';
import { GALLERY_TEMPLATES } from '../templates';

describe('Onboarding', () => {
    const mockSetStartPrompt = vi.fn();
    const mockHandleStart = vi.fn();
    const mockHandleLegacyFormUpload = vi.fn();
    const mockHandleLoadTemplate = vi.fn();
    const mockHandleStartDemo = vi.fn();
    const mockSetIsDetailedMode = vi.fn();

    const defaultProps = {
        startPrompt: '',
        setStartPrompt: mockSetStartPrompt,
        handleStart: mockHandleStart,
        handleLegacyFormUpload: mockHandleLegacyFormUpload,
        handleLoadTemplate: mockHandleLoadTemplate,
        handleStartDemo: mockHandleStartDemo,
        showDemoDrop: false,
        isDetailedMode: false,
        setIsDetailedMode: mockSetIsDetailedMode,
    };

    it('renders the welcome message and input field', () => {
        render(<Onboarding {...defaultProps} />);
        expect(screen.getByText(/What do you want to build?/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Pension Transfer In/i)).toBeInTheDocument();
    });

    it('calls setStartPrompt when typing in the input', () => {
        render(<Onboarding {...defaultProps} />);
        const input = screen.getByPlaceholderText(/e.g. Pension Transfer In/i);
        fireEvent.change(input, { target: { value: 'New Process' } });
        expect(mockSetStartPrompt).toHaveBeenCalledWith('New Process');
    });

    it('calls handleStart when clicking the generate button', () => {
        render(<Onboarding {...defaultProps} />);
        const button = screen.getByLabelText('Generate Process');
        fireEvent.click(button);
        expect(mockHandleStart).toHaveBeenCalled();
    });

    it('renders gallery templates and handles click', () => {
        // Enable workshop templates via Magic URL
        const originalUrl = window.location.href;
        window.history.pushState({}, 'Test Page', '/?workshop=true');

        render(<Onboarding {...defaultProps} />);
        // Check if at least one template title is rendered
        const templateTitle = GALLERY_TEMPLATES[0].title;
        expect(screen.getByText(templateTitle)).toBeInTheDocument();

        // Click the first template
        fireEvent.click(screen.getByText(templateTitle));
        expect(mockHandleLoadTemplate).toHaveBeenCalledWith(expect.objectContaining({
            id: GALLERY_TEMPLATES[0].processDef.id
        }));

        // Cleanup
        window.history.pushState({}, 'Test Page', originalUrl);
    });

    it('triggers file input click when import button is clicked', async () => {
        render(<Onboarding {...defaultProps} />);
        const importBtn = screen.getByText(/Import from Document/i);

        // Mock the file input click
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const clickSpy = vi.spyOn(fileInput, 'click');

        fireEvent.click(importBtn);
        expect(clickSpy).toHaveBeenCalled();
    });

    it('renders the demo drop animation when showDemoDrop is true', () => {
        render(<Onboarding {...defaultProps} showDemoDrop={true} />);
        expect(screen.getByText('claim_form.pdf')).toBeInTheDocument();
    });
});
