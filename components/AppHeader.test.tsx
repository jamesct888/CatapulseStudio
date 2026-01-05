
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { ProcessDefinition } from '../types';

// Mock sub-components to isolate AppHeader tests
vi.mock('./HeaderCloudControls', () => ({
    HeaderCloudControls: () => <div data-testid="cloud-controls">Cloud Controls</div>,
}));

vi.mock('./HeaderWorkshopControls', () => ({
    HeaderWorkshopControls: () => <div data-testid="workshop-controls">Workshop Controls</div>,
}));

vi.mock('./HeaderFileMenu', () => ({
    HeaderFileMenu: () => <div data-testid="file-menu">File Menu</div>,
}));

describe('AppHeader', () => {
    const mockSetProcessDef = vi.fn();
    const mockSetViewMode = vi.fn();
    const mockSetIsSettingsOpen = vi.fn();
    const mockOnExternalSave = vi.fn();

    const sampleProcess: ProcessDefinition = {
        id: 'proc_123',
        name: 'My Process',
        description: '', // Added missing required property
        stages: []
    };

    const defaultProps = {
        processDef: sampleProcess,
        setProcessDef: mockSetProcessDef,
        viewMode: 'editor' as const,
        setViewMode: mockSetViewMode,
        isSettingsOpen: false,
        setIsSettingsOpen: mockSetIsSettingsOpen,
        isDirty: false,
        onExternalSave: mockOnExternalSave,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the header with process name', () => {
        render(<AppHeader {...defaultProps} />);
        expect(screen.getByText('My Process')).toBeInTheDocument();
        expect(screen.getByText('proc_123')).toBeInTheDocument();
    });

    it('renders all navigation tabs', () => {
        render(<AppHeader {...defaultProps} />);
        expect(screen.getByText('Design')).toBeInTheDocument();
        expect(screen.getByText('Grid')).toBeInTheDocument();
        expect(screen.getByText('Flow')).toBeInTheDocument();
        expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('calls setViewMode when a tab is clicked', () => {
        render(<AppHeader {...defaultProps} />);
        fireEvent.click(screen.getByText('Flow'));
        expect(mockSetViewMode).toHaveBeenCalledWith('flow');
    });

    it('toggles settings panel when settings button is clicked', () => {
        render(<AppHeader {...defaultProps} />);
        // Settings button is only visible in editor mode (which is default here)
        // Find by icon is tricky with screen queries, so we use container selector or add aria-label/id
        // The component has id="btn-settings"
        const settingsBtn = document.querySelector('#btn-settings');
        expect(settingsBtn).toBeInTheDocument();
        if (settingsBtn) {
            fireEvent.click(settingsBtn);
            expect(mockSetIsSettingsOpen).toHaveBeenCalledWith(true);
        }
    });

    it('allows renaming the process', () => {
        render(<AppHeader {...defaultProps} />);

        // click the name button to enter edit mode
        fireEvent.click(screen.getByTitle('Click to rename process'));

        // logic switches to input
        const input = screen.getByDisplayValue('My Process');
        fireEvent.change(input, { target: { value: 'Renamed Process' } });
        fireEvent.blur(input);

        expect(mockSetProcessDef).toHaveBeenCalled();
        const updateCall = mockSetProcessDef.mock.calls[0][0];
        // The updater logic might be functional or direct object
        // The component calls setProcessDef({ ...processDef, name: tempName })
        expect(updateCall.name).toBe('Renamed Process');
    });

    it('reverts rename on escape', () => {
        render(<AppHeader {...defaultProps} />);
        fireEvent.click(screen.getByTitle('Click to rename process'));

        const input = screen.getByDisplayValue('My Process');
        fireEvent.change(input, { target: { value: 'Should Revert' } });
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

        expect(mockSetProcessDef).not.toHaveBeenCalled();
        // Should return to button view
        expect(screen.getByTitle('Click to rename process')).toBeInTheDocument();
    });
});
