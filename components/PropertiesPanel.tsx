
import React, { useEffect, useState } from 'react';
import { ElementDefinition, SectionDefinition, StageDefinition, SkillRule, LogicGroup, RepeaterColumn, VisualTheme, CalculationPart } from '../types';
import { X, Search, ChevronRight, Hash, Eye, Globe, ChevronDown, CheckCircle2, ShieldCheck, Calculator, AlertTriangle, FastForward, Trash2, ArrowRight, Layout, Type, Calendar, Copy, Clipboard, ClipboardPaste } from 'lucide-react';
import { LogicBuilder } from './LogicBuilder';
import { ModalWrapper } from './ModalWrapper';
import { formatLogicSummary } from '../utils/logic';
// Imported Sub-Components
import { CalculationBuilder } from './properties/CalculationBuilder';
import { ValidationRulesModal } from './properties/ValidationRulesModal';
import { SkillLogicModal } from './properties/SkillLogicModal';
import { VisibilityLogicModal } from './properties/VisibilityLogicModal';
import { SkipLogicModal } from './properties/SkipLogicModal';

interface PropertiesPanelProps {
    selectedElement: ElementDefinition | null;
    selectedSection: SectionDefinition | null;
    selectedStage: StageDefinition | null;
    allElements: ElementDefinition[];
    activeTab: 'general' | 'logic';
    onTabChange: (tab: 'general' | 'logic') => void;
    onUpdateElement: (el: ElementDefinition) => void;
    onUpdateSection: (sec: SectionDefinition) => void;
    onUpdateStage: (stg: StageDefinition) => void;
    onDeleteElement: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onDeleteStage: (id: string) => void;
    visualTheme?: VisualTheme;
    onOpenSettings: () => void;
    onClose: () => void;
    // Clipboard Props
    clipboardStageLogic?: SkillRule[] | null;
    onCopyStageLogic?: (rules: SkillRule[]) => void;
    onPasteStageLogic?: (stageId: string) => void;
    // Navigation Callbacks
    onSelectStage?: (id: string) => void;
    onSelectSection?: (id: string) => void;

    onSelectElement?: (id: string) => void;
    // Global Option Sync
    onSyncGlobalOptions?: (elementType: string, options: any[]) => void;
}


const generateIdFromLabel = (label: string): string => {
    // CamelCase generator: "Member Details" -> "memberDetails"
    return label
        .replace(/[^a-zA-Z0-9 ]/g, '') // Remove special chars
        .split(' ')
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
};

