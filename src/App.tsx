import React, { useState } from 'react';
import { Onboarding } from './components/Onboarding';
import { ModeEditor } from './components/ModeEditor';
import { ModePreview } from './components/ModePreview';
import { ModeSpec } from './components/ModeSpec';
import { ModeQA } from './components/ModeQA';
import { ModePega } from './components/ModePega';
import { ModeFlow } from './components/ModeFlow';
import { PropertiesPanel } from './components/PropertiesPanel';
import { AppHeader } from './components/AppHeader';
import { LoadingOverlay } from './components/LoadingOverlay';
import { DemoManager } from './components/DemoManager';
import { DemoFocusOverlay } from './components/DemoFocusOverlay';
import { useProcessState } from './hooks/useProcessState'; 
import { 
  ProcessDefinition, FormState, VisualTheme, UserStory, TestCase, 
  ElementDefinition, SectionDefinition, StageDefinition, StoryStrategy 
} from './types';
import { 
  generateProcessStructure, generateProcessFromImage, modifyProcess
} from './services/geminiService';
import { 
  demoDigitizedProcess 
} from './services/demoData';

// --- Main App Component ---
const App: React.FC = () => {
  // Use Custom Hook for Logic
  const { 
    processDef, setProcessDef, updateElement, updateSection, updateStage, deleteElement, deleteSection, deleteStage
  } = useProcessState();

  // UI State
  const [viewMode, setViewMode] = useState<'onboarding' | 'editor' | 'flow' | 'preview' | 'spec' | 'qa' | 'pega'>('onboarding');
  const [startPrompt, setStartPrompt] = useState('');
  const [showDemoDrop, setShowDemoDrop] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  
  // Selection State
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Tool State
  const [aiPrompt, setAiPrompt] = useState('');
  const [activePropTab, setActivePropTab] = useState<'general' | 'logic'>('general');
  const [formData, setFormData] = useState<FormState>({});
  const [visualTheme, setVisualTheme] = useState<VisualTheme>({ density: 'default', radius: 'medium' });
  const [personaPrompt, setPersonaPrompt] = useState('');
  
  // QA & Pega State
  const [qaTab, setQaTab] = useState<'stories' | 'cases'>('stories');
  const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [pegaTab, setPegaTab] = useState<'blueprint' | 'manual'>('blueprint');

  // Demo State
  const [isDemoMode, setIsDemoMode] = useState(false);

  // --- Handlers ---

  const handleStart = async (useDemo = false) => {
    if (useDemo) {
        setIsDemoMode(true);
        setStartPrompt('');
        setProcessDef(null); 
        setViewMode('onboarding');
        return;
    }

    if (!startPrompt.trim()) {
        // Default blank start
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
    const result = await generateProcessStructure(startPrompt);
    if (result) {
        setProcessDef(result);
        setSelectedStageId(result.stages[0]?.id || '');
        setViewMode('editor');
    }
    setIsGenerating(false);
  };

  const handleLegacyFormUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setShowDemoDrop(true);
      setIsGenerating(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
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
          }
          setShowDemoDrop(false);
          setIsGenerating(false);
      };
      reader.readAsDataURL(file);
  };

  const handleAiModification = async () => {
      if (!processDef || !aiPrompt) return;
      setIsGenerating(true);
      const context = { selectedStageId, selectedSectionId };
      const updated = await modifyProcess(processDef, aiPrompt, context);
      if (updated) {
          setProcessDef(updated);
          setAiPrompt('');
      }
      setIsGenerating(false);
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
                    setPersonaPrompt={setPersonaPrompt}
                    setAiPrompt={setAiPrompt}
                    setSelectedStageId={setSelectedStageId}
                    setSelectedSectionId={setSelectedSectionId}
                    setSelectedElementId={setSelectedElementId}
                    setIsSettingsOpen={setIsSettingsOpen}
                    setActivePropTab={setActivePropTab}
                    onStop={() => { setIsDemoMode(false); setViewMode('onboarding'); setProcessDef(null); }}
                    processDef={processDef}
                />
            )}
          </>
      );
  }

  if (isGenerating && !processDef) return <LoadingOverlay />;
  if (!processDef) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden font-sans text-sw-text relative">
        <AppHeader 
            processDef={processDef} 
            setProcessDef={setProcessDef}
            viewMode={viewMode} 
            setViewMode={setViewMode} 
            isSettingsOpen={isSettingsOpen} 
            setIsSettingsOpen={setIsSettingsOpen}
        />

        <div className="flex-1 flex overflow-hidden relative">
            <main className="flex-1 overflow-hidden relative flex flex-col">
                {isGenerating && (
                    <div className="absolute top-0 left-0 right-0 z-50">
                        <div className="h-1 w-full bg-sw-lightGray overflow-hidden">
                             <div className="h-full bg-sw-teal w-1/3 animate-loading-bar"></div>
                        </div>
                    </div>
                )}
                
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
                            setSelectedElementId={setSelectedElementId}
                            aiPrompt={aiPrompt}
                            setAiPrompt={setAiPrompt}
                            handleAiModification={handleAiModification}
                            isGenerating={isGenerating}
                            visualTheme={visualTheme}
                            isSettingsOpen={isSettingsOpen}
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
                <div className={`fixed right-0 top-16 bottom-0 z-40 transition-transform duration-300 ease-in-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                            // Update selection if needed
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
                        onClose={() => setIsSettingsOpen(false)}
                    />
                </div>
            )}
        </div>

        {isDemoMode && (
            <DemoManager 
                setProcessDef={setProcessDef}
                setViewMode={setViewMode}
                setIsGenerating={setIsGenerating}
                setStartPrompt={setStartPrompt}
                setShowDemoDrop={setShowDemoDrop}
                setFormData={setFormData}
                setUserStories={setUserStories}
                setPersonaPrompt={setPersonaPrompt}
                setAiPrompt={setAiPrompt}
                setSelectedStageId={setSelectedStageId}
                setSelectedSectionId={setSelectedSectionId}
                setSelectedElementId={setSelectedElementId}
                setIsSettingsOpen={setIsSettingsOpen}
                setActivePropTab={setActivePropTab}
                onStop={() => { setIsDemoMode(false); setViewMode('onboarding'); setProcessDef(null); }}
                processDef={processDef}
            />
        )}
        <DemoFocusOverlay area="none" highlightId={null} />
    </div>
  );
};

export default App;