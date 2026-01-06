import React, { Component, useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { Onboarding } from './components/Onboarding';
import { ModeEditor } from './components/ModeEditor';
import { ModePreview } from './components/ModePreview';
import { ModeSpec } from './components/ModeSpec';
import { ModeQA } from './components/ModeQA';
import { ModePega } from './components/ModePega';
import { ModeFlow } from './components/ModeFlow';
import { ModeTable } from './components/ModeTable'; // Import ModeTable
import { PropertiesPanel } from './components/PropertiesPanel';
import { GlobalSettingsPanel } from './components/GlobalSettingsPanel';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { LoadingOverlay } from './components/LoadingOverlay';
import { useProcessState } from './hooks/useProcessState';
import { useAiOperations } from './hooks/useAiOperations';
import { useAutoBackup } from './hooks/useAutoBackup'; // Import Backup Hook
import {
    FormState, VisualTheme, UserStory, TestCase, ProcessDefinition,
    ElementDefinition, SectionDefinition, StageDefinition, StoryStrategy, SkillRule
} from './types';

// --- Error Boundary for Hardening ---
interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: any): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-sw-lightGray text-sw-text p-8 text-center">
                    <h1 className="text-4xl font-serif text-sw-red mb-4">Something went wrong.</h1>
                    <p className="text-gray-600 mb-8">The application encountered an unexpected error.</p>
                    <button
                        onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                        className="px-6 py-2 bg-sw-teal text-white rounded-lg hover:bg-sw-tealHover transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Main App Component ---
