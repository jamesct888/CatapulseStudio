
import React from 'react';
import { ProcessDefinition, VisualTheme } from '../types';
import { EditorSidebar } from './EditorSidebar';
import { EditorCanvas } from './EditorCanvas';

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
    loadingStageIds?: Set<string>; // Add optional prop
}

export const ModeEditor: React.FC<ModeEditorProps> = ({
    processDef, setProcessDef,
    selectedStageId, setSelectedStageId,
    selectedSectionId, setSelectedSectionId,
    selectedElementId, setSelectedElementId,
    aiPrompt, setAiPrompt, handleAiModification, isGenerating,
    visualTheme, isSettingsOpen,
    loadingStageIds
}) => {
    
    const selectedStage = processDef.stages.find(s => s.id === selectedStageId);

    return (
        <>
            <EditorSidebar 
                processDef={processDef}
                setProcessDef={setProcessDef}
                selectedStageId={selectedStageId}
                setSelectedStageId={setSelectedStageId}
                selectedSectionId={selectedSectionId}
                setSelectedSectionId={setSelectedSectionId}
                setSelectedElementId={setSelectedElementId}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                handleAiModification={handleAiModification}
                isGenerating={isGenerating}
                selectedStage={selectedStage}
                loadingStageIds={loadingStageIds}
            />
            <EditorCanvas 
                processDef={processDef}
                setProcessDef={setProcessDef}
                selectedStageId={selectedStageId}
                selectedSectionId={selectedSectionId}
                setSelectedSectionId={setSelectedSectionId}
                selectedElementId={selectedElementId}
                setSelectedElementId={setSelectedElementId}
                visualTheme={visualTheme}
                isSettingsOpen={isSettingsOpen}
                selectedStage={selectedStage}
            />
        </>
    );
}
