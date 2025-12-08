import React, { useState } from 'react';
import { ProcessDefinition, ElementDefinition, VisualTheme, StageDefinition } from '../types';
import { RenderElement } from './FormElements';
import { PanelBottom, Plus, Eye, CheckCircle2, FileText, Hash, Calendar, List, CheckSquare, MessageSquare, CircleDot, GripVertical, Table } from 'lucide-react';

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
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    processDef, setProcessDef,
    selectedStageId,
    selectedSectionId, setSelectedSectionId,
    selectedElementId, setSelectedElementId,
    visualTheme, isSettingsOpen,
    selectedStage
}) => {
    const [draggedItem, setDraggedItem] = useState<{sectionId: string, index: number} | null>(null);

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
        <div id="canvas" className="flex-1 bg-sw-lightGray p-8 overflow-y-auto flex justify-center relative">
            <div className={`w-full max-w-4xl transition-all duration-300 ${isSettingsOpen ? 'mr-[500px]' : ''}`}>
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
                                            // Default config for repeater
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