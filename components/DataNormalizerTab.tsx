
import React, { useState, useMemo } from 'react';
import { Database, Upload, RefreshCw, Sparkles, FileText, Check, Edit2, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { ProcessDefinition, DataObjectSuggestion, DictionaryEntry } from '../types';
import ClipboardPreview from './ClipboardPreview';
import ClassDiagram from './ClassDiagram';

interface DataNormalizerTabProps {
    processDef: ProcessDefinition;
    dataSuggestions: DataObjectSuggestion[];
    dictionary: DictionaryEntry[];
    baseClass: string;
    setBaseClass: (val: string) => void;
    isAnalyzing: boolean;
    isUploading: boolean;
    onAnalyze: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveClassName: (idx: number, newName: string) => void;
    onOverrideMapping: (groupIdx: number, mapIdx: number, entry: DictionaryEntry | string) => void;
    onAcceptMapping: (groupIdx: number, mapIdx: number) => void;
}

const DataNormalizerTab: React.FC<DataNormalizerTabProps> = ({
    processDef,
    dataSuggestions,
    dictionary,
    baseClass,
    setBaseClass,
    isAnalyzing,
    isUploading,
    onAnalyze,
    onFileUpload,
    onSaveClassName,
    onOverrideMapping,
    onAcceptMapping
}) => {
    // Local Interaction State
    const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
    const [overrideMenuOpen, setOverrideMenuOpen] = useState<{ idx: number, mIdx: number } | null>(null);
    const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
    const [tempClassName, setTempClassName] = useState('');
    const [manualOverrideText, setManualOverrideText] = useState('');
    const [viewMode, setViewMode] = useState<'mapping' | 'clipboard' | 'diagram'>('mapping');

    const allElementsList = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);

    const getElementDetails = (id: string) => allElementsList.find(e => e.id === id);
    const handleEditClass = (idx: number, name: string) => {
        setTempClassName(name);
        setEditingClassIndex(idx);
    };

    const saveClass = (idx: number) => {
        onSaveClassName(idx, tempClassName);
        setEditingClassIndex(null);
    };

    const handleManualOverride = (idx: number, mIdx: number) => {
        if (manualOverrideText.trim()) {
            onOverrideMapping(idx, mIdx, manualOverrideText.trim());
            setManualOverrideText('');
        }
    };

    // Helper: Determine Layer
    const getLayer = (className: string) => {
        if (className === baseClass || className.includes('-Work-')) return 'Case Layer (Work)';
        if (className.includes('-Data-')) return 'Data Layer';
        if (className.includes('-Int-')) return 'Integration Layer';
        return 'Foundation / Other';
    };

    // Helper: Get Breadcrumbs (Org-App-Data)
    const getBreadcrumbs = (className: string) => {
        const parts = className.split('-');
        if (parts.length <= 1) return '';
        return parts.slice(0, parts.length - 1).join('-');
    };

    // Group suggestions by layer
    const groupedSuggestions = useMemo(() => {
        const groups: Record<string, typeof dataSuggestions> = {
            'Case Layer (Work)': [],
            'Data Layer': [],
            'Integration Layer': [],
            'Foundation / Other': []
        };

        dataSuggestions.forEach(ds => {
            const layer = getLayer(ds.className);
            groups[layer].push(ds);
        });

        return groups;
    }, [dataSuggestions, baseClass]);

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] animate-in fade-in bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 1. Sticky Toolbar */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-sw-teal rounded text-white">
                            <Database size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Data Normalizer</h2>
                            <p className="text-xs text-gray-500">Map Prototype Fields to Data Model</p>
                        </div>
                    </div>

                    {/* Base Class Input */}
                    <div className="h-8 w-px bg-gray-200 mx-2"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Context Info</span>
                        <input
                            type="text"
                            value={baseClass}
                            onChange={(e) => setBaseClass(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 rounded px-2 py-1 text-xs font-mono w-48 focus:outline-none focus:border-sw-teal transition-all"
                            placeholder="Org-App-Work"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-0.5 rounded-lg flex text-xs font-bold mr-2">
                        <button
                            onClick={() => setViewMode('mapping')}
                            className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'mapping' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mapping
                        </button>
                        <button
                            onClick={() => setViewMode('clipboard')}
                            className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'clipboard' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Clipboard Preview
                        </button>
                        <button
                            onClick={() => setViewMode('diagram')}
                            className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'diagram' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Class Diagram
                        </button>
                    </div>

                    {/* Upload Button */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${dictionary.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                        {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                        {dictionary.length > 0 ? `${dictionary.length} Dictionary Rules` : 'Upload Dictionary'}
                        <input type="file" accept=".csv" className="hidden" onChange={onFileUpload} />
                    </label>

                    {/* Analyze Button */}
                    <button
                        onClick={onAnalyze}
                        disabled={isAnalyzing}
                        className="bg-sw-teal text-white px-4 py-2 rounded-lg font-bold hover:bg-sw-tealHover transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 text-xs"
                    >
                        {isAnalyzing ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {dataSuggestions.length > 0 ? 'Re-Analyze' : 'Analyze & Map'}
                    </button>
                </div>
            </div>

            {/* 2. Split Pane Content */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT PANE: Field Inventory (25%) */}
                <div className="w-1/4 bg-gray-50 border-r border-gray-200 overflow-y-auto flex flex-col">
                    <div className="p-3 border-b border-gray-200 bg-gray-100/50 sticky top-0 z-10 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={12} /> Source Fields ({allElementsList.length})
                        </h3>
                    </div>

                    <div className="p-2 space-y-4">
                        {processDef.stages.map(stage => (
                            <div key={stage.id}>
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1 truncate">{stage.title}</div>
                                <div className="space-y-1">
                                    {stage.sections.flatMap(sec => sec.elements).map(el => {
                                        // Check if mapped
                                        const isMapped = dataSuggestions.some(g => g.mappings.some(m => m.elementId === el.id));
                                        const isHighlighted = highlightedFieldId === el.id;

                                        return (
                                            <button
                                                key={el.id}
                                                onClick={() => setHighlightedFieldId(el.id)}
                                                className={`w-full text-left px-3 py-2 rounded-md border text-xs flex items-center justify-between group transition-all ${isHighlighted
                                                    ? 'bg-sw-teal text-white border-sw-teal shadow-md ring-2 ring-sw-teal/20'
                                                    : 'bg-white border-gray-200 hover:border-sw-teal/50 text-gray-700 hover:bg-white'}`}
                                            >
                                                <span className="truncate flex-1 font-medium">{el.label}</span>
                                                {isMapped ? (
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isHighlighted ? 'bg-white/20 text-white' : 'bg-green-100 text-green-600'}`}>
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-white/50' : 'bg-gray-300'}`}></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANE: Solution Grid (75%) */}
                <div className="flex-1 bg-gray-100/50 overflow-y-auto p-0 relative">
                    {viewMode === 'clipboard' ? (
                        <ClipboardPreview dataSuggestions={dataSuggestions} baseClass={baseClass} />
                    ) : viewMode === 'diagram' ? (
                        <ClassDiagram dataSuggestions={dataSuggestions} dictionary={dictionary} baseClass={baseClass} />
                    ) : (
                        <div className="p-6 h-full overflow-y-auto">
                            {dataSuggestions.length === 0 && !isAnalyzing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <Database size={48} className="mb-4 opacity-20" />
                                    <p className="font-medium">Ready to Analyze</p>
                                    <p className="text-sm">Upload a dictionary or click Analyze to start mapping.</p>
                                </div>
                            )}

                            <div className="space-y-8 pb-20">
                                {['Case Layer (Work)', 'Data Layer', 'Integration Layer', 'Foundation / Other'].map(layerName => {
                                    const layerSuggestions = groupedSuggestions[layerName];
                                    if (layerSuggestions.length === 0) return null;

                                    return (
                                        <div key={layerName}>
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                                <div className="h-px bg-gray-300 flex-1"></div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{layerName}</span>
                                                <div className="h-px bg-gray-300 flex-1"></div>
                                            </div>
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative">
                                                {layerSuggestions.map((group: DataObjectSuggestion, idx: number) => {
                                                    // Find original index in dataSuggestions for handlers
                                                    const originalIdx = dataSuggestions.indexOf(group);

                                                    return (
                                                        <div key={originalIdx} className="bg-white rounded-xl shadow-card border border-gray-200 overflow-visible flex flex-col transition-all hover:shadow-lg relative z-0 hover:z-10">
                                                            {/* Card Header */}
                                                            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center group/header">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`p-1.5 rounded ${layerName.includes('Case') ? 'bg-blue-100 text-blue-600' : 'bg-sw-purpleLight text-sw-teal'}`}>
                                                                        <Database size={14} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        {editingClassIndex === originalIdx ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    autoFocus
                                                                                    type="text"
                                                                                    value={tempClassName}
                                                                                    onChange={(e) => setTempClassName(e.target.value)}
                                                                                    className="text-xs font-bold border border-sw-teal rounded px-2 py-1 w-full"
                                                                                    onKeyDown={(e) => e.key === 'Enter' && saveClass(originalIdx)}
                                                                                />
                                                                                <button onClick={() => saveClass(originalIdx)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14} /></button>
                                                                            </div>
                                                                        ) : (
                                                                            <div onClick={() => handleEditClass(originalIdx, group.className)} className="cursor-pointer group/title">
                                                                                {/* Breadcrumb */}
                                                                                <div className="text-[9px] text-gray-400 font-mono mb-0.5 flex items-center gap-1">
                                                                                    {getBreadcrumbs(group.className)}
                                                                                    <ChevronRight size={8} />
                                                                                </div>

                                                                                <h3 className="font-bold text-gray-800 text-sm truncate flex items-center gap-2">
                                                                                    {group.className.split('-').pop()}
                                                                                    <Edit2 size={10} className="opacity-0 group-hover/title:opacity-100 text-gray-400" />
                                                                                </h3>
                                                                                <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{group.description}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">
                                                                    {layerName.includes('Work') ? 'Case' : 'Data'}
                                                                </div>
                                                            </div>

                                                            {/* Card Body & Mappings */}
                                                            <div className="p-0 flex-1 divide-y divide-gray-50">
                                                                {(group.mappings || []).map((mapping: any, mIdx: number) => {
                                                                    const el = getElementDetails(mapping.elementId);
                                                                    const isMenuOpen = overrideMenuOpen?.idx === originalIdx && overrideMenuOpen?.mIdx === mIdx;
                                                                    const isHighlighted = highlightedFieldId === mapping.elementId;
                                                                    const status = mapping.status || 'pending';

                                                                    return (
                                                                        <div
                                                                            key={mIdx}
                                                                            id={`mapping-${mapping.elementId}`}
                                                                            className={`relative transition-colors duration-500 ${isHighlighted ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                                                                        >
                                                                            <div className={`flex items-center justify-between text-xs p-3 group/row ${isHighlighted ? 'bg-yellow-100/50' : ''}`}>
                                                                                {/* Source Side */}
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${mapping.source === 'dictionary' ? 'bg-sw-teal' : 'bg-gray-300'}`}></div>
                                                                                    <span className={`truncate font-medium ${isHighlighted ? 'text-gray-900' : 'text-gray-600'}`}>{el?.label || 'Unknown Field'}</span>
                                                                                    {mapping.source === 'dictionary' && (
                                                                                        <span className="text-[9px] bg-sw-teal/10 text-sw-teal px-1 rounded border border-sw-teal/20 shrink-0">Matched</span>
                                                                                    )}
                                                                                    {mapping.source === 'manual' && (
                                                                                        <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-100 shrink-0">Manual</span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Arrow */}
                                                                                <ArrowRight size={12} className="text-gray-300 mx-2 shrink-0" />

                                                                                {/* Target Side */}
                                                                                <div className="flex items-center gap-2 flex-1 justify-end min-w-0 relative">
                                                                                    <span
                                                                                        className={`font-mono truncate ${mapping.source === 'dictionary' ? 'text-sw-teal font-bold' : 'text-gray-500'}`}
                                                                                        title={mapping.suggestedProperty}
                                                                                    >
                                                                                        .{mapping.suggestedProperty}
                                                                                    </span>

                                                                                    {/* Status Actions */}
                                                                                    <div className="flex items-center gap-1 ml-1">
                                                                                        {status === 'accepted' ? (
                                                                                            <div className="text-green-600 p-1"><Check size={14} strokeWidth={3} /></div>
                                                                                        ) : (
                                                                                            <button
                                                                                                onClick={(e) => { e.preventDefault(); onAcceptMapping(originalIdx, mIdx); }}
                                                                                                className="opacity-20 group-hover/row:opacity-100 hover:bg-green-100 hover:text-green-600 p-1 rounded transition-all"
                                                                                                title="Accept Mapping"
                                                                                            >
                                                                                                <Check size={14} />
                                                                                            </button>
                                                                                        )}

                                                                                        {/* Override Trigger */}
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setOverrideMenuOpen(isMenuOpen ? null : { idx: originalIdx, mIdx }); setManualOverrideText(''); }}
                                                                                            className={`p-1 rounded text-gray-400 hover:text-gray-700 transition-all ${isMenuOpen ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-200'} opacity-50 group-hover/row:opacity-100`}
                                                                                        >
                                                                                            <ChevronDown size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Interactive Override Menu */}
                                                                            {isMenuOpen && (
                                                                                <div className="absolute right-2 top-8 w-72 bg-white border border-gray-200 shadow-xl rounded-lg z-[999] max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                                                                                    <div className="p-2 border-b border-gray-100 bg-gray-50 text-[10px] uppercase font-bold text-gray-500 flex justify-between items-center">
                                                                                        <span>Override Mapping</span>
                                                                                        <button onClick={() => setOverrideMenuOpen(null)} className="hover:text-red-500">&times;</button>
                                                                                    </div>

                                                                                    {/* Manual Input */}
                                                                                    <div className="p-2 border-b border-gray-100 flex gap-2">
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Type property..."
                                                                                            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                                                                                            value={manualOverrideText}
                                                                                            onChange={(e) => setManualOverrideText(e.target.value)}
                                                                                            onKeyDown={(e) => e.key === 'Enter' && handleManualOverride(originalIdx, mIdx)}
                                                                                        />
                                                                                        <button
                                                                                            disabled={!manualOverrideText.trim()}
                                                                                            onClick={() => handleManualOverride(originalIdx, mIdx)}
                                                                                            className="bg-sw-teal text-white text-[10px] font-bold px-2 py-1 rounded disabled:opacity-50"
                                                                                        >
                                                                                            Set
                                                                                        </button>
                                                                                    </div>

                                                                                    <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                                                        <div className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase">Dictionary Suggestions</div>
                                                                                        {dictionary.length === 0 && <div className="p-4 text-center text-xs text-gray-400 italic">No dictionary loaded.<br />Upload a CSV first.</div>}
                                                                                        {dictionary.map((entry, dIdx) => (
                                                                                            <button
                                                                                                key={dIdx}
                                                                                                onClick={() => {
                                                                                                    onOverrideMapping(originalIdx, mIdx, entry);
                                                                                                    setOverrideMenuOpen(null);
                                                                                                }}
                                                                                                className="w-full text-left px-2 py-2 hover:bg-sw-teal/5 rounded text-xs flex flex-col group/item border-b border-gray-50 last:border-0"
                                                                                            >
                                                                                                <div className="flex justify-between items-center w-full">
                                                                                                    <span className="font-bold text-gray-700 group-hover/item:text-sw-teal">.{entry.property}</span>
                                                                                                    <span className="text-[9px] text-gray-300 font-mono">{entry.type}</span>
                                                                                                </div>
                                                                                                <span className="text-[10px] text-gray-400 truncate">{entry.className}</span>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="bg-gray-50 p-2 text-center border-t border-gray-200 text-[10px] text-gray-400 font-medium">
                                                                {(group.mappings || []).length} items
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default DataNormalizerTab;
