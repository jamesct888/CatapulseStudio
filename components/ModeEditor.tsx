
import React, { useState } from 'react';
import { ProcessDefinition, SectionDefinition, ElementDefinition, VisualTheme, StageDefinition } from '../types';
import { RenderElement } from './FormElements';
import { PanelBottom, RectangleVertical, Plus, Eye, CheckCircle2, FileText, Hash, Calendar, List, CheckSquare, MessageSquare, Sparkles, ArrowRight, CircleDot, GripVertical } from 'lucide-react';

interface ModeEditorProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition>>;
    selectedStageId: string;
    setSelectedStageId: (id: string) => void;
    selectedSectionId: string | null;
    setSelectedSectionId: (id: string | null) => void;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    aiPrompt: string;
    setAiPrompt: (val: string) => void;
    handleAiModification: () => void;
    isGenerating: boolean;
    visualTheme: VisualTheme;
    isSettingsOpen: boolean;
}

export const ModeEditor: React.FC<ModeEditorProps> = ({
    processDef, setProcessDef,
    selectedStageId, setSelectedStageId,
    selectedSectionId, setSelectedSectionId,
    selectedElementId, setSelectedElementId,
    aiPrompt, setAiPrompt, handleAiModification, isGenerating,
    visualTheme, isSettingsOpen
}) => {
    
    const selectedStage = processDef.stages.find(s => s.id === selectedStageId);
    const [draggedItem, setDraggedItem] = useState<{sectionId: string, index: number} | null>(null);

    const handleDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
        setDraggedItem({ sectionId, index });
        e.dataTransfer.effectAllowed = 'move';
        // Set ghost image data if needed, basic text is fine for internal React DnD
        e.dataTransfer.setData('text/plain', JSON.stringify({ sectionId, index }));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
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
            // Remove from source
            const [item] = sourceSec.elements.splice(draggedItem.index, 1);
            // Insert at target
            targetSec.elements.splice(targetIndex, 0, item);
            
            setProcessDef(newDef);
            // Update selection if we moved the selected item
            if (selectedElementId === item.id) {
                setSelectedSectionId(targetSectionId);
            }
        }
        setDraggedItem(null);
    };

    return (
        <>
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-sm">
                <div className="p-5 border-b border-gray-100 bg-white">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Structure</h2>
                    <div className="space-y-4">
                    {processDef.stages.map((stage, idx) => (
                        <div key={stage.id} className="relative">
                        <div className="absolute left-3 top-8 bottom-[-16px] w-px bg-gray-100 last:hidden"></div>
                        <div 
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedStageId === stage.id && !selectedSectionId ? 'bg-sw-teal text-white shadow-md' : 'hover:bg-sw-lightGray text-sw-teal'}`}
                            onClick={() => {
                                setSelectedStageId(stage.id);
                                setSelectedSectionId(null);
                                setSelectedElementId(null);
                            }}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedStageId === stage.id ? 'bg-white text-sw-teal' : 'bg-sw-teal text-white'}`}>
                            {idx + 1}
                            </div>
                            <span className="font-bold text-sm truncate">{stage.title}</span>
                        </div>
                        
                        {selectedStageId === stage.id && (
                            <div className="ml-9 mt-2 space-y-1">
                            {stage.sections.map(section => (
                                <div
                                id={section.id === processDef.stages[0].sections[0].id ? 'section-header' : undefined} 
                                key={section.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(section.id);
                                    setSelectedElementId(null);
                                }}
                                className={`
                                    group flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-all border border-transparent
                                    ${selectedSectionId === section.id 
                                        ? 'bg-sw-purpleLight text-sw-teal font-bold border-sw-teal/10' 
                                        : 'text-gray-500 hover:text-sw-teal hover:bg-gray-50'
                                    }
                                `}
                                >
                                {section.variant === 'summary' ? <PanelBottom size={14} className="opacity-70"/> : <RectangleVertical size={14} className="opacity-70"/>}
                                <span className="truncate">{section.title}</span>
                                </div>
                            ))}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newSecId = `sec_${Date.now()}`;
                                    const newSec: SectionDefinition = {
                                        id: newSecId,
                                        title: 'New Section',
                                        layout: '1col',
                                        elements: []
                                    };
                                    const newDef = { ...processDef };
                                    newDef.stages[idx].sections.push(newSec);
                                    setProcessDef(newDef);
                                    setSelectedSectionId(newSecId);
                                }}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-sw-teal px-2 py-1.5 mt-1 transition-colors w-full text-left"
                            >
                                <Plus size={12} /> Add Section
                            </button>
                            </div>
                        )}
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            const newStgId = `stg_${Date.now()}`;
                            const newStg: StageDefinition = {
                                id: newStgId,
                                title: 'New Stage',
                                sections: [{ id: `sec_${Date.now()}`, title: 'Section 1', layout: '1col', elements: [] }]
                            };
                            setProcessDef({ ...processDef, stages: [...processDef.stages, newStg] });
                            setSelectedStageId(newStgId);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-sw-teal uppercase tracking-wide px-2 py-2 hover:bg-sw-lightGray rounded-lg w-full transition-colors"
                    >
                        <Plus size={14} /> Add Stage
                    </button>
                    </div>
                </div>

                <div id="sidebar-copilot" className="p-5 mt-auto bg-sw-lightGray border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3 text-sw-teal">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Copilot</span>
                    </div>
                    <div className="relative">
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe a change (e.g. 'Add a comments field')..."
                            className="w-full p-3 pr-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sw-teal focus:border-transparent resize-none h-24 bg-white shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAiModification();
                                }
                            }}
                        />
                        <button 
                            onClick={handleAiModification}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="absolute bottom-2 right-2 p-1.5 bg-sw-teal text-white rounded-lg hover:bg-sw-tealHover disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                        Context: {selectedSectionId ? `Section: Active` : `Stage: ${selectedStage?.title}`}
                    </p>
                </div>
            </div>

            {/* Canvas */}
            <div id="canvas" className="flex-1 bg-sw-lightGray p-8 overflow-y-auto flex justify-center relative">
                <div className={`w-full max-w-4xl transition-all duration-300 ${isSettingsOpen ? 'mr-80' : ''}`}>
                    {/* Stage Title Header */}
                    <div className="mb-8">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage {processDef.stages.findIndex(s => s.id === selectedStageId) + 1}</span>
                        <h1 className="text-3xl font-serif text-sw-teal mt-1">{selectedStage?.title}</h1>
                    </div>

                    <div className="space-y-6 pb-20">
                        {selectedStage?.sections.map((section) => (
                            <div 
                                key={section.id} 
                                className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden
                                    ${selectedSectionId === section.id ? 'border-sw-teal ring-1 ring-sw-teal shadow-md' : 'border-gray-100 hover:border-gray-300'}
                                    ${section.variant === 'summary' ? 'border-t-4 border-t-gray-400 bg-gray-50' : ''}
                                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(section.id);
                                    setSelectedElementId(null);
                                }}
                            >
                                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-white to-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        {section.variant === 'summary' && <PanelBottom size={16} className="text-gray-400" />}
                                        <h3 className="font-bold text-lg text-sw-teal">{section.title}</h3>
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
                                                {/* Drag Handle */}
                                                <div 
                                                    className="absolute top-4 left-2 text-gray-300 cursor-grab active:cursor-grabbing hover:text-sw-teal z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Drag to reorder"
                                                >
                                                    <GripVertical size={16} />
                                                </div>

                                                <div className="pointer-events-none pl-6">
                                                    <RenderElement 
                                                        element={element} 
                                                        value={element.defaultValue} 
                                                        onChange={() => {}} 
                                                        disabled 
                                                        theme={visualTheme}
                                                    />
                                                </div>
                                                
                                                {/* Logic Indicators */}
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                    
                                    {/* Drop Zone / Add Button */}
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
                                            // Handle dropping onto the empty space (append to end)
                                            e.preventDefault();
                                            if (!draggedItem) return;
                                            
                                            // Only handle if dragging from same stage (for simplicity in this prototype)
                                            // Logic mostly same as main drop but targetIndex is length
                                            
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

                        {/* Toolbox */}
                        <div id="toolbox" className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl p-2 border border-gray-200 flex items-center gap-2 z-30 animate-in slide-in-from-bottom-4">
                            {[
                                { type: 'text', icon: FileText, label: 'Text' },
                                { type: 'number', icon: Hash, label: 'Number' },
                                { type: 'date', icon: Calendar, label: 'Date' },
                                { type: 'select', icon: List, label: 'Select' },
                                { type: 'radio', icon: CircleDot, label: 'Radio' },
                                { type: 'checkbox', icon: CheckSquare, label: 'Check' },
                                { type: 'static', icon: MessageSquare, label: 'Static' }
                            ].map(tool => (
                                <button 
                                    key={tool.type}
                                    className="p-3 rounded-full hover:bg-sw-lightGray text-sw-teal transition-colors flex flex-col items-center gap-1 w-16 group"
                                    onClick={() => {
                                        if (selectedSectionId) {
                                            const newEl: ElementDefinition = {
                                                id: `el_${Date.now()}`,
                                                label: 'New Field',
                                                type: tool.type as any,
                                                required: false
                                            };
                                            const newDef = {...processDef};
                                            // Find section globally
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
        </>
    );
}
