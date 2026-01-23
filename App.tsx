import React, { Component, useState, useEffect, ErrorInfo, ReactNode, useRef } from 'react';
import { ChevronsLeft } from 'lucide-react';
import { Onboarding } from './components/Onboarding';
import { demoProcess } from './services/demoData'; // Import Demo Data
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
import { GuideOverlay, DemoStep } from './components/GuideOverlay'; // Import Demo
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

    // Guard against double firing in strict mode
    const restorePromptShown = useRef(false);

    // Check for Backup on Mount
    useEffect(() => {
        if (restorePromptShown.current) return;

        const { hasBackup, timestamp, restore } = checkForBackup();
        if (hasBackup && !processDef) {
            restorePromptShown.current = true; // Mark as shown immediately

            // Small timeout to allow UI to settle before blocking alert
            setTimeout(() => {
                const shouldRestore = window.confirm(`Found an unsaved session from ${new Date(timestamp!).toLocaleString()}. Restore it?`);
                if (shouldRestore) {
                    restore();
                    setViewMode('editor');
                } else {
                    // User explicitly cancelled, ensure we don't prompt again this session for this specific backup state
                    // logic here is fine as is, effect won't re-run significantly if deps are stable
                }
            }, 100);
        }
    }, [checkForBackup, processDef]); // Run once on mount or when processDef is initially null

    // --- GLOBAL PARTIES EXPOSE FOR PICKER ---
    useEffect(() => {
        (window as any).catapulseParties = processDef?.parties || [];
    }, [processDef?.parties]);

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

    // --- DEMO STATE ---
    const [demoStep, setDemoStep] = useState<DemoStep>('NONE');

    const handleStartDemo = () => {
        setProcessDef(demoProcess);
        setStartPrompt('');
        setFormData({});
        setViewMode('editor');
        setDemoStep('WELCOME');
        // Select first stage for context
        setSelectedStageId(demoProcess.stages[0]?.id || '');
    };

    const handlePrevDemoStep = () => {
        const steps: DemoStep[] = [
            'WELCOME', 'EDITOR_OVERVIEW', 'PROPERTIES_INTRO',
            'PROPERTIES_STAGE', 'PROPERTIES_STAGE_LOGIC_SKIP', 'PROPERTIES_STAGE_ROUTING',
            'PROPERTIES_SECTION', 'PROPERTIES_SECTION_LAYOUT', 'PROPERTIES_SECTION_STYLE', 'PROPERTIES_SECTION_VISIBILITY',
            'PROPERTIES_ELEMENT', 'PROPERTIES_ELEMENT_TYPE', 'PROPERTIES_ELEMENT_OPTIONS', 'PROPERTIES_ELEMENT_LOGIC_INTRO', 'PROPERTIES_ELEMENT_VISIBILITY', 'PROPERTIES_ELEMENT_MANDATORY', 'PROPERTIES_ELEMENT_VALIDATION',
            'AI_FEATURES',
            'HEADER_INTRO', 'HEADER_WORKSHOP', 'HEADER_NEW', 'HEADER_UPLOAD', 'HEADER_DOWNLOAD', 'HEADER_SHARE', 'HEADER_RENAME', 'HEADER_SETTINGS',
            'MODES', 'MODE_TABLE', 'MODE_FLOW', 'PREVIEW_MODE', 'MODE_SPEC',
            'QA_MODE', 'QA_TAB_STORIES', 'QA_TAB_DICTIONARY', 'QA_TAB_CASES',
            'PEGA_MODE', 'COMPLETE'
        ];
        const currentIdx = steps.indexOf(demoStep);
        if (currentIdx > 0) {
            const prevStep = steps[currentIdx - 1];
            setDemoStep(prevStep);

            // STATE MANAGEMENT
            // Always set 'properties' panel active if we are in properties territory
            if (prevStep.startsWith('PROPERTIES_')) setActiveSidePanel('properties');

            // 1. STAGE CONTEXT
            if (['PROPERTIES_INTRO', 'PROPERTIES_STAGE'].includes(prevStep)) {
                setSelectedStageId('stg_details');
                setSelectedSectionId(null);
                setSelectedElementId(null);
                setActivePropTab('general');
            }
            if (['PROPERTIES_STAGE_LOGIC_SKIP', 'PROPERTIES_STAGE_ROUTING'].includes(prevStep)) {
                setSelectedStageId('stg_details');
                setSelectedSectionId(null);
                setSelectedElementId(null);
                setActivePropTab('logic');
            }

            // 2. SECTION CONTEXT
            if (['PROPERTIES_SECTION', 'PROPERTIES_SECTION_LAYOUT', 'PROPERTIES_SECTION_STYLE'].includes(prevStep)) {
                setSelectedStageId('stg_details');
                setSelectedSectionId('sec_personal');
                setSelectedElementId(null);
                setActivePropTab('general');
            }
            if (prevStep === 'PROPERTIES_SECTION_VISIBILITY') {
                setSelectedStageId('stg_details');
                setSelectedSectionId('sec_personal');
                setSelectedElementId(null);
                setActivePropTab('logic');
            }

            // 3. ELEMENT CONTEXT
            if (['PROPERTIES_ELEMENT', 'PROPERTIES_ELEMENT_TYPE', 'PROPERTIES_ELEMENT_OPTIONS'].includes(prevStep)) {
                setSelectedElementId('memberId');
                setActivePropTab('general');
            }
            if (['PROPERTIES_ELEMENT_LOGIC_INTRO', 'PROPERTIES_ELEMENT_VISIBILITY', 'PROPERTIES_ELEMENT_MANDATORY', 'PROPERTIES_ELEMENT_VALIDATION'].includes(prevStep)) {
                setSelectedElementId('memberId');
                setActivePropTab('logic');
            }

            // HEADER & SETTINGS
            if (['HEADER_INTRO', 'HEADER_WORKSHOP', 'HEADER_NEW', 'HEADER_UPLOAD', 'HEADER_DOWNLOAD', 'HEADER_SHARE', 'HEADER_RENAME'].includes(prevStep)) {
                setActiveSidePanel('none');
            }
            if (prevStep === 'HEADER_SETTINGS') {
                setActiveSidePanel('properties'); // Revert to properties? Or maybe 'none' if we just highlight the button.
                // The description says "Toggle...". 
                // Let's keep side panel closed or whatever user had, but ensure it's in Editor mode.
                setActiveSidePanel('none');
            }

            // NON-PROPERTIES / MODES
            if (prevStep === 'MODES') {
                setViewMode('editor');
                setActiveSidePanel('none');
            }
            if (prevStep === 'MODE_TABLE') setViewMode('table');
            if (prevStep === 'MODE_FLOW') setViewMode('flow');
            if (prevStep === 'PREVIEW_MODE') setViewMode('preview');
            if (prevStep === 'MODE_SPEC') setViewMode('spec');

            // QA
            if (prevStep === 'QA_MODE') {
                setViewMode('qa');
                setQaTab('stories');
            }
            if (prevStep === 'QA_TAB_STORIES') setQaTab('stories');
            if (prevStep === 'QA_TAB_DICTIONARY') setQaTab('dictionary');
            if (prevStep === 'QA_TAB_CASES') setQaTab('cases');

            if (prevStep === 'PEGA_MODE') setViewMode('pega');
        }
    };

    const handleNextDemoStep = () => {
        const steps: DemoStep[] = [
            'WELCOME', 'EDITOR_OVERVIEW', 'PROPERTIES_INTRO',
            'PROPERTIES_STAGE', 'PROPERTIES_STAGE_LOGIC_SKIP', 'PROPERTIES_STAGE_ROUTING',
            'PROPERTIES_SECTION', 'PROPERTIES_SECTION_LAYOUT', 'PROPERTIES_SECTION_STYLE', 'PROPERTIES_SECTION_VISIBILITY',
            'PROPERTIES_ELEMENT', 'PROPERTIES_ELEMENT_TYPE', 'PROPERTIES_ELEMENT_OPTIONS', 'PROPERTIES_ELEMENT_LOGIC_INTRO', 'PROPERTIES_ELEMENT_VISIBILITY', 'PROPERTIES_ELEMENT_MANDATORY', 'PROPERTIES_ELEMENT_VALIDATION',
            'AI_FEATURES',
            'HEADER_INTRO', 'HEADER_WORKSHOP', 'HEADER_NEW', 'HEADER_UPLOAD', 'HEADER_DOWNLOAD', 'HEADER_SHARE', 'HEADER_RENAME', 'HEADER_SETTINGS',
            'MODES', 'MODE_TABLE', 'MODE_FLOW', 'PREVIEW_MODE', 'MODE_SPEC',
            'QA_MODE', 'QA_TAB_STORIES', 'QA_TAB_DICTIONARY', 'QA_TAB_CASES',
            'PEGA_MODE', 'COMPLETE'
        ];
        const currentIdx = steps.indexOf(demoStep);
        if (currentIdx < steps.length - 1) {
            const nextStep = steps[currentIdx + 1];
            setDemoStep(nextStep);

            // STATE MANAGEMENT
            if (nextStep.startsWith('PROPERTIES_')) setActiveSidePanel('properties');

            // 1. STAGE CONTEXT
            if (nextStep === 'PROPERTIES_INTRO' || nextStep === 'PROPERTIES_STAGE') {
                setSelectedStageId('stg_details');
                setSelectedSectionId(null);
                setSelectedElementId(null);
                setActivePropTab('general');
            }
            if (['PROPERTIES_STAGE_LOGIC_SKIP', 'PROPERTIES_STAGE_ROUTING'].includes(nextStep)) {
                setActivePropTab('logic');
            }

            // 2. SECTION CONTEXT
            if (nextStep === 'PROPERTIES_SECTION') {
                setSelectedSectionId('sec_personal');
                setSelectedElementId(null);
                setActivePropTab('general');
            }
            if (nextStep === 'PROPERTIES_SECTION_VISIBILITY') {
                setActivePropTab('logic');
            }

            // 3. ELEMENT CONTEXT
            if (nextStep === 'PROPERTIES_ELEMENT') {
                setSelectedElementId('memberId');
                setActivePropTab('general');
            }
            if (nextStep === 'PROPERTIES_ELEMENT_LOGIC_INTRO') {
                setActivePropTab('logic');
            }

            // HEADER STEPS
            if (['HEADER_INTRO', 'HEADER_WORKSHOP', 'HEADER_NEW', 'HEADER_UPLOAD', 'HEADER_DOWNLOAD', 'HEADER_SHARE', 'HEADER_RENAME', 'HEADER_SETTINGS'].includes(nextStep)) {
                setActiveSidePanel('none'); // Close panel to focus on header
            }

            // MODES
            if (nextStep === 'MODES') setActiveSidePanel('none');

            if (nextStep === 'MODE_TABLE') setViewMode('table');
            if (nextStep === 'MODE_FLOW') setViewMode('flow');
            if (nextStep === 'PREVIEW_MODE') setViewMode('preview');
            if (nextStep === 'MODE_SPEC') setViewMode('spec');

            // QA
            if (nextStep === 'QA_MODE') {
                setViewMode('qa');
                setQaTab('stories');
            }
            if (nextStep === 'QA_TAB_STORIES') setQaTab('stories');
            if (nextStep === 'QA_TAB_DICTIONARY') setQaTab('dictionary');
            if (nextStep === 'QA_TAB_CASES') setQaTab('cases');

            if (nextStep === 'PEGA_MODE') setViewMode('pega');
            if (nextStep === 'COMPLETE') setViewMode('editor'); // Ensure we end in editor for the final message
        } else {
            // User clicked "Get Started" - Return to Start Screen
            setDemoStep('NONE');
            setProcessDef(null);
            setViewMode('onboarding');
        }
    };

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

    const onAiModification = (overridePrompt?: string) => {
        handleAiModification(overridePrompt || aiPrompt, { selectedStageId, selectedSectionId }, () => setAiPrompt(''));
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
                    handleStartDemo={handleStartDemo} // Pass Handler
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
                                    setProcessDef={setProcessDef}
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
                            id="properties-panel-container"
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

                    {viewMode === 'editor' && activeSidePanel === 'none' && (
                        <button
                            onClick={() => setActiveSidePanel('properties')}
                            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-sw-teal border border-sw-teal border-r-0 shadow-md p-3 rounded-l-lg text-white transition-all hover:pr-4 hover:shadow-lg hover:brightness-110"
                            title="Open Properties Panel"
                        >
                            <ChevronsLeft size={24} />
                        </button>
                    )}
                </div>

                <AppFooter />
                <GuideOverlay
                    step={demoStep}
                    onNext={handleNextDemoStep}
                    onPrev={handlePrevDemoStep}
                    onSkip={() => {
                        setDemoStep('NONE');
                        setProcessDef(null);
                        setViewMode('onboarding');
                    }}
                />
            </div>
        </ErrorBoundary>
    );
};

export default App;