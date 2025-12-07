
import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { ModeEditor } from './components/ModeEditor';
import { ModePreview } from './components/ModePreview';
import { ModeSpec } from './components/ModeSpec';
import { ModeQA } from './components/ModeQA';
import { ModePega } from './components/ModePega';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CatapulseLogo, ScrambleText } from './components/Shared';
import { LoadingOverlay } from './components/LoadingOverlay';
import { DemoManager } from './components/DemoManager';
import { 
  ProcessDefinition, FormState, VisualTheme, UserStory, TestCase, 
  ElementDefinition, SectionDefinition, StoryStrategy 
} from './types';
import { 
  generateProcessStructure, generateProcessFromImage, modifyProcess
} from './services/geminiService';
import { 
  demoProcess, demoDigitizedProcess, demoFormData, demoUserStories, 
  demoTestCases 
} from './services/demoData';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code } from 'lucide-react';

// --- Main App Component ---
const App: React.FC = () => {
  // State
  const [viewMode, setViewMode] = useState<'onboarding' | 'editor' | 'preview' | 'spec' | 'qa' | 'pega'>('onboarding');
  const [processDef, setProcessDef] = useState<ProcessDefinition | null>(null);
  const [startPrompt, setStartPrompt] = useState('');
  const [showDemoDrop, setShowDemoDrop] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Editor State
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [activePropTab, setActivePropTab] = useState<'general' | 'logic'>('general');

  // Preview State
  const [formData, setFormData] = useState<FormState>({});
  const [visualTheme, setVisualTheme] = useState<VisualTheme>({ density: 'default', radius: 'medium' });
  const [personaPrompt, setPersonaPrompt] = useState('');

  // QA State
  const [qaTab, setQaTab] = useState<'stories' | 'cases'>('stories');
  const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // Pega State
  const [pegaTab, setPegaTab] = useState<'blueprint' | 'manual'>('blueprint');

  // Actions
  const handleStart = async (useDemo = false) => {
    if (useDemo) {
        setIsDemoMode(true);
        // Reset state for demo start
        setStartPrompt('');
        setProcessDef(null); 
        setViewMode('onboarding');
        return;
    }

    if (!startPrompt.trim()) {
        // Default start if empty
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

  // --- Helpers for Property Panel Updates ---
  const handleUpdateElement = (updated: ElementDefinition) => {
      if (!processDef) return;
      const newDef = { ...processDef };
      newDef.stages.forEach(stg => {
          stg.sections.forEach(sec => {
              const idx = sec.elements.findIndex(e => e.id === updated.id);
              if (idx !== -1) sec.elements[idx] = updated;
          });
      });
      setProcessDef(newDef);
  };

  const handleUpdateSection = (updated: SectionDefinition) => {
      if (!processDef) return;
      const newDef = { ...processDef };
      newDef.stages.forEach(stg => {
          const idx = stg.sections.findIndex(s => s.id === updated.id);
          if (idx !== -1) stg.sections[idx] = updated;
      });
      setProcessDef(newDef);
  };

  const handleDeleteElement = (id: string) => {
      if (!processDef) return;
      const newDef = { ...processDef };
      newDef.stages.forEach(stg => {
          stg.sections.forEach(sec => {
              sec.elements = sec.elements.filter(e => e.id !== id);
          });
      });
      setProcessDef(newDef);
      setSelectedElementId(null);
  };

  const handleDeleteSection = (id: string) => {
      if (!processDef) return;
      const newDef = { ...processDef };
      newDef.stages.forEach(stg => {
          stg.sections = stg.sections.filter(s => s.id !== id);
      });
      setProcessDef(newDef);
      setSelectedSectionId(null);
  };

  const getSelectedObjects = () => {
      if (!processDef) return { el: null, sec: null };
      let sec: SectionDefinition | null = null;
      let el: ElementDefinition | null = null;

      for (const stg of processDef.stages) {
          const foundSec = stg.sections.find(s => s.id === selectedSectionId);
          if (foundSec) {
              sec = foundSec;
              const foundEl = foundSec.elements.find(e => e.id === selectedElementId);
              if (foundEl) el = foundEl;
              break;
          }
      }
      return { el, sec };
  };

  const { el: selectedElement, sec: selectedSection } = getSelectedObjects();

  // If Onboarding
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

  // Loading Screen (Generation Overlay)
  if (isGenerating && !processDef) {
       return <LoadingOverlay />;
  }

  if (!processDef) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden font-sans text-sw-text relative">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-50 shrink-0">
            <div className="flex items-center gap-6">
                <CatapulseLogo scale={0.8} />
                <div className="h-6 w-px bg-gray-200"></div>
                <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        { id: 'editor', icon: Edit3, label: 'Design' },
                        { id: 'preview', icon: Play, label: 'Preview' },
                        { id: 'spec', icon: FileText, label: 'Spec' },
                        { id: 'qa', icon: CheckSquare, label: 'QA' },
                        { id: 'pega', icon: Code, label: 'Pega' }
                    ].map(mode => (
                        <button 
                            key={mode.id}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === mode.id ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <mode.icon size={14} />
                            {mode.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{processDef.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{processDef.id}</p>
                 </div>
                 {viewMode === 'editor' && (
                     <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'bg-sw-lightGray text-sw-teal' : 'text-gray-400 hover:text-sw-teal'}`}
                     >
                         <Settings2 size={20} />
                     </button>
                 )}
            </div>
        </header>

        {/* Main Content Area */}
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
                
                {viewMode === 'spec' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <ModeSpec processDef={processDef} allElements={processDef.stages.flatMap(s=>s.sections).flatMap(sec=>sec.elements)} />
                    </div>
                )}
                
                {viewMode === 'qa' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <ModeQA 
                            processDef={processDef}
                            qaTab={qaTab}
                            setQaTab={setQaTab}
                            storyStrategy={storyStrategy}
                            setStoryStrategy={setStoryStrategy}
                            userStories={userStories}
                            setUserStories={setUserStories}
                            testCases={testCases}
                            setTestCases={setTestCases}
                            isGenerating={isGenerating}
                            setIsGenerating={setIsGenerating}
                        />
                    </div>
                )}
                
                {viewMode === 'pega' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <ModePega processDef={processDef} pegaTab={pegaTab} setPegaTab={setPegaTab} />
                    </div>
                )}
            </main>

            {/* Right Panel (Settings/Properties) */}
            {viewMode === 'editor' && (
                <div 
                    className={`fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <PropertiesPanel 
                        selectedElement={selectedElement}
                        selectedSection={selectedSection}
                        allElements={processDef.stages.flatMap(s=>s.sections).flatMap(sec=>sec.elements)}
                        activeTab={activePropTab}
                        onTabChange={setActivePropTab}
                        onUpdateElement={handleUpdateElement}
                        onUpdateSection={handleUpdateSection}
                        onDeleteElement={handleDeleteElement}
                        onDeleteSection={handleDeleteSection}
                    />
                </div>
            )}
        </div>

        {/* Demo Mode Overlay - Now handled by DemoManager */}
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
    </div>
  );
};

export default App;
