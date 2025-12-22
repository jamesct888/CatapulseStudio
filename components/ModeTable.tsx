
import React, { useState, useRef } from 'react';
import { ProcessDefinition, ElementDefinition, LogicGroup, VisualTheme, SectionDefinition, StageDefinition } from '../types';
import { Trash2, Copy, Plus, Eye, EyeOff, Settings2, GripVertical, Download, Upload, FileSpreadsheet, ClipboardCopy, ClipboardPaste, X } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import { LogicBuilder } from './LogicBuilder';

interface ModeTableProps {
    processDef: ProcessDefinition;
    setProcessDef: (def: ProcessDefinition) => void;
    visualTheme: VisualTheme;
}

export const ModeTable: React.FC<ModeTableProps> = ({ processDef, setProcessDef, visualTheme }) => {
    const [logicModalOpen, setLogicModalOpen] = useState(false);
    const [activeLogicContext, setActiveLogicContext] = useState<{ stageIdx: number, sectionIdx: number, elementIdx: number } | null>(null);
    const [clipboardLogic, setClipboardLogic] = useState<LogicGroup | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- CSV Helpers ---

    const escapeCSV = (str: string | undefined | null) => {
        if (str === undefined || str === null) return '';
        const stringValue = String(str);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const handleExportCSV = () => {
        // Added StaticSource, SourceFieldID, and Description columns
        const headers = ['StageID', 'StageTitle', 'SectionID', 'SectionTitle', 'ElementID', 'Label', 'Type', 'Options', 'Required', 'Validation', 'VisibilityRules_JSON', 'StaticSource', 'SourceFieldID', 'Description'];
        const rows = [headers.join(',')];

        processDef.stages.forEach(stage => {
            stage.sections.forEach(section => {
                section.elements.forEach(el => {
                    // Handle options array which might contain objects or strings
                    const optionsStr = Array.isArray(el.options)
                        ? el.options.map(opt => {
                            if (typeof opt === 'string') return opt;
                            if (typeof opt === 'number') return String(opt);
                            return opt?.label || opt?.value || '';
                        }).join(',')
                        : typeof el.options === 'string' ? el.options : '';

                    const visibilityStr = el.visibility ? JSON.stringify(el.visibility) : '';

                    const row = [
                        escapeCSV(stage.id),
                        escapeCSV(stage.title),
                        escapeCSV(section.id),
                        escapeCSV(section.title),
                        escapeCSV(el.id),
                        escapeCSV(el.label),
                        escapeCSV(el.type),
                        escapeCSV(optionsStr),
                        el.required ? 'TRUE' : 'FALSE',
                        escapeCSV(el.validation?.type || 'none'),
                        escapeCSV(visibilityStr),
                        escapeCSV(el.staticDataSource),
                        escapeCSV(el.sourceFieldId),
                        escapeCSV(el.description) // Export the description (Constant text content)
                    ];
                    rows.push(row.join(','));
                });
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${processDef.name.replace(/\s+/g, '_')}_grid.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Robust CSV Parser
            const rows = text.split('\n').map(row => {
                const values = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char === '"') {
                        if (inQuotes && row[i + 1] === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim()); // Trim whitespace from cells
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim()); // Push last value
                return values;
            });

            if (rows.length === 0) return;

            // Map header indices (Clean BOM and spaces)
            const header = rows[0].map(h => h.trim().toLowerCase().replace(/^[\uFEFF\u200B"']+|["']+$/g, ''));

            const idx = {
                stgId: header.indexOf('stageid'),
                stgTitle: header.indexOf('stagetitle'),
                secId: header.indexOf('sectionid'),
                secTitle: header.indexOf('sectiontitle'),
                elId: header.indexOf('elementid'),
                label: header.indexOf('label'),
                type: header.indexOf('type'),
                options: header.indexOf('options'),
                req: header.indexOf('required'),
                val: header.indexOf('validation'),
                vis: header.indexOf('visibilityrules_json'),
                staticSrc: header.indexOf('staticsource'),
                srcField: header.indexOf('sourcefieldid'),
                desc: header.indexOf('description')
            };

            // Relaxed validation: We need at least Label or ElementID
            if (idx.label === -1 && idx.elId === -1) {
                alert("Invalid CSV format. Header must contain 'ElementID' or 'Label'.");
                return;
            }

            // Deep Clone to ensure React state updates trigger correctly
            const newDef: ProcessDefinition = JSON.parse(JSON.stringify(processDef));
            let updateCount = 0;
            let addCount = 0;

            // Iterate data rows (skip header)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue; // Skip empty rows

                const elId = idx.elId !== -1 ? row[idx.elId] : null;
                const stgIdRaw = idx.stgId !== -1 ? row[idx.stgId] : null;
                const stgTitle = idx.stgTitle !== -1 ? row[idx.stgTitle] : null;
                const secIdRaw = idx.secId !== -1 ? row[idx.secId] : null;
                const secTitle = idx.secTitle !== -1 ? row[idx.secTitle] : null;

                // 1. Resolve Stage (Find or Create)
                let stage: StageDefinition | undefined;

                if (stgIdRaw) {
                    stage = newDef.stages.find(s => s.id === stgIdRaw);
                    if (!stage) {
                        stage = {
                            id: stgIdRaw,
                            title: stgTitle || stgIdRaw,
                            sections: []
                        };
                        newDef.stages.push(stage);
                    } else if (stgTitle && stage) {
                        stage.title = stgTitle; // Update title if provided
                    }
                } else {
                    // Fallback logic for when no StageID is provided
                    if (newDef.stages.length > 0) {
                        stage = newDef.stages[0];
                    } else {
                        stage = {
                            id: `stg_${Date.now()}_default`,
                            title: 'Stage 1',
                            sections: []
                        };
                        newDef.stages.push(stage);
                    }
                }

                if (!stage) continue;

                // 2. Resolve Section (Find or Create)
                let section: SectionDefinition | undefined;

                if (secIdRaw) {
                    section = stage.sections.find(s => s.id === secIdRaw);
                    if (!section) {
                        section = {
                            id: secIdRaw,
                            title: secTitle || secIdRaw,
                            layout: '1col',
                            elements: []
                        };
                        stage.sections.push(section);
                    } else if (secTitle && section) {
                        section.title = secTitle;
                    }
                } else {
                    // Fallback logic
                    if (stage.sections.length > 0) {
                        section = stage.sections[0];
                    } else {
                        section = {
                            id: `sec_${Date.now()}_default`,
                            title: 'Section 1',
                            layout: '1col',
                            elements: []
                        };
                        stage.sections.push(section);
                    }
                }

                if (!section) continue;

                // 3. Find or Create Element
                let element = elId ? section.elements.find(e => e.id === elId) : null;
                const isNew = !element;

                if (isNew) {
                    // Create New Element
                    element = {
                        id: elId || `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        label: (idx.label !== -1 ? row[idx.label] : 'New Field') || 'New Field',
                        type: 'text',
                        required: false
                    };
                    section.elements.push(element);
                    addCount++;
                } else {
                    updateCount++;
                }

                // Apply Updates to Element (element is now definitely defined)
                if (element && idx.label !== -1 && row[idx.label]) element.label = row[idx.label];
                if (element && idx.type !== -1 && row[idx.type]) element.type = row[idx.type] as any;

                // Safe Options Update
                if (element && idx.options !== -1) {
                    const rawOptions = row[idx.options];
                    if (rawOptions && typeof rawOptions === 'string') {
                        element.options = rawOptions.split(',').filter(s => s.trim());
                    } else if (!isNew && rawOptions === '') {
                        element.options = []; // Clear options if explicitly empty string provided on existing
                    }
                }

                if (element && idx.req !== -1 && row[idx.req] !== undefined && row[idx.req] !== '') {
                    element.required = row[idx.req].toUpperCase() === 'TRUE';
                }

                if (element && idx.val !== -1 && row[idx.val] !== undefined) {
                    if (row[idx.val] !== 'none' && row[idx.val]) {
                        element.validation = { type: row[idx.val] as any };
                    } else if (row[idx.val] === 'none') {
                        element.validation = { type: 'none' };
                    }
                }

                // Logic Import
                if (element && idx.vis !== -1 && row[idx.vis] !== undefined) {
                    const jsonStr = row[idx.vis];
                    if (jsonStr && jsonStr.trim() !== '') {
                        try {
                            element.visibility = JSON.parse(jsonStr);
                        } catch (e) {
                            console.warn(`Invalid Logic JSON for ${element.id}:`, jsonStr);
                        }
                    }
                }

                // Static Text Config Import
                if (element && idx.staticSrc !== -1 && row[idx.staticSrc] !== undefined) {
                    element.staticDataSource = (row[idx.staticSrc] as any) || 'manual';
                }
                if (element && idx.srcField !== -1 && row[idx.srcField] !== undefined) {
                    element.sourceFieldId = row[idx.srcField];
                }
                if (element && idx.desc !== -1 && row[idx.desc] !== undefined) {
                    element.description = row[idx.desc];
                }
            }

            setProcessDef(newDef);
            const total = updateCount + addCount;
            if (total > 0) {
                alert(`Import Successful!\nUpdated: ${updateCount}\nAdded: ${addCount}`);
            } else {
                alert("Import processed but no changes detected. Ensure your CSV has data rows.");
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    // --- Helpers ---
    const updateField = (stageIdx: number, secIdx: number, elIdx: number, field: keyof ElementDefinition, value: any) => {
        const newDef = { ...processDef };
        // Deep copy for safety on the specific path
        newDef.stages = [...newDef.stages];
        newDef.stages[stageIdx] = { ...newDef.stages[stageIdx] };
        newDef.stages[stageIdx].sections = [...newDef.stages[stageIdx].sections];
        newDef.stages[stageIdx].sections[secIdx] = { ...newDef.stages[stageIdx].sections[secIdx] };
        newDef.stages[stageIdx].sections[secIdx].elements = [...newDef.stages[stageIdx].sections[secIdx].elements];
        const el = { ...newDef.stages[stageIdx].sections[secIdx].elements[elIdx] };

        // Type specific cleanup
        if (field === 'type') {
            if (['select', 'radio', 'multiselect'].includes(value as string)) {
                if (!el.options || el.options.length === 0) el.options = ['Option 1', 'Option 2'];
            }
        }

        (el as any)[field] = value;
        newDef.stages[stageIdx].sections[secIdx].elements[elIdx] = el;
        setProcessDef(newDef);
    };

    const updateOptions = (stageIdx: number, secIdx: number, elIdx: number, value: string) => {
        const newDef = { ...processDef };
        const stages = [...newDef.stages];
        const sections = [...stages[stageIdx].sections];
        const elements = [...sections[secIdx].elements];
        const el = { ...elements[elIdx] };

        const val = value === undefined || value === null ? '' : String(value);
        el.options = val.split(',');

        elements[elIdx] = el;
        sections[secIdx].elements = elements;
        stages[stageIdx].sections = sections;
        newDef.stages = stages;

        setProcessDef(newDef);
    };

    const deleteElement = (stageIdx: number, secIdx: number, elIdx: number) => {
        if (!confirm('Are you sure you want to delete this field?')) return;
        const newDef = { ...processDef };
        newDef.stages = [...newDef.stages];
        newDef.stages[stageIdx] = { ...newDef.stages[stageIdx] };
        newDef.stages[stageIdx].sections = [...newDef.stages[stageIdx].sections];
        newDef.stages[stageIdx].sections[secIdx] = { ...newDef.stages[stageIdx].sections[secIdx] };
        newDef.stages[stageIdx].sections[secIdx].elements = [...newDef.stages[stageIdx].sections[secIdx].elements];

        newDef.stages[stageIdx].sections[secIdx].elements.splice(elIdx, 1);
        setProcessDef(newDef);
    };

    const duplicateElement = (stageIdx: number, secIdx: number, elIdx: number) => {
        const newDef = { ...processDef };
        newDef.stages = [...newDef.stages];
        newDef.stages[stageIdx] = { ...newDef.stages[stageIdx] };
        newDef.stages[stageIdx].sections = [...newDef.stages[stageIdx].sections];
        newDef.stages[stageIdx].sections[secIdx] = { ...newDef.stages[stageIdx].sections[secIdx] };
        newDef.stages[stageIdx].sections[secIdx].elements = [...newDef.stages[stageIdx].sections[secIdx].elements];

        const source = newDef.stages[stageIdx].sections[secIdx].elements[elIdx];
        const clone: ElementDefinition = {
            ...JSON.parse(JSON.stringify(source)),
            id: `el_${Date.now()}`,
            label: `${source.label} (Copy)`
        };
        newDef.stages[stageIdx].sections[secIdx].elements.splice(elIdx + 1, 0, clone);
        setProcessDef(newDef);
    };

    const addElement = (stageIdx: number, secIdx: number) => {
        const newDef = { ...processDef };
        newDef.stages = [...newDef.stages];
        newDef.stages[stageIdx] = { ...newDef.stages[stageIdx] };
        newDef.stages[stageIdx].sections = [...newDef.stages[stageIdx].sections];
        newDef.stages[stageIdx].sections[secIdx] = { ...newDef.stages[stageIdx].sections[secIdx] };
        newDef.stages[stageIdx].sections[secIdx].elements = [...newDef.stages[stageIdx].sections[secIdx].elements];

        const newEl: ElementDefinition = {
            id: `el_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false
        };
        newDef.stages[stageIdx].sections[secIdx].elements.push(newEl);
        setProcessDef(newDef);
    };

    const openLogicModal = (stageIdx: number, secIdx: number, elIdx: number) => {
        setActiveLogicContext({ stageIdx, sectionIdx: secIdx, elementIdx: elIdx });
        setLogicModalOpen(true);
    };

    const handleLogicSave = (newGroup: LogicGroup) => {
        if (!activeLogicContext) return;
        const { stageIdx, sectionIdx, elementIdx } = activeLogicContext;
        const newDef = { ...processDef };
        newDef.stages[stageIdx].sections[sectionIdx].elements[elementIdx].visibility = newGroup;
        setProcessDef(newDef);
    };

    const copyLogic = (stageIdx: number, secIdx: number, elIdx: number) => {
        const el = processDef.stages[stageIdx].sections[secIdx].elements[elIdx];
        if (el.visibility) {
            setClipboardLogic(JSON.parse(JSON.stringify(el.visibility)));
        }
    };

    const pasteLogic = (stageIdx: number, secIdx: number, elIdx: number) => {
        if (!clipboardLogic) return;
        const newDef = { ...processDef };
        const el = newDef.stages[stageIdx].sections[secIdx].elements[elIdx];

        // Deep clone clipboard logic with new unique IDs to avoid conflict
        const clonedLogic = JSON.parse(JSON.stringify(clipboardLogic));
        clonedLogic.id = `logic_${Date.now()}`;

        el.visibility = clonedLogic;
        setProcessDef(newDef);
    };

    const clearLogic = (stageIdx: number, secIdx: number, elIdx: number) => {
        const newDef = { ...processDef };
        const el = newDef.stages[stageIdx].sections[secIdx].elements[elIdx];
        el.visibility = { id: `logic_${Date.now()}`, operator: 'AND', conditions: [] };
        setProcessDef(newDef);
    };

    // Flatten data for logic builder context
    const allFields = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);

    // Helper to safely format options for display in the grid input
    const formatOptionsForInput = (options: any): string => {
        if (Array.isArray(options)) {
            return options.map(opt => {
                if (typeof opt === 'string') return opt;
                if (typeof opt === 'number') return String(opt);
                return opt?.label || opt?.value || opt?.text || '';
            }).join(','); // Removed .filter(Boolean) to allow typing commas (which create transient empty strings)
        }
        if (typeof options === 'object' && options !== null) return '';
        if (!options) return '';
        return String(options);
    };

    return (
        <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200 bg-white shadow-sm shrink-0 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif text-sw-teal font-bold flex items-center gap-2">
                        <FileSpreadsheet className="text-sw-teal" /> Grid Editor
                    </h2>
                    <p className="text-sm text-gray-500">Bulk edit fields, types, and logic in a unified view.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {clipboardLogic && (
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs font-bold mr-2 flex items-center gap-2 animate-in fade-in">
                            <ClipboardCopy size={14} /> Logic Copied
                            <button onClick={() => setClipboardLogic(null)} className="hover:text-blue-900"><X size={12} /></button>
                        </div>
                    )}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:text-sw-teal hover:border-sw-teal transition-all shadow-sm"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-sw-teal text-white rounded-lg text-sm font-bold hover:bg-sw-tealHover transition-all shadow-sm"
                    >
                        <Upload size={16} /> Import CSV
                    </button>
                    {/* Hidden Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        accept=".csv"
                        className="hidden"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-sw-lightGray text-gray-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 border-b border-gray-200 w-48">Location</th>
                                <th className="p-4 border-b border-gray-200 w-64">Label</th>
                                <th className="p-4 border-b border-gray-200 w-40">Type</th>
                                <th className="p-4 border-b border-gray-200">Configuration</th>
                                <th className="p-4 border-b border-gray-200 w-24 text-center">Req.</th>
                                <th className="p-4 border-b border-gray-200 w-56">Visibility & Logic</th>
                                <th className="p-4 border-b border-gray-200 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {processDef.stages.map((stage, stageIdx) => (
                                <React.Fragment key={stage.id}>
                                    {/* Stage Header Row */}
                                    <tr className="bg-sw-teal/5">
                                        <td colSpan={7} className="px-4 py-2 font-bold text-sw-teal border-y border-sw-teal/10">
                                            Stage {stageIdx + 1}: {stage.title}
                                        </td>
                                    </tr>

                                    {stage.sections.map((section, secIdx) => (
                                        <React.Fragment key={section.id}>
                                            {/* Section Header Row */}
                                            <tr className="bg-gray-50/50">
                                                <td className="px-4 py-2 text-xs font-bold text-gray-400 border-r border-gray-100 pl-8 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                    {section.title}
                                                </td>
                                                <td colSpan={6} className="px-4 py-2 text-xs text-gray-400 italic">
                                                    {section.layout} Layout • {section.elements.length} Fields
                                                </td>
                                            </tr>

                                            {section.elements.map((el, elIdx) => {
                                                const logicCount = (el.visibility?.conditions?.length || 0) + (el.visibility?.groups?.length || 0);
                                                const hasLogic = logicCount > 0;

                                                return (
                                                    <tr key={el.id} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-4 py-3 text-xs text-gray-400 border-r border-gray-100 pl-8 align-middle">
                                                            <div className="flex items-center gap-2 opacity-50">
                                                                <GripVertical size={12} />
                                                                <span className="font-mono">{el.id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 align-middle">
                                                            <input
                                                                type="text"
                                                                value={el.label}
                                                                onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'label', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal text-gray-800 font-medium bg-white"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 align-middle">
                                                            <select
                                                                value={el.type}
                                                                onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'type', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal bg-white text-xs"
                                                            >
                                                                <option value="text">Text</option>
                                                                <option value="email">Email</option>
                                                                <option value="textarea">Text Area</option>
                                                                <option value="number">Number</option>
                                                                <option value="date">Date</option>
                                                                <option value="currency">Currency</option>
                                                                <option value="select">Select</option>
                                                                <option value="multiselect">Multi-Select</option>
                                                                <option value="radio">Radio</option>
                                                                <option value="checkbox">Checkbox</option>
                                                                <option value="static">Static Text</option>
                                                                <option value="repeater">Repeater</option>
                                                                <option value="calculated">Calculated</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2 align-middle">
                                                            {['select', 'radio', 'multiselect'].includes(el.type) ? (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Options (comma separated)"
                                                                    value={formatOptionsForInput(el.options)}
                                                                    onChange={(e) => updateOptions(stageIdx, secIdx, elIdx, e.target.value)}
                                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal text-xs bg-white"
                                                                />
                                                            ) : ['text', 'email'].includes(el.type) ? (
                                                                <select
                                                                    value={el.validation?.type || 'none'}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === 'none' ? { type: 'none' } : { type: e.target.value };
                                                                        updateField(stageIdx, secIdx, elIdx, 'validation', val);
                                                                    }}
                                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal text-xs text-gray-500 bg-white"
                                                                >
                                                                    <option value="none">No Validation</option>
                                                                    <option value="email">Email</option>
                                                                    <option value="phone_uk">UK Phone</option>
                                                                    <option value="nino_uk">NI Number</option>
                                                                </select>
                                                            ) : el.type === 'static' ? (
                                                                <div className="flex flex-col gap-1 min-w-[160px]">
                                                                    <div className="flex items-center gap-1">
                                                                        <select
                                                                            value={el.staticDataSource || 'manual'}
                                                                            onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'staticDataSource', e.target.value)}
                                                                            className="flex-1 text-[10px] py-1 px-1 border border-gray-200 rounded bg-gray-50 focus:ring-1 focus:ring-sw-teal"
                                                                        >
                                                                            <option value="manual">Constant</option>
                                                                            <option value="field">Reference</option>
                                                                        </select>
                                                                    </div>

                                                                    {el.staticDataSource === 'field' ? (
                                                                        <select
                                                                            value={el.sourceFieldId || ''}
                                                                            onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'sourceFieldId', e.target.value)}
                                                                            className="w-full text-xs py-1 px-2 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal bg-white"
                                                                        >
                                                                            <option value="">Select Source Field...</option>
                                                                            {allFields.filter(f => f.id !== el.id).map(f => (
                                                                                <option key={f.id} value={f.id}>{f.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <textarea
                                                                            value={el.description || ''}
                                                                            onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'description', e.target.value)}
                                                                            placeholder="Enter text to display..."
                                                                            rows={1}
                                                                            className="w-full text-xs py-1 px-2 border border-gray-200 rounded focus:border-sw-teal focus:ring-1 focus:ring-sw-teal bg-white resize-y min-h-[28px]"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center align-middle">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!el.required}
                                                                onChange={(e) => updateField(stageIdx, secIdx, elIdx, 'required', e.target.checked)}
                                                                className="rounded border-gray-300 text-sw-teal focus:ring-sw-teal"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 align-middle">
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => openLogicModal(stageIdx, secIdx, elIdx)}
                                                                    className={`flex-1 px-2 py-1.5 rounded text-xs font-bold border flex items-center justify-between transition-all ${hasLogic
                                                                        ? 'bg-sw-purpleLight border-sw-teal text-sw-teal'
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                                        }`}
                                                                >
                                                                    <span className="flex items-center gap-1">
                                                                        {hasLogic ? <Eye size={12} /> : <EyeOff size={12} />}
                                                                        {hasLogic ? 'Conditional' : 'Always'}
                                                                    </span>
                                                                    {hasLogic && <span className="bg-white/50 px-1.5 rounded text-[9px]">{logicCount}</span>}
                                                                </button>

                                                                {/* Copy Logic Button */}
                                                                {hasLogic && (
                                                                    <button
                                                                        onClick={() => copyLogic(stageIdx, secIdx, elIdx)}
                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                        title="Copy Logic Rule"
                                                                    >
                                                                        <ClipboardCopy size={14} />
                                                                    </button>
                                                                )}

                                                                {/* Paste Logic Button */}
                                                                {clipboardLogic && !hasLogic && (
                                                                    <button
                                                                        onClick={() => pasteLogic(stageIdx, secIdx, elIdx)}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded animate-pulse"
                                                                        title="Paste Logic"
                                                                    >
                                                                        <ClipboardPaste size={14} />
                                                                    </button>
                                                                )}

                                                                {/* Clear Logic */}
                                                                {hasLogic && (
                                                                    <button
                                                                        onClick={() => clearLogic(stageIdx, secIdx, elIdx)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                                        title="Clear Logic"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right align-middle">
                                                            <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => duplicateElement(stageIdx, secIdx, elIdx)} className="p-1.5 hover:bg-sw-lightGray rounded text-sw-teal" title="Duplicate"><Copy size={14} /></button>
                                                                <button onClick={() => deleteElement(stageIdx, secIdx, elIdx)} className="p-1.5 hover:bg-red-50 rounded text-sw-red" title="Delete"><Trash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Add Field Row */}
                                            <tr>
                                                <td colSpan={7} className="px-4 py-2 border-b border-gray-100">
                                                    <button
                                                        onClick={() => addElement(stageIdx, secIdx)}
                                                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-sw-teal px-4 py-1.5 rounded hover:bg-gray-50 transition-colors w-full"
                                                    >
                                                        <Plus size={12} /> Add Field to '{section.title}'
                                                    </button>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Logic Modal Reuse */}
            {logicModalOpen && activeLogicContext && (
                <ModalWrapper
                    title={`Visibility Logic: ${processDef.stages[activeLogicContext.stageIdx].sections[activeLogicContext.sectionIdx].elements[activeLogicContext.elementIdx].label}`}
                    icon={Eye}
                    onClose={() => setLogicModalOpen(false)}
                    modalSize={{ width: 800, height: 600 }}
                    onResizeStart={() => { }}
                >
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
                        <LogicBuilder
                            group={processDef.stages[activeLogicContext.stageIdx].sections[activeLogicContext.sectionIdx].elements[activeLogicContext.elementIdx].visibility || { id: 'root', operator: 'AND', conditions: [] }}
                            onChange={handleLogicSave}
                            availableTargets={allFields.filter(f => f.id !== processDef.stages[activeLogicContext.stageIdx].sections[activeLogicContext.sectionIdx].elements[activeLogicContext.elementIdx].id)}
                        />
                    </div>
                    <div className="text-right">
                        <button onClick={() => setLogicModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">Close</button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
};
