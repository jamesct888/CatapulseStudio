
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeTable } from './ModeTable';
import { ProcessDefinition, VisualTheme } from '../types';

// Mock ModalWrapper and LogicBuilder to isolate ModeTable logic
vi.mock('./ModalWrapper', () => ({
    ModalWrapper: ({ children, title, onClose }: any) => (
        <div data-testid="modal-wrapper">
            <h1>{title}</h1>
            <button onClick={onClose}>Close Modal</button>
            {children}
        </div>
    ),
}));

vi.mock('./LogicBuilder', () => ({
    LogicBuilder: () => <div data-testid="logic-builder">LogicBuilder Mock</div>,
}));

describe('ModeTable', () => {
    const mockSetProcessDef = vi.fn();

    const mockTheme: VisualTheme = {
        mode: 'type1', // Valid mode (type1 | type2 | type3)
        density: 'default', // Valid density
        radius: 'medium', // Valid radius
    };

    let initialProcessDef: ProcessDefinition;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.confirm to always return true
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        // Mock window.alert to avoid errors
        vi.spyOn(window, 'alert').mockImplementation(() => { });

        initialProcessDef = {
            id: 'proc_1',
            name: 'Test Process',
            description: 'Mock Description',
            stages: [
                {
                    id: 'stage_1',
                    title: 'Stage One',
                    sections: [
                        {
                            id: 'sec_1',
                            title: 'Section One',
                            layout: '1col',
                            elements: [
                                { id: 'el_1', type: 'text', label: 'Field A', required: false, options: [], visibility: undefined },
                                { id: 'el_2', type: 'select', label: 'Field B', required: true, options: ['Op1', 'Op2'], visibility: undefined },
                            ],
                        },
                    ],
                },
            ],
        };
    });

    it('renders stages, sections, and elements correctly', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        expect(screen.getByText(/Stage 1: Stage One/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Section One/i)[0]).toBeInTheDocument();
        expect(screen.getByDisplayValue('Field A')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Field B')).toBeInTheDocument();
    });

    it('calls setProcessDef when a field label is updated', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        const input = screen.getByDisplayValue('Field A');
        fireEvent.change(input, { target: { value: 'Field A Updated' } });

        expect(mockSetProcessDef).toHaveBeenCalledTimes(1);
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        expect(updatedDef.stages[0].sections[0].elements[0].label).toBe('Field A Updated');
    });

    it('calls setProcessDef when a field type is updated', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        // Using getAllByRole because there are multiple select elements (type, validation, etc.)
        // We can identify the type selector by its current value 'text' for the first element
        const selects = screen.getAllByRole('combobox');
        const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'text');

        if (!typeSelect) throw new Error('Type select not found');

        fireEvent.change(typeSelect, { target: { value: 'number' } });

        expect(mockSetProcessDef).toHaveBeenCalled();
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        expect(updatedDef.stages[0].sections[0].elements[0].type).toBe('number');
    });

    it('adds a new field when "Add Field" button is clicked', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        const addButton = screen.getByText("Add Field to 'Section One'");
        fireEvent.click(addButton);

        expect(mockSetProcessDef).toHaveBeenCalled();
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        expect(updatedDef.stages[0].sections[0].elements).toHaveLength(3);
        expect(updatedDef.stages[0].sections[0].elements[2].label).toBe('New Field');
    });

    it('duplicates a field when the duplicate button is clicked', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        // Find duplicate button by title
        const duplicateButtons = screen.getAllByTitle('Duplicate');
        fireEvent.click(duplicateButtons[0]);

        expect(mockSetProcessDef).toHaveBeenCalled();
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        // Should insert copy after the original
        expect(updatedDef.stages[0].sections[0].elements).toHaveLength(3);
        expect(updatedDef.stages[0].sections[0].elements[1].label).toContain('(Copy)');
    });

    it('deletes a field when the delete button is clicked and confirmed', () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        const deleteButtons = screen.getAllByTitle('Delete');
        fireEvent.click(deleteButtons[0]);

        expect(window.confirm).toHaveBeenCalled();
        expect(mockSetProcessDef).toHaveBeenCalled();
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        expect(updatedDef.stages[0].sections[0].elements).toHaveLength(1);
        expect(updatedDef.stages[0].sections[0].elements[0].id).toBe('el_2');
    });

    it('handles CSV import correctly', async () => {
        render(
            <ModeTable
                processDef={initialProcessDef}
                setProcessDef={mockSetProcessDef}
                visualTheme={mockTheme}
            />
        );

        const file = new File(
            ['StageID,StageTitle,SectionID,SectionTitle,ElementID,Label,Type\nstage_1,Stage One,sec_1,Section One,el_new,Imported Field,text'],
            'test.csv',
            { type: 'text/csv' }
        );

        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) throw new Error('File input not found');

        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for FileReader
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockSetProcessDef).toHaveBeenCalled();
        const updatedDef = mockSetProcessDef.mock.calls[0][0];
        // It should have matched existing stage/section and added the new element
        const elements = updatedDef.stages[0].sections[0].elements;
        expect(elements).toHaveLength(3); // 2 original + 1 imported
        expect(elements.find((e: any) => e.label === 'Imported Field')).toBeDefined();
    });
});
