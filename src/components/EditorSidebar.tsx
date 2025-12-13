
import React, { useState } from 'react';
import { ProcessDefinition, StageDefinition, SectionDefinition } from '../types';
import { Plus, Sparkles, ArrowRight, PanelBottom, RectangleVertical, GripVertical, Loader2 } from 'lucide-react';

interface EditorSidebarProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition>>;
    selectedStageId: string;
    setSelectedStageId: (id: string) => void;
    selectedSectionId: string | null;
    setSelectedSectionId: (id: string | null) => void;
    setSelectedElementId: (id: string | null) => void;
    aiPrompt: string;
    setAiPrompt: (val: string) => void;
    handleAiModification: () => void;
    isGenerating: boolean;
    selectedStage: StageDefinition | undefined;
    loadingStageIds?: Set<string>;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
    processDef, setProcessDef,
    selectedStageId, setSelectedStageId,
    selectedSectionId, setSelectedSectionId,
    setSelectedElementId,
    aiPrompt, setAiPrompt, handleAiModification, isGenerating,
    selectedStage,
    loadingStageIds
}) => {
    const [draggedStageIdx, setDraggedStageIdx] = useState<number | null>(null);
    const [draggedSection, setDraggedSection] = useState<{ stageIdx: number, sectionIdx: number } | null>(null);

    // --- Stage Drag Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedStageIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedStageIdx === null || draggedStageIdx === index) return;

        const newStages = [...processDef.stages];
        const [movedStage] = newStages.splice(draggedStageIdx, 1);
        newStages.splice(index, 0, movedStage);
        
        setProcessDef({ ...processDef, stages: newStages });
        setDraggedStageIdx(null);
    };

    // --- Section Drag Handlers ---
    const handleSectionDragStart = (e: React.DragEvent, stageIdx: number, sectionIdx: number) => {
        e.stopPropagation();
        setDraggedSection({ stageIdx, sectionIdx });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSectionDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleSectionDrop = (e: React.DragEvent, stageIdx: number, targetSectionIdx: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedSection) return;
        if (draggedSection.stageIdx !== stageIdx) return; // Only allow reorder within same stage
        if (draggedSection.sectionIdx === targetSectionIdx) {
             setDraggedSection(null);
             return;
        }

        const newStages = [...processDef.stages];
        const stage = newStages[stageIdx];
        const newSections = [...stage.sections];
        
        const [movedSection] = newSections.splice(draggedSection.sectionIdx, 1);
        newSections.splice(targetSectionIdx, 0, movedSection);
        
        newStages[stageIdx] = { ...stage, sections: newSections };
        
        setProcessDef({ ...processDef, stages: newStages });
        setDraggedSection(null);
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-white">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Structure</h2>
                <div className="space-y-4">
                {processDef.stages.map((stage, idx) => {
                    const isLoading = loadingStageIds?.has(stage.id);
                    return (
                    <div 
                        key={stage.id} 
                        className={`relative group ${draggedStageIdx === idx ? 'opacity-40' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                    >
                    {/* Connection Line (Hide for last item) */}
                    {idx < processDef.stages.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-[-16px] w-px bg-gray-100"></div>
                    )}

                    <div 
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors pr-8 relative ${selectedStageId === stage.id && !selectedSectionId ? 'bg-sw-teal text-white shadow-md' : 'hover:bg-sw-lightGray text-sw-teal'}`}
                        onClick={() => {
                            setSelectedStageId(stage.id);
                            setSelectedSectionId(null);
                            setSelectedElementId(null);
                        }}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedStageId === stage.id ? 'bg-white text-sw-teal' : 'bg-sw-teal text-white'}`}>
                            {isLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                idx + 1
                            )}
                        </div>
                        <span className="font-bold text-sm truncate flex-1">{stage.title}</span>
                        
                        {/* Drag Handle */}
                        <div className={`absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${selectedStageId === stage.id ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-sw-teal'}`}>
                            <GripVertical size={16} />
                        </div>
                    </div>
                    
                    {selectedStageId === stage.id && (
                        <div className="ml-9 mt-2 space-y-1">
                        {stage.sections.map((section, secIdx) => {
                            // Safe check for first section ID to assign the 'section-header' ID for tutorials/demos
                            const firstStage = processDef.stages[0];
                            const isFirstGlobalSection = firstStage && firstStage.sections && firstStage.sections.length > 0 && firstStage.sections[0].id === section.id;
                            
                            return (
                            <div
                                id={isFirstGlobalSection ? 'section-header' : undefined} 
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleSectionDragStart(e, idx, secIdx)}
                                onDragOver={handleSectionDragOver}
                                onDrop={(e) => handleSectionDrop(e, idx, secIdx)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(section.id);
                                    setSelectedElementId(null);
                                }}
                                className={`
                                    group flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-all border border-transparent relative
                                    ${selectedSectionId === section.id 
                                        ? 'bg-sw-purpleLight text-sw-teal font-bold border-sw-teal/10' 
                                        : 'text-gray-500 hover:text-sw-teal hover:bg-gray-50'
                                    }
                                    ${draggedSection?.stageIdx === idx && draggedSection?.sectionIdx === secIdx ? 'opacity-40' : ''}
                                `}
                            >
                                {section.variant === 'summary' ? <PanelBottom size={14} className="opacity-70 shrink-0"/> : <RectangleVertical size={14} className="opacity-70 shrink-0"/>}
                                <span className="truncate flex-1">{section.title}</span>
                                
                                {/* Section Drag Handle */}
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${selectedSectionId === section.id ? 'text-sw-teal' : 'text-gray-400'}`}>
                                    <GripVertical size={12} />
                                </div>
                            </div>
                        )})}
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
                );
                })}
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
                        className="w-full p-3 pr-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sw-teal focus:border-transparent resize-none h-24 bg-white shadow-sm text-sw-text"
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
    );
};
