
import React, { useState } from 'react';
import { ProcessDefinition, ElementDefinition, VisualTheme, StageDefinition, SectionDefinition } from '../types';
import { RenderElement } from './FormElements';
import { PanelBottom, Plus, Eye, CheckCircle2, FileText, Hash, Calendar, List, CheckSquare, MessageSquare, CircleDot, GripVertical, Table, Database, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface EditorCanvasProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition>>;
    selectedStageId: string;
    selectedSectionId: string | null;
    setSelectedSectionId: (id: string) => void;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    visualTheme: VisualTheme;
    isSettingsOpen: boolean;
    selectedStage: StageDefinition | undefined;
    loadingStageIds?: Set<string>;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    processDef, setProcessDef,
    selectedStageId,
    selectedSectionId, setSelectedSectionId,
    selectedElementId, setSelectedElementId,
    visualTheme, isSettingsOpen,
    selectedStage,
    loadingStageIds
}) => {
    const [draggedItem, setDraggedItem] = useState<{sectionId: string, index: number} | null>(null);

    // Explicitly check if this specific stage is loading
    const isLoading = loadingStageIds?.has(selectedStageId);

    const handleDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
        setDraggedItem({ sectionId, index });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ sectionId, index }));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const newDef = { ...processDef };
        const stage = newDef.stages.find(s => s.id === selectedStageId);
        if (!stage) return;

        const sourceSec = stage.sections.find(s => s.id === draggedItem.sectionId);
        const targetSec = stage.sections.find(s => s.id === targetSectionId);

        if (sourceSec && targetSec) {
            const [item] = sourceSec.elements.splice(draggedItem.index, 1);
            targetSec.elements.splice(targetIndex, 0, item);
            setProcessDef(newDef);
            if (selectedElementId === item.id) {
                setSelectedSectionId(targetSectionId);
            }
        }
        setDraggedItem(null);
    };

    return (
        <div id="canvas" className="flex-1 bg-sw-lightGray p-8 overflow-y-auto relative">
            <div className={`w-full transition-all duration-300 ${isSettingsOpen ? 'mr-[500px]' : ''}`}>
                <div className="mb-8 max-w-5xl mx-auto">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage {processDef.stages.findIndex(s => s.id === selectedStageId) + 1}</span>
                    <h1 className="text-3xl font-serif text-sw-teal mt-1">{selectedStage?.title}</h1>
                </div>

                <div className="flex flex-col gap-10 pb-20 items-start max-w-5xl mx-auto">
                    {/* LOADING STATE: Show skeleton if explicitly loading */}
                    {selectedStage && isLoading && (
                        <div className="w-full space-y-6 animate-pulse opacity-70">
                            {/* Fake Section 1 */}
                            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200">
                                <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-6">
                                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                                </div>
                            </div>
                            {/* Generating Message */}
                            <div className="flex items-center justify-center gap-2 text-sw-teal font-bold py-4">
                                <Loader2 size={20} className="animate-spin" />
                                <span>Generating fields for {selectedStage.title}...</span>
                            </div>
                        </div>
                    )}

                    {/* EMPTY STATE: Not loading, but no sections found */}
                    {selectedStage && !isLoading && (!selectedStage.sections || selectedStage.sections.length === 0) && (
                        <div className="w-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                            <Info size={48} className="text-gray-200 mb-4" />
                            <p className="text-gray-400 font-medium mb-4">No fields generated for this stage.</p>
                            <button 
                                onClick={() => {
                                    const newSec: SectionDefinition = {
                                        id: `sec_${Date.now()}`,
                                        title: 'New Section',
                                        layout: '1col',
                                        elements: []
                                    };
                                    const newDef = { ...processDef };
                                    const stg = newDef.stages.find(s => s.id === selectedStageId);
                                    if(stg) stg.sections.push(newSec);
                                    setProcessDef(newDef);
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:text-sw-teal hover:border-sw-teal transition-all shadow-sm"
                            >
                                <Plus size={14} className="inline mr-2" /> Add Manually
                            </button>
                        </div>
                    )}

                    {selectedStage?.sections.map((section) => (
                        <div 
                            key={section.id} 
                            className={`w-full bg-white rounded-2xl shadow-sm border transition-all duration-200
                                ${selectedSectionId === section.id ? 'border-sw-teal ring-1 ring-sw-teal shadow-md' : 'border-gray-100 hover:border-gray-300'}
                                ${section.variant === 'summary' ? 'border-t-4 border-t-gray-400 bg-gray-50' : ''}
                                ${section.variant === 'warning' ? 'border-t-4 border-t-amber-400 bg-amber-50/50' : ''}
                                ${section.variant === 'info' ? 'border-t-4 border-t-blue-400 bg-blue-50/50' : ''}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSectionId(section.id);
                                setSelectedElementId(null);
                            }}
                        >
                            <div className={`p-4 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-white to-gray-50/50 rounded-t-2xl ${
                                section.variant === 'warning' ? 'from-amber-50 to-white border-amber-100' :
                                section.variant === 'info' ? 'from-blue-50 to-white border-blue-100' : ''
                            }`}>
                                <div className="flex items-center gap-3">
                                    {section.variant === 'summary' && <PanelBottom size={16} className="text-gray-400" />}
                                    {section.variant === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                                    {section.variant === 'info' && <Info size={16} className="text-blue-500" />}
                                    <h3 className={`font-bold text-sm uppercase tracking-wide ${
                                        section.variant === 'warning' ? 'text-amber-700' :
                                        section.variant === 'info' ? 'text-blue-700' :
                                        'text-sw-teal'
                                    }`}>{section.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                        {section.layout || '1col'}
                                    </span>
                                    {section.variant === 'summary' && <span className="text-[10px] uppercase font-bold text-white bg-gray-400 px-2 py-1 rounded">Summary</span>}
                                </div>
                            </div>
                            
                            <div className={`p-6 grid gap-6 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                                {section.elements.map((element, index) => {
                                    const isSelected = selectedElementId === element.id;
                                    const isDragging = draggedItem?.sectionId === section.id && draggedItem.index === index;
                                    
                                    // Simulate value for static reflection fields in editor
                                    let displayValue = element.defaultValue;
                                    if (element.type === 'static' && element.staticDataSource === 'field' && element.sourceFieldId) {
                                        // Find the label of the referenced field to show a useful placeholder
                                        const allFields = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);
                                        const target = allFields.find(f => f.id === element.sourceFieldId);
                                        displayValue = target ? `[${target.label}]` : '[Unlinked Field]';
                                    }

                                    return (
                                        <div 
                                            key={element.id}
                                            id={element.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, section.id, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, section.id, index)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedElementId(element.id);
                                                setSelectedSectionId(section.id);
                                            }}
                                            className={`relative group rounded-xl transition-all p-4 border-2 cursor-pointer
                                                ${isSelected 
                                                    ? 'border-sw-teal bg-sw-teal/5' 
                                                    : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                                                }
                                                ${isDragging ? 'opacity-40 border-dashed border-gray-400 bg-gray-50' : ''}
                                            `}
                                        >
                                            <div 
                                                className="absolute top-4 left-2 text-gray-300 cursor-grab active:cursor-grabbing hover:text-sw-teal z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical size={16} />
                                            </div>

                                            <div className="pointer-events-none pl-6">
                                                <RenderElement 
                                                    element={element} 
                                                    value={displayValue} 
                                                    onChange={() => {}} 
                                                    disabled 
                                                    theme={visualTheme}
                                                />
                                            </div>
                                            
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {element.type === 'static' && element.staticDataSource === 'field' && (
                                                    <div className="bg-blue-100 text-blue-600 p-1 rounded-md" title="Linked Data Field">
                                                        <Database size={12} />
                                                    </div>
                                                )}
                                                {element.visibility && (element.visibility.conditions.length > 0 || (element.visibility.groups && element.visibility.groups.length > 0)) && (
                                                    <div className="bg-sw-purpleLight text-sw-teal p-1 rounded-md" title="Has Visibility Logic">
                                                        <Eye size={12} />
                                                    </div>
                                                )}
                                                {element.requiredLogic && (element.requiredLogic.conditions.length > 0 || (element.requiredLogic.groups && element.requiredLogic.groups.length > 0)) && (
                                                    <div className="bg-red-100 text-sw-red p-1 rounded-md" title="Has Mandatory Logic">
                                                        <CheckCircle2 size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                <div className="border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-6 min-h-[100px] hover:border-sw-teal hover:bg-sw-teal/5 transition-all cursor-pointer group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newEl: ElementDefinition = {
                                            id: `el_${Date.now()}`,
                                            label: 'New Field',
                                            type: 'text',
                                            required: false
                                        };
                                        const newDef = {...processDef};
                                        newDef.stages.find(s => s.id === selectedStageId)?.sections.find(s => s.id === section.id)?.elements.push(newEl);
                                        setProcessDef(newDef);
                                        setSelectedElementId(newEl.id);
                                        setSelectedSectionId(section.id);
                                    }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (!draggedItem) return;
                                        const newDef = { ...processDef };
                                        const stage = newDef.stages.find(s => s.id === selectedStageId);
                                        if (!stage) return;
                                        const sourceSec = stage.sections.find(s => s.id === draggedItem.sectionId);
                                        const targetSec = stage.sections.find(s => s.id === section.id);
                                        if (sourceSec && targetSec) {
                                            const [item] = sourceSec.elements.splice(draggedItem.index, 1);
                                            targetSec.elements.push(item);
                                            setProcessDef(newDef);
                                        }
                                        setDraggedItem(null);
                                    }}
                                >
                                    <div className="text-center text-gray-400 group-hover:text-sw-teal pointer-events-none">
                                        <Plus size={24} className="mx-auto mb-2" />
                                        <span className="text-sm font-bold">Add Field</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div id="toolbox" className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl p-2 border border-gray-200 flex items-center gap-2 z-30 animate-in slide-in-from-bottom-4">
                        {[
                            { type: 'text', icon: FileText, label: 'Text' },
                            { type: 'number', icon: Hash, label: 'Number' },
                            { type: 'date', icon: Calendar, label: 'Date' },
                            { type: 'select', icon: List, label: 'Select' },
                            { type: 'radio', icon: CircleDot, label: 'Radio' },
                            { type: 'checkbox', icon: CheckSquare, label: 'Check' },
                            { type: 'repeater', icon: Table, label: 'List' },
                            { type: 'static', icon: MessageSquare, label: 'Static' }
                        ].map(tool => (
                            <button 
                                key={tool.type}
                                className="p-3 rounded-full hover:bg-sw-lightGray text-sw-teal transition-colors flex flex-col items-center gap-1 w-16 group"
                                onClick={() => {
                                    if (selectedSectionId) {
                                        const newEl: ElementDefinition = {
                                            id: `el_${Date.now()}`,
                                            label: tool.type === 'repeater' ? 'New List' : 'New Field',
                                            type: tool.type as any,
                                            required: false,
                                            columns: tool.type === 'repeater' ? [{ id: 'col1', label: 'Item Name', type: 'text' }] : undefined
                                        };
                                        const newDef = {...processDef};
                                        for(const stg of newDef.stages) {
                                            const sec = stg.sections.find(s => s.id === selectedSectionId);
                                            if (sec) {
                                                sec.elements.push(newEl);
                                                break;
                                            }
                                        }
                                        setProcessDef(newDef);
                                        setSelectedElementId(newEl.id);
                                    } else {
                                        alert("Select a section first!");
                                    }
                                }}
                            >
                                <tool.icon size={20} />
                                <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-sw-teal text-white px-2 py-1 rounded shadow">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
