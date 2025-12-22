
import React, { useState } from 'react';
import { ProcessDefinition } from '../types';
import {
    generateMonolithicProcess,
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
    isDetailedMode?: boolean;
}

export const useAiOperations = ({
    processDef,
    setProcessDef,
    setViewMode,
    setStartPrompt,
    setSelectedStageId,
    isDetailedMode = false
}: AiOperationsProps) => {

    const [isGenerating, setIsGenerating] = useState(false);
    const [showDemoDrop, setShowDemoDrop] = useState(false);
    const [loadingStageIds, setLoadingStageIds] = useState<Set<string>>(new Set());

    // --- Start Generation Flow ---
    const handleStartGeneration = async (prompt: string) => {
        if (!prompt.trim()) {
            const defaultProcess: ProcessDefinition = {
                id: `proc_${Date.now()}`,
                name: "New Process",
                description: "Started from scratch",
                stages: [{ id: 'stg_1', title: 'Stage 1', sections: [{ id: 'sec_1', title: 'Section 1', layout: '1col', elements: [] }] }]
            };
            setProcessDef(defaultProcess);
            setSelectedStageId(defaultProcess.stages[0].id);
            setViewMode('editor');
            return;
        }

        setIsGenerating(true);
        try {
            console.log(`[AI Hook] 🟢 STARTING GENERATION for: "${prompt}". Mode: ${isDetailedMode ? 'DETAILED' : 'FAST'}`);

            let skeletonProcess: ProcessDefinition | null = null;

            // --- STRATEGY 1: ONE-SHOT (MONOLITHIC) ---
            if (!isDetailedMode) {
                try {
                    const fullProcess = await generateMonolithicProcess(prompt);

                    // VALIDATION: Does it actually have fields?
                    // Sometimes models return stages with empty section arrays.
                    const hasFields = fullProcess && fullProcess.stages.some(s =>
                        s.sections && s.sections.some(sec => sec.elements && sec.elements.length > 0)
                    );

                    if (fullProcess && hasFields) {
                        console.log(`[AI Hook] 🚀 One-Shot Generation Successful!`);
                        setProcessDef(fullProcess);
                        setSelectedStageId(fullProcess.stages[0]?.id || '');
                        setViewMode('editor');
                        setIsGenerating(false);
                        return;
                    }

                    if (fullProcess && !hasFields) {
                        console.warn(`[AI Hook] ⚠️ One-Shot returned structure but no fields. Promoting result to Skeleton.`);
                        // We use the empty structure as the skeleton for the next step
                        skeletonProcess = fullProcess;
                    }
                } catch (err: any) {
                    // Only log if not a quota error
                    if (!err.message?.includes('quota')) {
                        console.warn(`[AI Hook] One-Shot failed, falling back.`, err);
                    } else {
                        throw err;
                    }
                }
            }

            // --- STRATEGY 2: ITERATIVE (FALLBACK / DETAILED) ---
            console.log(`[AI Hook] 🔄 Executing Iterative Strategy (Skeleton + Flesh)...`);

            // If we don't have a skeleton from a partial fast-mode, generate one now
            if (!skeletonProcess) {
                skeletonProcess = await generateProcessSkeleton(prompt);
            }

            if (skeletonProcess) {
                console.log(`[AI Hook] ✅ SKELETON READY. Loading details for ${skeletonProcess.stages.length} stages...`);

                // Initialize Loading State for UI spinners
                const newLoadingSet = new Set<string>();
                skeletonProcess.stages.forEach(s => newLoadingSet.add(s.id));
                setLoadingStageIds(newLoadingSet);

                // Show Skeleton Immediately
                setProcessDef(skeletonProcess);
                setSelectedStageId(skeletonProcess.stages[0]?.id || '');
                setViewMode('editor');
                setIsGenerating(false); // Unblock main UI, move to background loading

                // Step 2: Generate Flesh (Serialized Loop)
                // We use a reference to the ID structure to ensure we map back correctly
                const stageIds = skeletonProcess.stages.map(s => s.id);
                const processDescription = skeletonProcess.description;

                for (let i = 0; i < stageIds.length; i++) {
                    const stageId = stageIds[i];

                    // RPM Throttling: Add delay between requests
                    if (i > 0) await new Promise(r => setTimeout(r, 2000));

                    try {
                        // We need to fetch the current stage object from state or skeleton
                        // Using skeleton is safer for the 'prompt' context
                        const stageRef = skeletonProcess.stages.find(s => s.id === stageId);
                        if (!stageRef) continue;

                        console.log(`[AI Hook] ⏳ Fetching details for Stage ${i + 1}: ${stageRef.title}`);
                        const sections = await generateStageDetails(stageRef, processDescription);

                        // Update State Functionally
                        setProcessDef(prev => {
                            if (!prev) return prev;
                            const newStages = [...prev.stages];
                            const idx = newStages.findIndex(s => s.id === stageId);
                            if (idx !== -1) {
                                newStages[idx] = { ...newStages[idx], sections: sections };
                            }
                            return { ...prev, stages: newStages };
                        });
                    } catch (err) {
                        console.error(`[AI Hook] Failed stage ${stageId}`, err);
                    } finally {
                        setLoadingStageIds(prev => {
                            const next = new Set(prev);
                            next.delete(stageId);
                            return next;
                        });
                    }
                }
            } else {
                throw new Error("Could not generate process structure.");
            }

        } catch (e: any) {
            setIsGenerating(false);
            console.error("[AI Hook] ❌ GENERATION ERROR:", e);

            if (e.message?.includes('quota') || e.message?.includes('limit exceeded') || e.status === 429) {
                alert("API Quota Limit Reached. Please try again later.");
            } else {
                alert(e.message || "Generation error. Please try again.");
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
            if (typeof reader.result !== 'string') {
                setShowDemoDrop(false);
                setIsGenerating(false);
                return;
            }

            try {
                const base64 = reader.result;
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
        loadingStageIds,
        setLoadingStageIds,
        handleStartGeneration,
        handleLegacyFormUpload,
        handleAiModification
    };
};
