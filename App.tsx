import React, { useState, ErrorInfo, ReactNode } from 'react';
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
import { DemoManager } from './components/DemoManager';
import { DemoFocusOverlay } from './components/DemoFocusOverlay';
import { useProcessState } from './hooks/useProcessState'; 
import { useAiOperations } from './hooks/useAiOperations';
import { 
  FormState, VisualTheme, UserStory, TestCase, 
  ElementDefinition, SectionDefinition, StageDefinition, StoryStrategy, SkillRule
} from './types';

// --- Error Boundary for Hardening ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

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
    processDef, setProcessDef, updateElement, updateSection, updateStage, deleteElement, deleteSection, deleteStage
  } = useProcessState();

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
  const [visualTheme, setVisualTheme] = useState<VisualTheme>({ mode: 'type1', density: 'default', radius: 'medium' });
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [isDetailedMode, setIsDetailedMode] = useState(false); // Default to Fast Mode (Single Call)
  
  // Clipboard State for Rules
  const [clipboardStageLogic, setClipboardStageLogic] = useState<SkillRule[] | null>(null);

  // QA & Pega State
  const [qaTab, setQaTab] = useState<'stories' | 'cases'>('stories');
  const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
  const [pegaTab, setPegaTab] = useState<'design' | 'blueprint' | 'manual' | 'data' | 'logic'>('design');

  // Demo State
  const [isDemoMode, setIsDemoMode] = useState(false);

  // --- Helpers for Demo ---
  const handleStartDemo = (useDemo = false) => {
      setIsDemoMode(true);
      setStartPrompt('');
      setProcessDef(null); 
      setViewMode('onboarding');
  };

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
      handleStartDemo,
      isDetailedMode
  });

  const handleStart = (useDemo = false) => {
      if (useDemo) {
          handleStartDemo(true);
      } else {
          handleStartGeneration(startPrompt);
      }
  };

  const onAiModification = () => {
      handleAiModification(aiPrompt, { selectedStageId, selectedSectionId }, () => setAiPrompt(''));
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
                showDemoDrop={showDemoDrop}
                isDetailedMode={isDetailedMode}
                setIsDetailedMode={setIsDetailedMode}
            />
            {isGenerating && <LoadingOverlay />}
            {isDemoMode && (
                <DemoManager 
                    setProcessDef={setProcessDef}
                    setViewMode={setViewMode}
                    setIsGenerating={setIsGenerating}
                    setStartPrompt={setStartPrompt}
                    setShowDemoDrop={setShowDemoDrop}
                    setFormData={setFormData}
                    setUserStories={(stories) => setProcessDef(prev => prev ? { ...prev, userStories: stories } : null)}
                    setTestCases={(cases) => setProcessDef(prev => prev ? { ...prev, testCases: cases } : null)}
                    setPersonaPrompt={setPersonaPrompt}
                    setAiPrompt={setAiPrompt}
                    setSelectedStageId={setSelectedStageId}
                    setSelectedSectionId={setSelectedSectionId}
                    setSelectedElementId={setSelectedElementId}
                    setActiveSidePanel={() => {}} 
                    setActivePropTab={setActivePropTab}
                    onStop={() => { setIsDemoMode(false); setViewMode('onboarding'); setProcessDef(null); }}
                    processDef={processDef}
                    setVisualTheme={setVisualTheme}
                    setQaTab={setQaTab}
                    setPegaTab={setPegaTab}
                />
            )}
          </>
      );
  }

  // Only show global loading if we have NO process definition yet
  if (isGenerating && !processDef) return <LoadingOverlay />;
  if (!processDef) return null;

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-white flex flex-col overflow-hidden font-sans text-sw-text relative">
        <AppHeader 
            processDef={processDef} 
            setProcessDef={setProcessDef}
            viewMode={viewMode} 
            setViewMode={setViewMode} 
            isSettingsOpen={activeSidePanel === 'settings'} 
            setIsSettingsOpen={(val) => setActiveSidePanel(val ? 'settings' : 'properties')}
            visualTheme={visualTheme}
        />

        <div className="flex-1 flex overflow-hidden relative">
            <main className="flex-1 overflow-hidden relative flex flex-col">
                
                {viewMode === 'editor' && (
                    <div className="flex-1 flex overflow-hidden">
                        <ModeEditor 
                            processDef={processDef} 
                            setProcessDef={setProcessDef}
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
                            setProcessDef={setProcessDef}
                            visualTheme={visualTheme}
                        />
                    </div>
                )}

                {viewMode === 'flow' && (
                    <div className="flex-1 overflow-hidden bg-gray-50">
                        <ModeFlow processDef={processDef} setProcessDef={setProcessDef} />
                    </div>
                )}
                
                {viewMode === 'preview' && (
                    <div className="flex-1 overflow-y-auto bg-sw-lighterGray">
                        <ModePreview 
                            processDef={processDef}
                            formData={formData}
                            setFormData={setFormData}
                            visualTheme={visualTheme}
                            personaPrompt={personaPrompt}
                            setPersonaPrompt={setPersonaPrompt}
                        />
                    </div>
                )}
                
                {viewMode === 'spec' && <div className="flex-1 overflow-y-auto bg-gray-50"><ModeSpec processDef={processDef} allElements={processDef.stages.flatMap(s=>s.sections).flatMap(sec=>sec.elements)} /></div>}
                
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
                <div className={`fixed right-0 top-16 bottom-0 z-40 transition-transform duration-300 ease-in-out ${activeSidePanel !== 'none' ? 'translate-x-0' : 'translate-x-full'}`}>
                    {activeSidePanel === 'properties' && (
                        <PropertiesPanel 
                            selectedElement={selectedElement}
                            selectedSection={selectedSection}
                            selectedStage={selectedStage}
                            allElements={processDef.stages.flatMap(s=>s.sections).flatMap(sec=>sec.elements)}
                            activeTab={activePropTab}
                            onTabChange={setActivePropTab}
                            onUpdateElement={updateElement}
                            onUpdateSection={updateSection}
                            onUpdateStage={updateStage}
                            onDeleteElement={(id) => {
                                // Scoped Delete: Pass current context to ensure we only remove the instance in this stage/section
                                deleteElement(id, selectedSectionId, selectedStageId);
                            }}
                            onDeleteSection={(id) => {
                                // Scoped Delete: Pass current stage context
                                deleteSection(id, selectedStageId);
                                if (selectedSectionId === id) {
                                    setSelectedSectionId(null);
                                    setSelectedElementId(null);
                                }
                            }}
                            onDeleteStage={(id) => {
                                if (!processDef) return;
                                if (processDef.stages.length <= 1) {
                                    alert("Cannot delete the only stage in the process.");
                                    return;
                                }
                                deleteStage(id);
                                if (selectedStageId === id) {
                                    const remaining = processDef.stages.filter(s => s.id !== id);
                                    if (remaining.length > 0) {
                                        setSelectedStageId(remaining[0].id);
                                        setSelectedSectionId(remaining[0].sections[0]?.id || null);
                                    } else {
                                        setSelectedStageId('');
                                        setSelectedSectionId(null);
                                    }
                                    setSelectedElementId(null);
                                }
                            }}
                            visualTheme={visualTheme}
                            onOpenSettings={() => setActiveSidePanel('settings')}
                            onClose={() => setActiveSidePanel('none')}
                            
                            // Rule Clipboard Props
                            clipboardStageLogic={clipboardStageLogic}
                            onCopyStageLogic={(rules) => setClipboardStageLogic(rules)}
                            onPasteStageLogic={(stageId) => {
                                if(!clipboardStageLogic || !processDef) return;
                                // Append logic to the specific stage
                                const newDef = { ...processDef };
                                const stg = newDef.stages.find(s => s.id === stageId);
                                if(stg) {
                                    // Deep clone rules to avoid ref issues, giving new IDs
                                    const newRules = clipboardStageLogic.map(r => ({
                                        ...r,
                                        logic: { ...r.logic, id: `grp_${Date.now()}_${Math.random()}` }
                                    }));
                                    stg.skillLogic = [...(stg.skillLogic || []), ...newRules];
                                    setProcessDef(newDef);
                                }
                            }}
                        />
                    )}
                    {activeSidePanel === 'settings' && (
                        <GlobalSettingsPanel 
                            visualTheme={visualTheme}
                            onUpdateTheme={setVisualTheme}
                            onClose={() => setActiveSidePanel('properties')}
                            panelWidth={panelWidth}
                            onResizeStart={() => setIsResizingPanel(true)}
                        />
                    )}
                </div>
            )}
        </div>

        <AppFooter />

        {isDemoMode && (
            <DemoManager 
                setProcessDef={setProcessDef}
                setViewMode={setViewMode}
                setIsGenerating={setIsGenerating}
                setStartPrompt={setStartPrompt}
                setShowDemoDrop={setShowDemoDrop}
                setFormData={setFormData}
                setUserStories={(stories) => setProcessDef(prev => prev ? { ...prev, userStories: stories } : null)}
                setTestCases={(cases) => setProcessDef(prev => prev ? { ...prev, testCases: cases } : null)}
                setPersonaPrompt={setPersonaPrompt}
                setAiPrompt={setAiPrompt}
                setSelectedStageId={setSelectedStageId}
                setSelectedSectionId={setSelectedSectionId}
                setSelectedElementId={setSelectedElementId}
                setActiveSidePanel={setActiveSidePanel}
                setActivePropTab={setActivePropTab}
                onStop={() => { setIsDemoMode(false); setViewMode('onboarding'); setProcessDef(null); }}
                processDef={processDef}
                setVisualTheme={setVisualTheme}
                setQaTab={setQaTab}
                setPegaTab={setPegaTab}
            />
        )}
        <DemoFocusOverlay area="none" highlightId={null} />
    </div>
    </ErrorBoundary>
  );
};

export default App;