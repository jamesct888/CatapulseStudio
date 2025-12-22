
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModePreview } from './ModePreview';
import { ProcessDefinition, FormState, VisualTheme } from '../types';
import * as geminiService from '../services/geminiService';

// Mock sub-components
vi.mock('./OperationsHUD', () => ({
    OperationsHUD: ({ requiredSkill }: any) => <div data-testid="operations-hud">HUD: {requiredSkill}</div>,
}));

// Mock the AI service
vi.mock('../services/geminiService', () => ({
    generateFormData: vi.fn(),
}));

describe('ModePreview', () => {
    const mockSetFormData = vi.fn();
    const mockSetFormErrors = vi.fn();
    const mockSetPersonaPrompt = vi.fn();

    const sampleProcess: ProcessDefinition = {
        id: 'proc_1',
        name: 'Test Process',
        stages: [
            {
                id: 'stage_1',
                title: 'Stage One',
                sections: [
                    {
                        id: 'sec_1',
                        title: 'Section One',
                        elements: [
                            { id: 'el_1', type: 'text', label: 'Required Field', required: true, visibility: { conditions: [], groups: [] } }
                        ]
                    }
                ]
            },
            {
                id: 'stage_2',
                title: 'Stage Two',
                sections: []
            }
        ]
    };

    const defaultProps = {
        processDef: sampleProcess,
        formData: {} as FormState,
        setFormData: mockSetFormData,
        formErrors: {},
        setFormErrors: mockSetFormErrors,
        // Provide a complete theme object to avoid "undefined" errors in FormElements
        visualTheme: { mode: 'type1', density: 'default', radius: 'medium' } as VisualTheme,
        personaPrompt: '',
        setPersonaPrompt: mockSetPersonaPrompt,
        userStories: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the current stage title', () => {
        render(<ModePreview {...defaultProps} />);
        // Use heading role to avoid ambiguity with breadcrumbs or logs
        expect(screen.getByRole('heading', { name: 'Stage One', level: 3 })).toBeInTheDocument();
    });

    it('blocks navigation if required fields are missing', () => {
        render(<ModePreview {...defaultProps} />);
        const nextButton = screen.getByText('Next Step');
        fireEvent.click(nextButton);

        // Should call setFormErrors with an error for el_1
        expect(mockSetFormErrors).toHaveBeenCalledWith(expect.objectContaining({
            el_1: 'This field is required'
        }));

        // Should NOT advance stage (Still seeing Stage One heading)
        expect(screen.getByRole('heading', { name: 'Stage One', level: 3 })).toBeInTheDocument();
    });

    it('allows navigation when data is valid', async () => {
        // Render with valid formData
        render(<ModePreview {...defaultProps} formData={{ el_1: 'Valid Value' }} />);

        const nextButton = screen.getByText('Next Step');
        fireEvent.click(nextButton);

        // Should advance to Stage Two
        // Navigation might invoke state updates, so findBy is safer
        expect(await screen.findByRole('heading', { name: 'Stage Two', level: 3 })).toBeInTheDocument();
    });

    it('supports back navigation', async () => {
        render(<ModePreview {...defaultProps} formData={{ el_1: 'Valid Value' }} />);

        // Go forward
        fireEvent.click(screen.getByText('Next Step'));
        expect(await screen.findByRole('heading', { name: 'Stage Two', level: 3 })).toBeInTheDocument();

        // Go back
        fireEvent.click(screen.getByText(/Back/i));
        expect(await screen.findByRole('heading', { name: 'Stage One', level: 3 })).toBeInTheDocument();
    });

    it('triggers auto-fill and updates form data', async () => {
        const mockGeneratedData = { el_1: 'AI Generated' };
        vi.mocked(geminiService.generateFormData).mockResolvedValue(mockGeneratedData);

        render(<ModePreview {...defaultProps} />);

        const autoFillBtn = screen.getByText(/Auto-Fill/i);
        fireEvent.click(autoFillBtn);

        await waitFor(() => {
            expect(geminiService.generateFormData).toHaveBeenCalled();
            // Verify setFormData was called (wraps callback)
            expect(mockSetFormData).toHaveBeenCalled();
        });
    });

    it('renders the Operations HUD', async () => {
        render(<ModePreview {...defaultProps} />);
        // HUD rendering is controlled by useEffect, so wait for it
        expect(await screen.findByTestId('operations-hud')).toBeInTheDocument();
    });
});
