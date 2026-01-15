
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

    const resetDragState = () => {
        setDraggedStageIdx(null);
        setDraggedSection(null);
    };

    // --- Stage Drag Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.stopPropagation();
        resetDragState(); // Ensure clean slate
        setDraggedStageIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'stage', index }));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStageIdx: number) => {
        e.preventDefault();
        e.stopPropagation();

        let dragData: any = null;
        try {
            const raw = e.dataTransfer.getData('application/json');
            if (raw) dragData = JSON.parse(raw);
        } catch (err) {
            console.error("Drag Parse Error", err);
        }

        // --- CASE 1: Dropping a SECTION onto a Stage Header (Move to Stage) ---
        if (draggedSection || (dragData && dragData.type === 'section')) {
            const srcStageIdx = draggedSection ? draggedSection.stageIdx : dragData.stageIdx;
            const srcSecIdx = draggedSection ? draggedSection.sectionIdx : dragData.sectionIdx;

            const newStages = [...processDef.stages];

            // 1. Get Source Stage
            const sourceStage = { ...newStages[srcStageIdx] };
            sourceStage.sections = [...sourceStage.sections];

            // 2. Remove from Source
            const [movedSection] = sourceStage.sections.splice(srcSecIdx, 1);

            // 3. Update Source in Array (Important if src == target)
            newStages[srcStageIdx] = sourceStage;

            // 4. Get Target Stage (Refetch from array to get latest state if src == target)
            const targetStage = { ...newStages[targetStageIdx] };
            targetStage.sections = [...targetStage.sections];

            // 5. Add to Target (Append to end)
            targetStage.sections.push(movedSection);
            newStages[targetStageIdx] = targetStage;

            setProcessDef({ ...processDef, stages: newStages });
            resetDragState();

            // Auto-select the target stage so the user sees the moved item
            setSelectedStageId(newStages[targetStageIdx].id);
            return;
        }

        // --- CASE 2: Reordering STAGES ---
        if (draggedStageIdx !== null || (dragData && dragData.type === 'stage')) {
            const srcIdx = draggedStageIdx !== null ? draggedStageIdx : dragData.index;
            if (srcIdx === targetStageIdx) return;

            const newStages = [...processDef.stages];
            const [movedStage] = newStages.splice(srcIdx, 1);
            newStages.splice(targetStageIdx, 0, movedStage);

            setProcessDef({ ...processDef, stages: newStages });
            resetDragState();
        }
    };

    // --- Section Drag Handlers ---
    const handleSectionDragStart = (e: React.DragEvent, stageIdx: number, sectionIdx: number) => {
        e.stopPropagation();
        resetDragState(); // Ensure clean slate
        setDraggedSection({ stageIdx, sectionIdx });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'section', stageIdx, sectionIdx }));
    };

    const handleSectionDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleSectionDrop = (e: React.DragEvent, stageIdx: number, targetSectionIdx: number) => {
        e.preventDefault();
        e.stopPropagation();

        let dragData: any = null;
        try {
            const raw = e.dataTransfer.getData('application/json');
            if (raw) dragData = JSON.parse(raw);
        } catch (err) {
            console.error("Section Drag Parse Error", err);
        }

        if (!draggedSection && (!dragData || dragData.type !== 'section')) return;

        const srcStageIdx = draggedSection ? draggedSection.stageIdx : dragData.stageIdx;
        const srcSecIdx = draggedSection ? draggedSection.sectionIdx : dragData.sectionIdx;

        // Prevent drop on self
        if (srcStageIdx === stageIdx && srcSecIdx === targetSectionIdx) {
            resetDragState();
            return;
        }

        const newStages = [...processDef.stages];

        // 1. Get Source Stage
        const sourceStage = { ...newStages[srcStageIdx] };
        sourceStage.sections = [...sourceStage.sections];

        // 2. Remove from Source
        const [movedSection] = sourceStage.sections.splice(srcSecIdx, 1);
        newStages[srcStageIdx] = sourceStage; // Update Source

        // 3. Get Target Stage (Refetch to ensure we have latest if src == target)
        const targetStage = { ...newStages[stageIdx] };
        targetStage.sections = [...targetStage.sections];

        // 4. Calculate Insertion
        let insertionIndex = targetSectionIdx;
        // If moving within the same list and moving downwards, adjust index
        if (srcStageIdx === stageIdx && srcSecIdx < targetSectionIdx) {
            insertionIndex--;
        }

        // 5. Insert
        targetStage.sections.splice(insertionIndex, 0, movedSection);
        newStages[stageIdx] = targetStage; // Update Target

        setProcessDef({ ...processDef, stages: newStages });
        resetDragState();
        setSelectedStageId(newStages[stageIdx].id);
    };

    return (
        <div id="sidebar-structure" className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-10 shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-white">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Structure</h2>
                <div className="space-y-4">
                    {processDef.stages.map((stage, idx) => {
                        const isLoading = loadingStageIds?.has(stage.id);
                        // Visual cue: If dragging a section, allow drop on any stage
                        const isSectionDropTarget = draggedSection !== null;

                        return (
                            <div
                                key={stage.id}
                                id={`stage-${stage.id}`}
                                className={`relative group rounded-lg transition-all 
                            ${draggedStageIdx === idx ? 'opacity-40' : ''} 
                            ${isSectionDropTarget ? 'ring-1 ring-dashed ring-sw-teal/30 bg-sw-teal/5' : ''}
                        `}
                                draggable={!isLoading}
                                onDragStart={(e) => !isLoading && handleDragStart(e, idx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => !isLoading && handleDrop(e, idx)}
                                onDragEnd={resetDragState}
                            >
                                {/* Connection Line (Hide for last item) */}
                                {idx < processDef.stages.length - 1 && (
                                    <div className="absolute left-3 top-8 bottom-[-16px] w-px bg-gray-100"></div>
                                )}

                                <div
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors pr-8 relative 
                            ${selectedStageId === stage.id && !selectedSectionId ? 'bg-sw-teal text-white shadow-md' : 'text-sw-teal'}
                            ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
                            ${selectedStageId !== stage.id ? 'hover:bg-sw-lightGray' : ''}
                        `}
                                    onClick={() => {
                                        if (isLoading) return;
                                        setSelectedStageId(stage.id);
                                        setSelectedSectionId(null);
                                        setSelectedElementId(null);
                                    }}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedStageId === stage.id ? 'bg-white text-sw-teal' : 'bg-sw-teal text-white'}`}>
                                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : idx + 1}
                                    </div>
                                    <span className="font-bold text-sm truncate flex-1">{stage.title}</span>

                                    {/* Drag Handle */}
                                    {!isLoading && (
                                        <div className={`absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${selectedStageId === stage.id ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-sw-teal'}`}>
                                            <GripVertical size={16} />
                                        </div>
                                    )}
                                </div>

                                {selectedStageId === stage.id && (
                                    <div className="ml-9 mt-2 space-y-1">
                                        {stage.sections.map((section, secIdx) => {
                                            // Safe check for first section ID to assign the 'section-header' ID for tutorials/demos
                                            const firstStage = processDef.stages[0];
                                            const isFirstGlobalSection = firstStage && firstStage.sections && firstStage.sections.length > 0 && firstStage.sections[0].id === section.id;

                                            return (
                                                <div
                                                    id={`section-${section.id}`}
                                                    key={section.id}
                                                    draggable
                                                    onDragStart={(e) => handleSectionDragStart(e, idx, secIdx)}
                                                    onDragOver={handleSectionDragOver}
                                                    onDrop={(e) => handleSectionDrop(e, idx, secIdx)}
                                                    onDragEnd={(e) => { e.stopPropagation(); resetDragState(); }}
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
                                                    {section.variant === 'summary' ? <PanelBottom size={14} className="opacity-70 shrink-0" /> : <RectangleVertical size={14} className="opacity-70 shrink-0" />}
                                                    <span className="truncate flex-1">{section.title}</span>

                                                    {/* Section Drag Handle */}
                                                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${selectedSectionId === section.id ? 'text-sw-teal' : 'text-gray-400'}`}>
                                                        <GripVertical size={12} />
                                                    </div>
                                                </div>
                                            )
                                        })}
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
                        disabled={isGenerating}
                        placeholder={isGenerating ? "AI is thinking..." : "Describe a change (e.g. 'Add a comments field')..."}
                        className={`w-full p-3 pr-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-sw-teal focus:border-transparent resize-none h-24 bg-white shadow-sm text-sw-text transition-opacity ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
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
                        className="absolute bottom-2 right-2 p-1.5 bg-sw-teal text-white rounded-lg hover:bg-sw-tealHover disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center min-w-[28px] min-h-[28px]"
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    Context: {selectedSectionId ? `Section: Active` : `Stage: ${selectedStage?.title}`}
                </p>
            </div>
        </div>
    );
};
