
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesPanel } from './PropertiesPanel';
import { ElementDefinition } from '../types';

// Mock Modal components to avoid deep rendering issues in unit tests
// We only want to test that the modal was *triggered*, not the modal internals again (they have their own tests potentially)
vi.mock('./properties/SkillLogicModal', () => ({ SkillLogicModal: () => <div data-testid="skill-modal" /> }));
vi.mock('./properties/VisibilityLogicModal', () => ({ VisibilityLogicModal: () => <div data-testid="vis-modal" /> }));
vi.mock('./properties/SkipLogicModal', () => ({ SkipLogicModal: () => <div data-testid="skip-modal" /> }));
vi.mock('./properties/ValidationRulesModal', () => ({ ValidationRulesModal: () => <div data-testid="val-modal" /> }));
vi.mock('./properties/CalculationBuilder', () => ({ CalculationBuilder: () => <div data-testid="calc-builder" /> }));

describe('PropertiesPanel Component', () => {

    // Setup Mock Props
    const mockElement: ElementDefinition = {
        id: 'el_1',
        type: 'text',
        label: 'Test Field',
        required: false
    };

    const defaultProps = {
        selectedElement: mockElement,
        selectedSection: null,
        selectedStage: null,
        allElements: [mockElement],
        activeTab: 'general' as const,
        onTabChange: vi.fn(),
        onUpdateElement: vi.fn(),
        onUpdateSection: vi.fn(),
        onUpdateStage: vi.fn(),
        onDeleteElement: vi.fn(),
        onDeleteSection: vi.fn(),
        onDeleteStage: vi.fn(),
        onOpenSettings: vi.fn(),
        onClose: vi.fn(),
    };

    it('should render correct header for an element', () => {
        render(<PropertiesPanel {...defaultProps} />);
        expect(screen.getByText('Element')).toBeDefined();
        expect(screen.getByText('ID: el_1')).toBeDefined();
        // Check Badge
        expect(screen.getByText('text')).toBeDefined();
    });

    it('should display General tab content by default', () => {
        render(<PropertiesPanel {...defaultProps} />);
        expect(screen.getByDisplayValue('Test Field')).toBeDefined(); // Label input
        expect(screen.getByText('Field Label')).toBeDefined();
    });

    it('should call onTabChange when Logic tab is clicked', async () => {
        const user = userEvent.setup();
        const onTabChange = vi.fn();
        render(<PropertiesPanel {...defaultProps} onTabChange={onTabChange} />);

        await user.click(screen.getByText('Logic & Rules'));
        expect(onTabChange).toHaveBeenCalledWith('logic');
    });

    it('should allow editing the label', async () => {
        const onUpdateElement = vi.fn();
        render(<PropertiesPanel {...defaultProps} onUpdateElement={onUpdateElement} />);

        const input = screen.getByDisplayValue('Test Field');
        // Use fireEvent for controlled inputs in stateless unit tests to avoid "type" confusion
        fireEvent.change(input, { target: { value: 'New Label' } });

        // Ensure onUpdateElement called with updated object
        expect(onUpdateElement).toHaveBeenCalledWith(expect.objectContaining({
            label: 'New Label'
        }));
    });

    it('should render Logic Tab content when active', () => {
        render(<PropertiesPanel {...defaultProps} activeTab="logic" />);
        expect(screen.getByText('Visibility Rules')).toBeDefined();
        expect(screen.getByText('Mandatory Rules')).toBeDefined();
        expect(screen.getByText('Validation')).toBeDefined();
    });

    it('should trigger delete callback confirmation', async () => {
        const user = userEvent.setup();
        const onDeleteElement = vi.fn();
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(<PropertiesPanel {...defaultProps} onDeleteElement={onDeleteElement} />);

        // Find delete button
        const deleteBtn = screen.getByText(/Delete Field/i);
        await user.click(deleteBtn);

        expect(window.confirm).toHaveBeenCalled();
        expect(onDeleteElement).toHaveBeenCalledWith('el_1');
    });

    // --- REGRESSION TESTS ---

    it('should NOT render Section Layout/Style controls when an element is selected', () => {
        // Even if a section is passed as parent context
        render(<PropertiesPanel
            {...defaultProps}
            selectedSection={{ id: 'sec_1', title: 'Parent Section', elements: [mockElement], variant: 'default' } as any}
        />);

        // Should see Element stuff
        expect(screen.getByText('Field Type')).toBeDefined();

        // Should NOT see Section stuff
        expect(screen.queryByText('Layout Columns')).toBeNull();
        expect(screen.queryByText('Section Style')).toBeNull();
    });

    it('should render Section Layout/Style controls when ONLY section is selected', () => {
        render(<PropertiesPanel
            {...defaultProps}
            selectedElement={null}
            selectedSection={{ id: 'sec_1', title: 'Parent Section', elements: [], variant: 'default' } as any}
        />);

        expect(screen.getByText('Layout Columns')).toBeDefined();
        expect(screen.getByText('Section Style')).toBeDefined();
    });

    it('should filter Field Type options when Section Variant is INFO', () => {
        render(<PropertiesPanel
            {...defaultProps}
            selectedSection={{ id: 'sec_1', title: 'Info Box', elements: [mockElement], variant: 'info' } as any}
        />);

        const select = screen.getByRole('combobox'); // The Field Type select
        // In unit tests getting options can be done via checking children
        const options = Array.from(select.querySelectorAll('option')).map(opt => opt.value);

        // Should only have static/calculated
        expect(options).toContain('static');
        expect(options).toContain('calculated');
        expect(options).not.toContain('text');
        expect(options).not.toContain('number');
    });

    it('should SHOW all Field Type options when Section Variant is DEFAULT', () => {
        render(<PropertiesPanel
            {...defaultProps}
            selectedSection={{ id: 'sec_1', title: 'Standard Box', elements: [mockElement], variant: 'default' } as any}
        />);

        const select = screen.getByRole('combobox');
        const options = Array.from(select.querySelectorAll('option')).map(opt => opt.value);

        expect(options).toContain('text');
        expect(options).toContain('static');
    });

});