const COMMON_SKILLS = [
    "Customer Service",
    "Senior Underwriter",
    "Compliance Officer",
    "Claims Handler",
    "Finance Manager",
    "System Admin"
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedElement,
    selectedSection,
    selectedStage,
    allElements,
    activeTab,
    onTabChange,
    onUpdateElement,
    onUpdateSection,
    onUpdateStage,
    onDeleteElement,
    onDeleteSection,
    onDeleteStage,
    visualTheme,
    onOpenSettings,
    onClose,
    clipboardStageLogic,
    onCopyStageLogic,
    onPasteStageLogic,
    onSelectStage,
    onSelectSection,
    onSelectElement,
    onSyncGlobalOptions
}) => {
    // --- STATE ---
    const [modals, setModals] = useState<{
        skill: boolean;
        visibility: boolean;
        required: boolean;
        validation: boolean;
        skip: boolean;
    }>({ skill: false, visibility: false, required: false, validation: false, skip: false });

    // Specific modal state
    const [activeRuleIndex, setActiveRuleIndex] = useState<number | null>(null);
    const [modalSize, setModalSize] = useState({ width: 800, height: 600 });
    const [isResizingModal, setIsResizingModal] = useState(false);

    // --- EFFECT: Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' && activeTab === 'general' && !modals.skill && !modals.visibility) { // Prevent if modal open
                // Safety check: Don't delete if focusing input
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
                handleDelete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElement, selectedSection, selectedStage, activeTab, modals]);

    // --- MOUSE HANDLERS (Modal Resize) ---
    const handleModalMouseMove = (e: React.MouseEvent) => {
        if (isResizingModal) {
            setModalSize(prev => ({
                width: Math.max(400, prev.width + e.movementX),
                height: Math.max(300, prev.height + e.movementY)
            }));
        }
    };
    const handleModalMouseUp = () => setIsResizingModal(false);

    // --- HELPER: Available Targets (for logic) ---
    // Prevent cyclical logic (e.g. A depends on B, B depends on A)
    // For now, just exclude self.
    const getAvailableTargets = () => {
        if (selectedElement) return allElements.filter(e => e.id !== selectedElement.id);
        return allElements; // Sections/Stages can depend on any element
    };

    // --- CHANGE HANDLERS ---
    const handleChange = (field: string, value: any) => {
        let updates: any = { [field]: value };

        // Smart ID Generation for Elements
        if (selectedElement && field === 'label' && typeof value === 'string') {
            const currentId = selectedElement.id;
            const oldSmartId = generateIdFromLabel(selectedElement.label || '');

            // Allow update if:
            // 1. ID is a default "el_..." ID
            // 2. ID is the fallback "field"
            // 3. ID matches what the previous label would generate (e.g. user is typing)
            const isSyncing = currentId.startsWith('el_') || currentId === 'field' || currentId === oldSmartId;

            if (isSyncing) {
                let newId = generateIdFromLabel(value);
                if (newId.length < 2) newId = 'field'; // Minimum length safety

                // Ensure uniqueness
                const isTaken = (id: string) => allElements.some(e => e.id === id && e.id !== currentId);
                let uniqueId = newId;
                let counter = 1;
                while (isTaken(uniqueId)) {
                    uniqueId = `${newId}${counter}`;
                    counter++;
                }
                updates.id = uniqueId;
            }
        }

        // --- PRE-FILL: Auto-populate options for 'manage_requirements' ---
        // If user switches type to 'manage_requirements', try to find an existing one to copy options from.
        if (selectedElement && field === 'type' && value === 'manage_requirements') {
            const existingMR = allElements.find(e => e.type === 'manage_requirements' && e.id !== selectedElement.id);
            if (existingMR && existingMR.options && existingMR.options.length > 0) {
                updates.options = existingMR.options;
            }
        }

        // --- GLOBAL SYNC: If updating options for 'manage_requirements', trigger sync ---
        if (selectedElement && field === 'options' && selectedElement.type === 'manage_requirements' && onSyncGlobalOptions) {
            onSyncGlobalOptions('manage_requirements', value);
        }

        if (selectedElement) onUpdateElement({ ...selectedElement, ...updates });
        else if (selectedSection) onUpdateSection({ ...selectedSection, ...updates });
        else if (selectedStage) onUpdateStage({ ...selectedStage, ...updates });
    };

    const handleRepeaterChange = (cols: RepeaterColumn[]) => {
        if (selectedElement && selectedElement.type === 'repeater') {
            onUpdateElement({ ...selectedElement, columns: cols });
        }
    };

    const handleDelete = () => {
        if (selectedElement && confirm('Delete this field?')) onDeleteElement(selectedElement.id);
        else if (selectedSection && confirm('Delete section and all its fields?')) onDeleteSection(selectedSection.id);
        else if (selectedStage && confirm('Delete stage and all its content?')) onDeleteStage(selectedStage.id);
    };

    // --- LOGIC HELPERS ---
    const ensureLogicGroup = (field: 'visibility' | 'requiredLogic' | 'skipLogic') => {
        // Initialize logic group if missing
        if (selectedElement && field === 'visibility' && !selectedElement.visibility) {
            onUpdateElement({ ...selectedElement, visibility: { id: 'root', operator: 'AND', conditions: [] } });
        } else if (selectedElement && field === 'requiredLogic' && !selectedElement.requiredLogic) {
            onUpdateElement({ ...selectedElement, requiredLogic: { id: 'root', operator: 'AND', conditions: [] } });
        } else if (selectedSection && field === 'visibility' && !selectedSection.visibility) {
            onUpdateSection({ ...selectedSection, visibility: { id: 'root', operator: 'AND', conditions: [] } });
        } else if (selectedStage && field === 'skipLogic' && !selectedStage.skipLogic) {
            onUpdateStage({ ...selectedStage, skipLogic: { id: 'root', operator: 'AND', conditions: [] } });
        }
    };

    const handleCopyRules = () => {
        if (selectedStage && selectedStage.skillLogic && onCopyStageLogic) {
            onCopyStageLogic(selectedStage.skillLogic);
            // Visual feedback could be added here (toast)
        }
    };

    const handlePasteRules = () => {
        if (selectedStage && onPasteStageLogic) {
            onPasteStageLogic(selectedStage.id);
        }
    };

    // --- RENDER HELPERS ---
    const renderHeader = () => {
        // BREADCRUMBS
        return (
            <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                    <nav className="flex items-center text-xs text-gray-500 mb-1 space-x-1">
                        {/* STAGE */}
                        <button
                            onClick={() => selectedStage && onSelectStage?.(selectedStage.id)}
                            className="hover:text-sw-teal hover:underline transition-colors truncate max-w-[80px]"
                            title={selectedStage?.title}
                        >
                            {selectedStage?.title || 'Stage'}
                        </button>

                        {(selectedSection || selectedElement) && <ChevronRight size={10} />}

                        {/* SECTION */}
                        {(selectedSection || selectedElement) && (
                            <button
                                onClick={() => selectedSection && onSelectSection?.(selectedSection.id)}
                                className={`truncate max-w-[100px] transition-colors ${!selectedElement ? 'font-bold text-sw-teal' : 'hover:text-sw-teal hover:underline'}`}
                                title={selectedSection?.title}
                                disabled={!selectedElement} // If section is selected, meaningful to disable/highlight
                            >
                                {selectedSection?.title || 'Section'}
                            </button>
                        )}

                        {selectedElement && <ChevronRight size={10} />}

                        {/* ELEMENT */}
                        {selectedElement && (
                            <span className="font-bold text-sw-teal truncate max-w-[120px]" title={selectedElement.label}>
                                {selectedElement.label || 'Element'}
                            </span>
                        )}
                    </nav>

                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-serif text-sw-teal truncate">
                            {selectedElement ? 'Element' : selectedSection ? 'Section' : 'Stage'}
                        </h2>
                        {selectedElement && (
                            <span className="bg-sw-teal/10 text-sw-teal px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                {selectedElement.type}
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-300 font-mono mt-0.5">
                        ID: {selectedElement?.id || selectedSection?.id || selectedStage?.id}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
        );
    };

    // --- MAIN RENDER ---
    const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";
    const inputClass = "w-full p-2.5 bg-white text-sw-text border border-gray-200 rounded-lg focus:outline-none focus:border-sw-teal focus:ring-1 focus:ring-sw-teal transition-all text-sm";

    if (!selectedElement && !selectedSection && !selectedStage) return null;

    return (
        <div
            className="h-full bg-white border-l border-gray-200 flex flex-col shadow-2xl relative"
            style={{ width: '100%' }} // Controlled by parent container 
            onMouseMove={handleModalMouseMove}
            onMouseUp={handleModalMouseUp}
        >
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                {renderHeader()}

                {/* TABS */}
                <div id="prop-tabs" className="flex p-1 bg-gray-200/50 rounded-lg mt-4">
                    <button
                        onClick={() => onTabChange('general')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'general' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => onTabChange('logic')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'logic' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Logic & Rules
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* --- GENERAL TAB --- */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Title/Label Input */}
                        <div>
                            <label className={labelClass}>{selectedElement ? 'Field Label' : selectedSection ? 'Section Title' : 'Stage Title'}</label>
                            <div className="relative">
                                <input
                                    id="prop-label"
                                    type="text"
                                    value={selectedElement ? selectedElement.label : selectedSection ? selectedSection.title : selectedStage ? selectedStage.title : ''}
                                    onChange={(e) => handleChange(selectedElement ? 'label' : 'title', e.target.value)}
                                    className={`${inputClass} pl-9 font-medium`}
                                    placeholder="Enter title..."
                                />
                                <Type size={16} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>

                        {/* ID (Read-onlyish or editable) */}
                        <div>
                            <label className={labelClass}>System ID</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={selectedElement?.id || selectedSection?.id || selectedStage?.id || ''}
                                    className={`${inputClass} pl-9 bg-gray-50 text-gray-500 font-mono text-xs`}
                                    readOnly
                                />
                                <Hash size={16} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>

                        {/* --- SECTION SPECIFIC GENERAL --- */}
                        {selectedSection && !selectedElement && (
                            <>
                                <div>
                                    <label className={labelClass}>Layout Columns</label>
                                    <div id="prop-section-layout" className="flex bg-gray-100 p-1 rounded-lg gap-1">
                                        {[
                                            { id: '1col', label: '1 Column', icon: <div className="w-full h-2 bg-current rounded-sm opacity-40"></div> },
                                            { id: '2col', label: '2 Col', icon: <div className="flex gap-0.5"><div className="w-1/2 h-2 bg-current rounded-sm opacity-40"></div><div className="w-1/2 h-2 bg-current rounded-sm opacity-40"></div></div> },
                                            { id: '3col', label: '3 Col', icon: <div className="flex gap-0.5"><div className="w-1/3 h-2 bg-current rounded-sm opacity-40"></div><div className="w-1/3 h-2 bg-current rounded-sm opacity-40"></div><div className="w-1/3 h-2 bg-current rounded-sm opacity-40"></div></div> }
                                        ].map(layout => (
                                            <button
                                                key={layout.id}
                                                onClick={() => handleChange('layout', layout.id)}
                                                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md border text-xs font-bold transition-all
                                                    ${(selectedSection.layout || '1col') === layout.id
                                                        ? 'bg-white border-sw-teal text-sw-teal shadow-sm'
                                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-white'
                                                    }
                                                `}
                                                title={layout.label}
                                            >
                                                {layout.icon}
                                                <span className="scale-90">{layout.id.replace('col', '')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Section Style</label>
                                    <div id="prop-section-style" className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'default', label: 'Std', bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-700' },
                                            { id: 'info', label: 'Info', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                                            { id: 'warning', label: 'Warn', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                                            { id: 'summary', label: 'Sum', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
                                        ].map(style => (
                                            <button
                                                key={style.id}
                                                onClick={() => handleChange('variant', style.id === 'default' ? undefined : style.id)}
                                                className={`group relative h-12 rounded-lg border-2 transition-all flex items-center justify-center overflow-hidden
                                                    ${(selectedSection.variant || 'default') === style.id
                                                        ? `border-sw-teal ring-1 ring-sw-teal`
                                                        : 'border-transparent hover:scale-105'
                                                    }
                                                `}
                                                title={style.label}
                                            >
                                                <div className={`absolute inset-0 ${style.bg} ${style.border} border opacity-80`} />
                                                <span className={`relative z-10 text-[10px] font-bold uppercase ${style.text}`}>{style.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- ELEMENT SPECIFIC GENERAL --- */}
                        {selectedElement && (
                            <>
                                <div>
                                    <label className={labelClass}>Field Type</label>
                                    <select
                                        id="prop-type"
                                        value={selectedElement.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                        className={inputClass}
                                    >
                                        {(() => {
                                            const isRestricted = selectedSection?.variant && ['info', 'warning', 'summary'].includes(selectedSection.variant);

                                            // Define options
                                            const interactiveOptions = [
                                                { val: 'text', label: 'Text Input' },
                                                { val: 'textarea', label: 'Multi-line Text' },
                                                { val: 'number', label: 'Number' },
                                                { val: 'date', label: 'Date Picker' },
                                                { val: 'select', label: 'Dropdown (Select)' },
                                                { val: 'radio', label: 'Radio Buttons' },
                                                { val: 'checkbox', label: 'Checkbox' },
                                                { val: 'repeater', label: 'Data Table (Repeater)' },
                                                { val: 'manage_requirements', label: 'Manage Requirements' }
                                            ];
                                            const staticOptions = [
                                                { val: 'calculated', label: 'Calculated Formula' },
                                                { val: 'static', label: 'Static Text / Display' }
                                            ];

                                            if (isRestricted) {
                                                return staticOptions.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>);
                                            } else {
                                                return [...interactiveOptions, ...staticOptions].map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>);
                                            }
                                        })()}
                                    </select>
                                </div>

                                {/* Placeholder */}
                                {['text', 'textarea', 'number', 'email'].includes(selectedElement.type) && (
                                    <div id="prop-element-options">
                                        <label className={labelClass}>Placeholder / Hint</label>
                                        <input
                                            type="text"
                                            value={selectedElement.defaultValue || ''}
                                            onChange={(e) => handleChange('defaultValue', e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Enter value..."
                                        />
                                    </div>
                                )}

                                {/* Options for Select/Radio */}
                                {/* Options for Select/Radio/ManageRequirements */}
                                {['select', 'radio', 'multiselect', 'manage_requirements'].includes(selectedElement.type) && (
                                    <div id="prop-element-options">
                                        <label className={labelClass}>
                                            {selectedElement.type === 'manage_requirements' ? 'Appropriate Documents (Comma separated)' : 'Options (Comma separated)'}
                                        </label>
                                        <textarea
                                            // Handle complex options object vs simple string array
                                            value={Array.isArray(selectedElement.options)
                                                ? selectedElement.options.map(o => typeof o === 'string' ? o : o.value).join(', ')
                                                : ''}
                                            onChange={(e) => {
                                                // Convert back to simple string array for now
                                                handleChange('options', e.target.value.split(',').map(s => s.trim()));
                                            }}
                                            className={inputClass}
                                            rows={3}
                                            placeholder={selectedElement.type === 'manage_requirements' ? "Passport, Utility Bill, Bank Statement" : "Option 1, Option 2, Option 3"}
                                        />
                                    </div>
                                )}

                                {/* Static Data Source configuration */}
                                {selectedElement.type === 'static' && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe size={16} className="text-blue-500" />
                                            <label className="text-xs font-bold text-blue-700 uppercase">Data Source</label>
                                        </div>
                                        <select
                                            value={selectedElement.staticDataSource || 'manual'}
                                            onChange={(e) => handleChange('staticDataSource', e.target.value)}
                                            className="w-full text-xs p-2 mb-2 rounded border border-blue-200"
                                        >
                                            <option value="manual">Manual Text</option>
                                            <option value="field">Mirror Another Field</option>
                                        </select>

                                        {selectedElement.staticDataSource === 'field' && (
                                            <select
                                                value={selectedElement.sourceFieldId || ''}
                                                onChange={(e) => handleChange('sourceFieldId', e.target.value)}
                                                className="w-full text-xs p-2 rounded border border-blue-200"
                                            >
                                                <option value="">Select Field...</option>
                                                {allElements.filter(e => e.id !== selectedElement.id).map(e => (
                                                    <option key={e.id} value={e.id}>{e.label}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* REPEATER CONFIG */}
                                {selectedElement.type === 'repeater' && (
                                    <div className="bg-gray-100 p-4 rounded-lg">
                                        <label className={labelClass}>Table Columns</label>
                                        <div className="space-y-2">
                                            {(selectedElement.columns || []).map((col, idx) => (
                                                <div key={col.id} className="flex gap-2">
                                                    <input
                                                        value={col.label}
                                                        className="flex-1 text-xs p-1 rounded border"
                                                        onChange={(e) => {
                                                            const newCols = [...(selectedElement.columns || [])];
                                                            newCols[idx] = { ...col, label: e.target.value };
                                                            handleRepeaterChange(newCols);
                                                        }}
                                                    />
                                                    <select
                                                        value={col.type}
                                                        className="w-20 text-xs p-1 rounded border"
                                                        onChange={(e) => {
                                                            const newCols = [...(selectedElement.columns || [])];
                                                            newCols[idx] = { ...col, type: e.target.value as any };
                                                            handleRepeaterChange(newCols);
                                                        }}
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="number">Num</option>
                                                        <option value="date">Date</option>
                                                        <option value="checkbox">Bool</option>
                                                        <option value="select">Select</option>
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            const newCols = [...(selectedElement.columns || [])];
                                                            newCols.splice(idx, 1);
                                                            handleRepeaterChange(newCols);
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 rounded p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newCols = [...(selectedElement.columns || [])];
                                                    newCols.push({ id: `col_${Date.now()}`, label: 'New Column', type: 'text' });
                                                    handleRepeaterChange(newCols);
                                                }}
                                                className="w-full py-1 text-xs bg-white border border-dashed border-gray-400 text-gray-500 rounded hover:border-sw-teal hover:text-sw-teal"
                                            >
                                                + Add Column
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* CALCULATION BUILDER (Extracted) */}
                                {selectedElement.type === 'calculated' && (
                                    <CalculationBuilder
                                        element={selectedElement}
                                        allElements={allElements}
                                        onUpdateElement={onUpdateElement}
                                    />
                                )}
                            </>
                        )}

                        {/* --- DELETE BUTTON --- */}
                        <div className="pt-8 mt-auto">
                            <button
                                onClick={handleDelete}
                                className="w-full py-3 bg-red-50 text-red-600 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition-colors text-sm font-bold"
                            >
                                <Trash2 size={16} />
                                Delete {selectedElement ? 'Field' : selectedSection ? 'Section' : 'Stage'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- LOGIC TAB --- */}
                {activeTab === 'logic' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* 1. VISIBILITY LOGIC (Element & Section) */}
                        {(selectedElement || selectedSection) && (
                            <div id="prop-logic-visibility" className="bg-sw-teal/5 p-4 rounded-xl border border-sw-teal/10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Eye size={18} className="text-sw-teal" />
                                        <span className={labelClass.replace('mb-2', 'mb-0')}>Visibility Rules</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            ensureLogicGroup('visibility');
                                            setModals(m => ({ ...m, visibility: true }));
                                        }}
                                        className="text-xs bg-white border border-sw-teal text-sw-teal px-3 py-1 rounded-full hover:bg-sw-teal hover:text-white transition-colors"
                                    >
                                        Configure
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200">
                                    {formatLogicSummary((selectedElement || selectedSection)?.visibility, allElements)}
                                </div>
                            </div>
                        )}

                        {/* 2. REQUIRED LOGIC (Element Only) */}
                        {selectedElement && (
                            <div id="prop-logic-mandatory" className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={18} className="text-amber-600" />
                                        <span className={`${labelClass.replace('mb-2', 'mb-0')} text-amber-700`}>Mandatory Rules</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            ensureLogicGroup('requiredLogic');
                                            setModals(m => ({ ...m, required: true }));
                                        }}
                                        className="text-xs bg-white border border-amber-500 text-amber-600 px-3 py-1 rounded-full hover:bg-amber-500 hover:text-white transition-colors"
                                    >
                                        Configure
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200">
                                    {formatLogicSummary(selectedElement.requiredLogic || { id: 'dummy', operator: 'AND', conditions: [] }, allElements)}
                                </div>
                            </div>
                        )}

                        {/* 3. SKIP LOGIC (Stage Only - Strict) */}
                        {selectedStage && !selectedSection && !selectedElement && (
                            <div id="prop-stage-skip" className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <FastForward size={18} className="text-gray-600" />
                                        <span className={`${labelClass.replace('mb-2', 'mb-0')} text-gray-700`}>Skip Conditions</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            ensureLogicGroup('skipLogic');
                                            setModals(m => ({ ...m, skip: true }));
                                        }}
                                        className="text-xs bg-white border border-gray-400 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-600 hover:text-white transition-colors"
                                    >
                                        Configure
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200">
                                    {formatLogicSummary(selectedStage.skipLogic || { id: 'dummy', operator: 'AND', conditions: [] }, allElements)}
                                </div>
                            </div>
                        )}

                        {/* 4. VALIDATION (Element Only) */}
                        {selectedElement && (
                            <div id="prop-logic-validation" className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={18} className="text-blue-600" />
                                        <span className={`${labelClass.replace('mb-2', 'mb-0')} text-blue-700`}>Validation</span>
                                    </div>
                                    <button
                                        onClick={() => setModals(m => ({ ...m, validation: true }))}
                                        className="text-xs bg-white border border-blue-400 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-500 hover:text-white transition-colors"
                                    >
                                        Configure
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200 font-mono">
                                    {selectedElement.validation?.type || 'none'}
                                    {selectedElement.validation?.type === 'custom' && ' (custom)'}
                                </div>
                            </div>
                        )}

                        {/* 5. SKILL ROUTING (Stage Only - Strict) */}
                        {selectedStage && !selectedSection && !selectedElement && (
                            <div id="prop-stage-routing" className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <label className={labelClass}>
                                        <ArrowRight className="inline mr-1" size={14} />
                                        Routing & Assignments
                                    </label>
                                    <div className="flex gap-1" title="Copy/Paste Logic">
                                        <button
                                            onClick={handleCopyRules}
                                            className="p-1.5 text-gray-400 hover:text-sw-teal hover:bg-sw-teal/10 rounded"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={handlePasteRules}
                                            disabled={!clipboardStageLogic}
                                            className={`p-1.5 rounded ${clipboardStageLogic ? 'text-gray-600 hover:text-sw-teal hover:bg-sw-teal/10' : 'text-gray-200'}`}
                                        >
                                            <ClipboardPaste size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {selectedStage.skillLogic?.map((rule, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-white border border-gray-100 rounded-lg hover:border-sw-teal hover:shadow-sm cursor-pointer group transition-all"
                                            onClick={() => {
                                                setActiveRuleIndex(idx);
                                                setModals(m => ({ ...m, skill: true }));
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-gray-700">Rule #{idx + 1}</span>
                                                <Trash2
                                                    size={14}
                                                    className="text-gray-300 hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!selectedStage.skillLogic) return;
                                                        const newRules = [...selectedStage.skillLogic];
                                                        newRules.splice(idx, 1);
                                                        onUpdateStage({ ...selectedStage, skillLogic: newRules });
                                                    }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-gray-500 mb-1">{formatLogicSummary(rule.logic, allElements)}</div>
                                            <div className="flex items-center gap-1 text-sw-teal text-xs font-bold">
                                                <ArrowRight size={12} /> {rule.requiredSkill}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => {
                                            const newRule: SkillRule = {
                                                logic: { id: `grp_${Date.now()}`, operator: 'AND', conditions: [] },
                                                requiredSkill: COMMON_SKILLS[0]
                                            };
                                            const currentRules = selectedStage.skillLogic || [];
                                            const newRules = [...currentRules, newRule];
                                            onUpdateStage({ ...selectedStage, skillLogic: newRules });
                                            // Auto-open
                                            setActiveRuleIndex(newRules.length - 1);
                                            setModals(m => ({ ...m, skill: true }));
                                        }}
                                        className="w-full py-2 border border-dashed border-gray-300 rounded text-xs text-gray-400 font-bold hover:border-sw-teal hover:text-sw-teal transition-colors"
                                    >
                                        + Add Routing Rule
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>


            {/* --- MODALS --- */}

            {/* 1. Skill Logic Modal */}
            <SkillLogicModal
                isOpen={modals.skill}
                onClose={() => setModals(m => ({ ...m, skill: false }))}
                stage={selectedStage}
                onUpdateStage={onUpdateStage}
                activeRuleIndex={activeRuleIndex}
                modalSize={modalSize}
                onResizeStart={() => setIsResizingModal(true)}
                availableTargets={getAvailableTargets()}
            />

            {/* 2. Visibility Modal (Common) */}
            <VisibilityLogicModal
                isOpen={modals.visibility}
                onClose={() => setModals(m => ({ ...m, visibility: false }))}
                data={selectedElement || selectedSection}
                type="visibility"
                onUpdate={(updated) => selectedElement ? onUpdateElement(updated) : onUpdateSection(updated)}
                modalSize={modalSize}
                onResizeStart={() => setIsResizingModal(true)}
                availableTargets={getAvailableTargets()}
            />

            {/* 3. Required Logic (Reuses Visibility Component) */}
            <VisibilityLogicModal
                isOpen={modals.required}
                onClose={() => setModals(m => ({ ...m, required: false }))}
                data={selectedElement}
                type="required"
                onUpdate={onUpdateElement}
                modalSize={modalSize}
                onResizeStart={() => setIsResizingModal(true)}
                availableTargets={getAvailableTargets()}
            />

            {/* 4. Skip Logic Modal */}
            <SkipLogicModal
                isOpen={modals.skip}
                onClose={() => setModals(m => ({ ...m, skip: false }))}
                stage={selectedStage}
                onUpdateStage={onUpdateStage}
                modalSize={modalSize}
                onResizeStart={() => setIsResizingModal(true)}
                availableTargets={getAvailableTargets()}
            />

            {/* 5. Validation Modal */}
            <ValidationRulesModal
                isOpen={modals.validation}
                onClose={() => setModals(m => ({ ...m, validation: false }))}
                element={selectedElement}
                onUpdateElement={onUpdateElement}
                modalSize={modalSize}
                onResizeStart={() => setIsResizingModal(true)}
            />

        </div >
    );
};
