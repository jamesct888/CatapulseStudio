
import React, { useState } from 'react';
import { ProcessDefinition } from '../types';
import { 
    generateProcessSkeleton, 
    generateStageDetails, 
    generateProcessFromImage, 
    modifyProcess 
} from '../services/geminiService';
import { demoDigitizedProcess } from '../services/demoData';

interface AiOperationsProps {
    processDef: ProcessDefinition | null;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;
    setViewMode: (mode: any) => void;
    setStartPrompt: (val: string) => void;
    setSelectedStageId: (id: string) => void;
    setLoadingStageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleStartDemo: (useDemo: boolean) => void; // Callback to fallback to demo
}

export const useAiOperations = ({
    processDef,
    setProcessDef,
    setViewMode,
    setStartPrompt,
    setSelectedStageId,
    setLoadingStageIds,
    handleStartDemo
}: AiOperationsProps) => {
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDemoDrop, setShowDemoDrop] = useState(false);

    // --- Start Generation Flow ---
    const handleStartGeneration = async (prompt: string) => {
        if (!prompt.trim()) {
            // If empty, create default manually
            const defaultProcess: ProcessDefinition = {
                id: `proc_${Date.now()}`,
                name: "New Process",
                description: "Started from scratch",
                stages: [
                    {
                        id: 'stg_1',
                        title: 'Stage 1',
                        sections: [{ id: 'sec_1', title: 'Section 1', layout: '1col', elements: [] }]
                    }
                ]
            };
            setProcessDef(defaultProcess);
            setSelectedStageId(defaultProcess.stages[0].id);
            setViewMode('editor');
            return;
        }
        
        setIsGenerating(true);
        try {
            console.log(`[AI Hook] 🟢 STARTING GENERATION for: "${prompt}"`);
            
            // Step 1: Generate Skeleton
            const skeleton = await generateProcessSkeleton(prompt);
            
            if (skeleton) {
                console.log(`[AI Hook] ✅ SKELETON RECEIVED.`);
                
                const newLoadingSet = new Set<string>();
                skeleton.stages.forEach(s => newLoadingSet.add(s.id));
                setLoadingStageIds(newLoadingSet);

                setProcessDef(skeleton);
                setSelectedStageId(skeleton.stages[0]?.id || '');
                setViewMode('editor');
                setIsGenerating(false); // Stop main blocking overlay, background loading continues

                // Step 2: Generate Flesh (Serialized)
                // IMPORTANT: We must await each request to avoid hitting 429 Rate Limits
                for (let i = 0; i < skeleton.stages.length; i++) {
                    const stage = skeleton.stages[i];
                    
                    // Add a small cooldown buffer between requests (even if serialized) to respect RPM limits
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); 
                    }

                    console.log(`[AI Hook] ⏳ Fetching details for Stage ${i + 1}`);
                    
                    try {
                        const details = await generateStageDetails(stage, skeleton.description);
                        
                        setProcessDef(prev => {
                            if (!prev || prev.id !== skeleton.id) return prev;
                            const newStages = [...prev.stages];
                            const stageIndex = newStages.findIndex(s => s.id === stage.id);
                            if (stageIndex !== -1) {
                                newStages[stageIndex] = { ...newStages[stageIndex], sections: details };
                            }
                            return { ...prev, stages: newStages };
                        });
                    } catch (err) {
                        console.error(`[AI Hook] Failed to load stage ${stage.id}`, err);
                    } finally {
                        setLoadingStageIds(prev => {
                            const next = new Set(prev);
                            next.delete(stage.id);
                            return next;
                        });
                    }
                }

            } else {
                setIsGenerating(false);
                if (confirm("The AI Service is currently unavailable (Quota Exceeded). Load Demo Mode?")) {
                    handleStartDemo(true);
                }
            }
        } catch (e: any) {
            setIsGenerating(false);
            console.error("[AI Hook] ❌ CRITICAL ERROR:", e);
            if (e.message?.includes('quota') || e.message?.includes('429')) {
                 if (confirm("API Quota Exceeded. Load Demo Process?")) {
                    handleStartDemo(true);
                 }
            } else {
                 alert("Generation error. Please check network.");
            }
        }
    };

    // --- Legacy Upload Flow ---
    const handleLegacyFormUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setShowDemoDrop(true);
        setIsGenerating(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64 = reader.result as string;
                const data = base64.split(',')[1];
                const result = await generateProcessFromImage(data, file.type);
                
                if (result) {
                    setProcessDef(result);
                    setSelectedStageId(result.stages[0]?.id || '');
                    setViewMode('editor');
                } else {
                   setProcessDef(demoDigitizedProcess);
                   setSelectedStageId(demoDigitizedProcess.stages[0].id);
                   setViewMode('editor');
                   alert("AI extraction incomplete. Loaded backup demo.");
                }
            } catch (e) {
                console.error(e);
                alert("Error analyzing image.");
            } finally {
                setShowDemoDrop(false);
                setIsGenerating(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- Modification Flow ---
    const handleAiModification = async (prompt: string, context: { selectedStageId: string, selectedSectionId: string | null }, onSuccess: () => void) => {
        if (!processDef || !prompt) return;
        setIsGenerating(true);
        try {
            const updated = await modifyProcess(processDef, prompt, context);
            if (updated) {
                setProcessDef(updated);
                onSuccess();
            } else {
                alert("Could not perform modification.");
            }
        } catch (e) {
            console.error(e);
            alert("Modification failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        setIsGenerating,
        showDemoDrop,
        setShowDemoDrop,
        handleStartGeneration,
        handleLegacyFormUpload,
        handleAiModification
    };
};
