
import React, { useState } from 'react';
import { Onboarding } from './components/Onboarding';
import { ModeEditor } from './components/ModeEditor';
import { ModePreview } from './components/ModePreview';
import { ModeSpec } from './components/ModeSpec';
import { ModeQA } from './components/ModeQA';
import { ModePega } from './components/ModePega';
import { ModeFlow } from './components/ModeFlow';
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
  ElementDefinition, SectionDefinition, StageDefinition, StoryStrategy 
} from './types';

// --- Main App Component ---
const App: React.FC = () => {
  // Use Custom Hook for Logic
  const { 
    processDef, setProcessDef, updateElement, updateSection, updateStage, deleteElement, deleteSection, deleteStage
  } = useProcessState();

  // UI State
  const [viewMode, setViewMode] = useState<'onboarding' | 'editor' | 'flow' | 'preview' | 'spec' | 'qa' | 'pega'>('onboarding');
  const [startPrompt, setStartPrompt] = useState('');
  const [loadingStageIds, setLoadingStageIds] = useState<Set<string>>(new Set());
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
  
  // QA & Pega State
  const [qaTab, setQaTab] = useState<'stories' | 'cases'>('stories');
  const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [pegaTab, setPegaTab] = useState<'blueprint' | 'manual' | 'data' | 'logic'>('blueprint');

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
      handleStartGeneration,
      handleLegacyFormUpload,
      handleAiModification
  } = useAiOperations({
      processDef,
      setProcessDef,
      setViewMode,
      setStartPrompt,
      setSelectedStageId,
      setLoadingStageIds,
      handleStartDemo
  });

  const handleStart = () => handleStartGeneration(startPrompt);

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
                handleStart={(demo) => demo ? handleStartDemo(true) : handleStart()}
                handleLegacyFormUpload={handleLegacyFormUpload}
                showDemoDrop={showDemoDrop}
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
                    setUserStories={setUserStories}
                    setTestCases={setTestCases}
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

                {viewMode === 'flow' && (
                    <div className="flex-1 overflow-hidden bg-gray-50">
                        <ModeFlow processDef={processDef} />
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
                            userStories={userStories} setUserStories={setUserStories}
                            testCases={testCases} setTestCases={setTestCases}
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
                            onDeleteElement={deleteElement}
                            onDeleteSection={deleteSection}
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
                setUserStories={setUserStories}
                setTestCases={setTestCases}
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
  );
};

export default App;