const App: React.FC = () => {
    // Use Custom Hook for Logic
    const {
        processDef, setProcessDef: hookSetProcessDef, updateElement, updateSection, updateStage, deleteElement, deleteSection, deleteStage
    } = useProcessState();

    // Cast hook setter to match expected React.Dispatch signature where necessary
    const setProcessDef = hookSetProcessDef as React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;

    // Auto-Backup Hook
    const { checkForBackup } = useAutoBackup(processDef, setProcessDef);

    // Check for Backup on Mount
    useEffect(() => {
        const { hasBackup, timestamp, restore } = checkForBackup();
        if (hasBackup && !processDef) {
            const shouldRestore = window.confirm(`Found an unsaved session from ${new Date(timestamp!).toLocaleString()}. Restore it?`);
            if (shouldRestore) {
                restore();
                setViewMode('editor');
            }
        }
    }, [checkForBackup, processDef]); // Run once on mount or when processDef is initially null

    // UI State
    const [viewMode, setViewMode] = useState<'onboarding' | 'editor' | 'table' | 'flow' | 'preview' | 'spec' | 'qa' | 'pega'>('onboarding');
    const [startPrompt, setStartPrompt] = useState('');
    const [activeSidePanel, setActiveSidePanel] = useState<'none' | 'properties' | 'settings'>('properties');
    const [panelWidth, setPanelWidth] = useState(480);
    const [isResizingPanel, setIsResizingPanel] = useState(false);

    // Selection State
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    // Tool State
    const [aiPrompt, setAiPrompt] = useState('');
    const [activePropTab, setActivePropTab] = useState<'general' | 'logic'>('general');
    const [formData, setFormData] = useState<FormState>({});
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({}); // Lifted State
    const [visualTheme, setVisualTheme] = useState<VisualTheme>({ mode: 'type1', density: 'default', radius: 'medium' });
    const [personaPrompt, setPersonaPrompt] = useState('');
    const [isDetailedMode, setIsDetailedMode] = useState(false); // Default to Fast Mode (Single Call)

    // Clipboard State for Rules
    const [clipboardStageLogic, setClipboardStageLogic] = useState<SkillRule[] | null>(null);

    // QA & Pega State
    const [qaTab, setQaTab] = useState<'stories' | 'cases' | 'dictionary'>('stories');
    const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
    const [pegaTab, setPegaTab] = useState<'design' | 'blueprint' | 'manual' | 'data' | 'logic' | 'routing'>('design');

    // Dirty State (Unsaved Changes)
    const [isDirty, setIsDirty] = useState(false);

    // --- AUTO-SAVE & RESTORE ---
    // --- AUTO-SAVE & RESTORE ---
    // (Restoration is now handled by the useAutoBackup hook's checkForBackup on mount)

    // --- RESET HANDLER ---
    // If processDef is null (Reset), ensure all run-time state is cleared
    useEffect(() => {
        if (!processDef) {
            setFormData({});
            setFormErrors({});
        }
    }, [processDef]);

    // --- AUTO-SAVE (Delegated to Hook) ---
    // Removed redundant useEffect to prevent double-writes or race conditions. useAutoBackup handles it.

    // Dirty State Tracker
    useEffect(() => {
        if (processDef) setIsDirty(true);
    }, [processDef]);

    // Unload Warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Standard browser warning
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // --- AI Logic Hook ---
    const {
        isGenerating,
        setIsGenerating,
        showDemoDrop,
        setShowDemoDrop,
        loadingStageIds,
        handleStartGeneration,
        handleLegacyFormUpload,
        handleAiModification
    } = useAiOperations({
        processDef,
        setProcessDef,
        setViewMode,
        setStartPrompt,
        setSelectedStageId,
        isDetailedMode
    });

    const handleGenerateStories = async () => {
        if (!processDef) return;
        setIsGenerating(true);
        try {
            // const stories = await generateUserStories(processDef, storyStrategy); // Assuming generateUserStories is defined elsewhere
            // Merge logic is handled in ModeQA or we updated state here if we want centralized stories
            // Ideally ModeQA handles generation updates
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- MODIFICATION GUARD ---
    const checkSafeModification = (stageId: string | undefined): boolean => {
        if (!processDef || !stageId) return true;

        // Find stories linked to this stage that are DONE
        const doneStories = (processDef.userStories || []).filter(s =>
            s.relatedStageIds?.includes(stageId) && s.status === 'Done'
        );

        if (doneStories.length > 0) {
            const storyNames = doneStories.map(s => s.jiraId || s.title).join(', ');
            return confirm(
                `⚠️ WARNING: Modification Restricted\n\n` +
                `This screen is covered by completed story(s): ${storyNames}.\n` +
                `Modifying it may break the implemented functionality.\n\n` +
                `Are you sure you want to proceed? (You may need to create a Change Request)`
            );
        }
        return true;
    };

    // Safe Wrappers
    const safeUpdateElement = (el: ElementDefinition) => {
        const { stg, el: currentEl } = getSelectedObjects(); // Uses selectedStageId from state
        // If we are editing an element, we should know its stage.
        // Fallback: search for stage if current selection is not matching (rare but safer)
        let relevantStageId = stg?.id;
        if (!relevantStageId && processDef) {
            const foundStage = processDef.stages.find(s => s.sections.some(sec => sec.elements.some(e => e.id === el.id)));
            relevantStageId = foundStage?.id;
        }

        if (checkSafeModification(relevantStageId)) {
            // Check if ID changed (Renaming)
            if (currentEl && currentEl.id !== el.id) {
                // Pass old ID to finder, and update selection to new ID
                updateElement(el, currentEl.id);
                setSelectedElementId(el.id);
            } else {
                updateElement(el);
            }
        }
    };

    const safeUpdateSection = (sec: SectionDefinition) => {
        const { stg } = getSelectedObjects();
        let relevantStageId = stg?.id;
        if (!relevantStageId && processDef) {
            const foundStage = processDef.stages.find(s => s.sections.some(s => s.id === sec.id));
            relevantStageId = foundStage?.id;
        }

        if (checkSafeModification(relevantStageId)) {
            updateSection(sec);
        }
    };

    const safeUpdateStage = (stg: StageDefinition) => {
        if (checkSafeModification(stg.id)) {
            updateStage(stg);
        }
    };

    const safeDeleteElement = (id: string) => {
        // Find element to find stage
        if (!processDef) return;
        const foundStage = processDef.stages.find(s => s.sections.some(sec => sec.elements.some(e => e.id === id)));
        if (checkSafeModification(foundStage?.id)) {
            deleteElement(id);
        }
    };

    const safeDeleteSection = (id: string) => {
        if (!processDef) return;
        const foundStage = processDef.stages.find(s => s.sections.some(sec => sec.id === id)); // Corrected: find section by id
        if (checkSafeModification(foundStage?.id)) {
            deleteSection(id);
        }
    };

    // Note: Deleting a stage itself is a major change, always warn if it has stories
    const safeDeleteStage = (id: string) => {
        if (checkSafeModification(id)) {
            deleteStage(id);
        }
    };

    const handleStart = (useDemo = false) => {
        // Legacy demo flag ignored, using unified generation
        handleStartGeneration(startPrompt);
    };

    const onAiModification = () => {
        handleAiModification(aiPrompt, { selectedStageId, selectedSectionId }, () => setAiPrompt(''));
    };

    // --- GLOBAL OPTION SYNC ---
    const handleSyncGlobalOptions = (elementType: string, options: any[]) => {
        if (!processDef) return;
        const newDef = { ...processDef };

        let updateCount = 0;
        newDef.stages.forEach(stage => {
            stage.sections.forEach(section => {
                section.elements.forEach(element => {
                    if (element.type === elementType) {
                        element.options = options;
                        updateCount++;
                    }
                });
            });
        });

        if (updateCount > 0) {
            console.log(`Synced options for ${elementType} to ${updateCount} elements.`);
            setProcessDef(newDef);
        }
    };

    // Helper to resolve selection objects
    const getSelectedObjects = () => {
        if (!processDef) return { el: null, sec: null, stg: null };
        let stg: StageDefinition | null = null;
        let sec: SectionDefinition | null = null;
        let el: ElementDefinition | null = null;

        stg = processDef.stages.find(s => s.id === selectedStageId) || null;
        if (stg) {
            sec = stg.sections.find(s => s.id === selectedSectionId) || null;
            if (sec) {
                el = sec.elements.find(e => e.id === selectedElementId) || null;
            }
        }
        return { el, sec, stg };
    };

    const { el: selectedElement, sec: selectedSection, stg: selectedStage } = getSelectedObjects();

    // --- Render ---

    if (viewMode === 'onboarding') {
        return (
            <>
                <Onboarding
                    startPrompt={startPrompt}
                    setStartPrompt={setStartPrompt}
                    handleStart={handleStart}
                    handleLegacyFormUpload={handleLegacyFormUpload}
                    handleLoadTemplate={(def) => {
                        console.log("Loading template:", def.name);
                        setProcessDef(def);
                        setFormData({}); // <--- RESET FORM DATA
                        setStartPrompt('');
                        setViewMode('editor');
                    }}
                    showDemoDrop={showDemoDrop}
                    isDetailedMode={isDetailedMode}
                    setIsDetailedMode={setIsDetailedMode}
                />
                {isGenerating && <LoadingOverlay />}
            </>
        );
    }

    // Only show global loading if we have NO process definition yet
    if (isGenerating && !processDef) return <LoadingOverlay />;
    if (!processDef) return null;

    return (
        <ErrorBoundary>
            <div
                className={`h-screen bg-white flex flex-col overflow-hidden font-sans text-sw-text relative ${isResizingPanel ? 'cursor-ew-resize select-none' : ''}`}
                onMouseMove={(e) => {
                    if (isResizingPanel) {
                        const newWidth = window.innerWidth - e.clientX;
                        if (newWidth > 300 && newWidth < 800) {
                            setPanelWidth(newWidth);
                        }
                    }
                }}
                onMouseUp={() => setIsResizingPanel(false)}
            >
                <AppHeader
                    processDef={processDef}
                    setProcessDef={(def) => { setProcessDef(def); setIsDirty(false); }} // Loading new def resets dirty
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    isSettingsOpen={activeSidePanel === 'settings'}
                    setIsSettingsOpen={(val) => setActiveSidePanel(val ? 'settings' : 'properties')}
                    visualTheme={visualTheme}
                    isDirty={isDirty}
                    onExternalSave={() => setIsDirty(false)}
                />

                <div className="flex-1 flex overflow-hidden relative">
                    <main className="flex-1 overflow-hidden relative flex flex-col">

                        {viewMode === 'editor' && (
                            <div className="flex-1 flex overflow-hidden">
                                <ModeEditor
                                    processDef={processDef}
                                    setProcessDef={setProcessDef as React.Dispatch<React.SetStateAction<ProcessDefinition>>}
                                    selectedStageId={selectedStageId}
                                    setSelectedStageId={setSelectedStageId}
                                    selectedSectionId={selectedSectionId}
                                    setSelectedSectionId={setSelectedSectionId}
                                    selectedElementId={selectedElementId}
                                    setSelectedElementId={(id) => {
                                        setSelectedElementId(id);
                                        if (id) setActiveSidePanel('properties');
                                    }}
                                    aiPrompt={aiPrompt}
                                    setAiPrompt={setAiPrompt}
                                    handleAiModification={onAiModification}
                                    isGenerating={isGenerating}
                                    visualTheme={visualTheme}
                                    isSettingsOpen={activeSidePanel !== 'none'}
                                    loadingStageIds={loadingStageIds}
                                />
                            </div>
                        )}

                        {viewMode === 'table' && (
                            <div className="flex-1 overflow-hidden bg-gray-50">
                                <ModeTable
                                    processDef={processDef}
                                    setProcessDef={(def) => setProcessDef(def)}
                                    visualTheme={visualTheme}
                                />
                            </div>
                        )}

                        {viewMode === 'flow' && (
                            <div className="flex-1 overflow-hidden bg-gray-50">
                                <ModeFlow processDef={processDef} setProcessDef={(def) => setProcessDef(def)} />
                            </div>
                        )}

                        {viewMode === 'preview' && (
                            <div className="flex-1 overflow-y-auto bg-sw-lighterGray">
                                <ModePreview
                                    processDef={processDef}
                                    formData={formData}
                                    setFormData={setFormData}
                                    formErrors={formErrors}         // Passed Down
                                    setFormErrors={setFormErrors}   // Passed Down
                                    visualTheme={visualTheme}
                                    personaPrompt={personaPrompt}
                                    setPersonaPrompt={setPersonaPrompt}
                                    userStories={processDef.userStories || []} // Pass stories for overlay
                                />
                            </div>
                        )}

                        {viewMode === 'spec' && <div className="flex-1 overflow-y-auto bg-gray-50"><ModeSpec processDef={processDef} allElements={processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements)} /></div>}

                        {viewMode === 'qa' && (
                            <div className="flex-1 overflow-y-auto bg-gray-50">
                                <ModeQA
                                    processDef={processDef}
                                    qaTab={qaTab} setQaTab={setQaTab}
                                    storyStrategy={storyStrategy} setStoryStrategy={setStoryStrategy}
                                    userStories={processDef.userStories || []}
                                    setUserStories={(stories) => setProcessDef({ ...processDef, userStories: stories })}
                                    testCases={processDef.testCases || []}
                                    setTestCases={(cases) => setProcessDef({ ...processDef, testCases: cases })}
                                    isGenerating={isGenerating} setIsGenerating={setIsGenerating}
                                />
                            </div>
                        )}

                        {viewMode === 'pega' && <div className="flex-1 overflow-y-auto bg-gray-50"><ModePega processDef={processDef} pegaTab={pegaTab} setPegaTab={setPegaTab} /></div>}
                    </main>

                    {viewMode === 'editor' && (
                        <div
                            className={`fixed right-0 top-16 bottom-0 z-40 bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ease-in-out ${activeSidePanel !== 'none' ? 'translate-x-0' : 'translate-x-full'}`}
                            style={{ width: activeSidePanel !== 'none' ? panelWidth : 0 }}
                        >
                            {/* Resize Handle */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-sw-teal z-50 transition-colors group"
                                onMouseDown={() => setIsResizingPanel(true)}
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-300 rounded group-hover:bg-sw-teal" />
                            </div>

                            {activeSidePanel === 'properties' && (
                                <PropertiesPanel
                                    selectedElement={selectedElement}
                                    selectedSection={selectedSection}
                                    selectedStage={selectedStage}
                                    allElements={processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements)}
                                    activeTab={activePropTab}
                                    onTabChange={setActivePropTab}
                                    onUpdateElement={safeUpdateElement}
                                    onUpdateSection={safeUpdateSection}
                                    onUpdateStage={safeUpdateStage}
                                    onDeleteElement={safeDeleteElement}
                                    onDeleteSection={safeDeleteSection}
                                    onDeleteStage={safeDeleteStage}
                                    visualTheme={visualTheme}
                                    onOpenSettings={() => setActiveSidePanel('settings')}
                                    onClose={() => setActiveSidePanel('none')}

                                    // Rule Clipboard Props
                                    clipboardStageLogic={clipboardStageLogic}
                                    onCopyStageLogic={(rules) => setClipboardStageLogic(rules)}
                                    onPasteStageLogic={(stageId) => {
                                        if (checkSafeModification(stageId)) {
                                            if (!clipboardStageLogic || !processDef) return;
                                            const newDef = { ...processDef };
                                            const stg = newDef.stages.find(s => s.id === stageId);
                                            if (stg) {
                                                const newRules = clipboardStageLogic.map(r => ({
                                                    ...r,
                                                    logic: { ...r.logic, id: `grp_${Date.now()}_${Math.random()}` }
                                                }));
                                                stg.skillLogic = [...(stg.skillLogic || []), ...newRules];
                                                setProcessDef(newDef);
                                            }
                                        }
                                    }}
                                    // Navigation for Breadcrumbs
                                    onSelectStage={(id) => {
                                        setSelectedElementId(null);
                                        setSelectedSectionId(null);
                                        setSelectedStageId(id);
                                    }}
                                    onSelectSection={(id) => {
                                        setSelectedElementId(null);
                                        setSelectedSectionId(id);
                                    }}
                                    onSelectElement={(id) => {
                                        setSelectedElementId(id);
                                    }}
                                    onSyncGlobalOptions={handleSyncGlobalOptions}
                                />
                            )}
                            {activeSidePanel === 'settings' && (
                                <GlobalSettingsPanel
                                    visualTheme={visualTheme}
                                    onUpdateTheme={setVisualTheme}
                                    onClose={() => setActiveSidePanel('properties')}
                                    panelWidth={panelWidth}
                                    onResizeStart={() => setIsResizingPanel(true)} // Keep for internal usage if needed
                                />
                            )}
                        </div>
                    )}
                </div>

                <AppFooter />
            </div>
        </ErrorBoundary>
    );
};

export default App;