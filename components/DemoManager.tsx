
import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { DemoFocusOverlay } from './DemoFocusOverlay';
import { 
  ProcessDefinition, SectionDefinition, ElementDefinition, VisualTheme 
} from '../types';
import { 
  demoProcess, demoDigitizedProcess, demoFormData, demoUserStories, demoTestCases
} from '../services/demoData';

interface DemoManagerProps {
  setProcessDef: (val: ProcessDefinition | null) => void;
  setViewMode: (val: any) => void;
  setIsGenerating: (val: boolean) => void;
  setStartPrompt: (val: string) => void;
  setShowDemoDrop: (val: boolean) => void;
  setFormData: (val: any) => void;
  setUserStories: (val: any) => void;
  setTestCases: (val: any) => void;
  setPersonaPrompt: (val: string) => void;
  setAiPrompt: (val: string) => void;
  setSelectedStageId: (val: string) => void;
  setSelectedSectionId: (val: string | null) => void;
  setSelectedElementId: (val: string | null) => void;
  setActiveSidePanel: (val: 'none' | 'properties' | 'settings') => void;
  setActivePropTab: (val: 'general' | 'logic') => void;
  onStop: () => void;
  processDef: ProcessDefinition | null;
  // New Setters
  setVisualTheme: (theme: VisualTheme) => void;
  setQaTab: (tab: 'stories' | 'cases') => void;
  setPegaTab: (tab: 'blueprint' | 'manual' | 'data' | 'logic') => void;
}

export const DemoManager: React.FC<DemoManagerProps> = ({
  setProcessDef, setViewMode, setIsGenerating, setStartPrompt, setShowDemoDrop,
  setFormData, setUserStories, setTestCases, setPersonaPrompt, setAiPrompt,
  setSelectedStageId, setSelectedSectionId, setSelectedElementId,
  setActiveSidePanel, setActivePropTab, onStop, processDef,
  setVisualTheme, setQaTab, setPegaTab
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [zoomArea, setZoomArea] = useState<'none' | 'sidebar' | 'canvas' | 'panel' | 'modal' | 'full' | 'copilot'>('none');
  const [overlayPosition, setOverlayPosition] = useState<'bottom' | 'top'>('bottom');

  const updateSection = (secId: string, updates: Partial<SectionDefinition>) => {
      if (!processDef) return;
      const newDef = { ...processDef };
      newDef.stages.forEach(stg => {
          const idx = stg.sections.findIndex(s => s.id === secId);
          if (idx !== -1) stg.sections[idx] = { ...stg.sections[idx], ...updates };
      });
      setProcessDef(newDef);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStep = parseInt(e.target.value);
      setStep(newStep);
      setIsPaused(true);
      if (newStep <= 1) {
          setViewMode('onboarding');
          setStartPrompt(newStep === 1 ? "Pension Transfer Away" : "");
          setProcessDef(null);
      } else if (newStep > 1 && newStep < 38) {
          setViewMode('editor');
          setProcessDef(demoProcess);
      } else {
          setProcessDef(demoDigitizedProcess);
      }
  };

  useEffect(() => {
    if (isPaused) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const runStep = () => {
        setOverlayPosition('bottom');

        if (step === 0) {
            setMessage("Welcome. The user begins by describing their intent in natural language.");
            const text = "Pension Transfer Away";
            let i = 0;
            intervalId = setInterval(() => {
                setStartPrompt(text.substring(0, i + 1));
                i++;
                if (i === text.length) {
                    clearInterval(intervalId);
                    timeoutId = setTimeout(() => setStep(1), 3000);
                }
            }, 80); 
        }
        else if (step === 1) {
            setMessage("The AI engine interprets this business intent to construct a multi-stage prototype.");
            setIsGenerating(true);
            timeoutId = setTimeout(() => setStep(2), 5000);
        }
        else if (step === 2) {
            setMessage("The structure is generated instantly. Stages are listed on the left, fields in the center.");
            setIsGenerating(false);
            const initialDemoData = JSON.parse(JSON.stringify(demoProcess));
            setProcessDef(initialDemoData);
            setSelectedStageId(initialDemoData.stages[0].id);
            setSelectedSectionId(initialDemoData.stages[0].sections[0].id);
            setViewMode('editor');
            setZoomArea('sidebar');
            timeoutId = setTimeout(() => setStep(3), 6000);
        }
        else if (step === 3) {
            setMessage("Users can manage layouts easily. Here we select the section header to view properties.");
            setZoomArea('canvas');
            setSelectedSectionId(demoProcess.stages[0].sections[0].id);
            setSelectedElementId(null);
            setHighlightId('section-header');
            timeoutId = setTimeout(() => setStep(4), 5000);
        }
        else if (step === 4) {
            setMessage("We can switch from a single column to a dense 3-column grid with one click.");
            setHighlightId("btn-layout-3col");
            timeoutId = setTimeout(() => {
                updateSection(demoProcess.stages[0].sections[0].id, { layout: '3col' });
                setStep(5);
            }, 3000);
        }
        else if (step === 5) {
            setMessage("Let's stick to a 2-column layout for better readability.");
            setHighlightId("btn-layout-2col");
            timeoutId = setTimeout(() => {
                updateSection(demoProcess.stages[0].sections[0].id, { layout: '2col' });
                setHighlightId(null);
                setStep(6);
            }, 3000);
        }
        else if (step === 6) {
            setMessage("The look and feel is also fully customizable via the Interface Settings.");
            setHighlightId("btn-settings");
            setZoomArea('none'); 
            timeoutId = setTimeout(() => {
                setActiveSidePanel('settings');
                setHighlightId(null);
                setStep(7);
            }, 4000);
        }
        else if (step === 7) {
            setMessage("We can instantly rebrand the application. Switching to 'Type 2' Theme...");
            setHighlightId("btn-theme-type2");
            timeoutId = setTimeout(() => {
                setVisualTheme({ mode: 'type2', density: 'default', radius: 'medium' });
                setStep(8);
            }, 3000);
        }
        else if (step === 8) {
            setMessage("And revert back to the standard 'Type 1'.");
            setHighlightId("btn-theme-type1");
            timeoutId = setTimeout(() => {
                setVisualTheme({ mode: 'type1', density: 'default', radius: 'medium' });
                setStep(9);
            }, 3000);
        }
        else if (step === 9) {
            setMessage("We can tighten the screen density for power users or increase spacing.");
            setHighlightId("btn-density-compact");
            timeoutId = setTimeout(() => {
                setVisualTheme({ mode: 'type1', density: 'compact', radius: 'medium' });
                setStep(10);
            }, 3000);
        }
        else if (step === 10) {
            setMessage("These settings apply globally. Let's return to the editor.");
            setActiveSidePanel('properties');
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(11), 4000);
        }
        else if (step === 11) {
            setMessage("To extend the form, simply click a component from the toolbox.");
            setHighlightId('toolbox');
            setOverlayPosition('top'); 
            timeoutId = setTimeout(() => {
                if (processDef) {
                    const newDef = JSON.parse(JSON.stringify(processDef));
                    const sec = newDef.stages[0].sections[0];
                    sec.elements.push({
                        id: 'transferDate_demo',
                        label: 'New Field',
                        type: 'date',
                        required: false,
                        visibilityConditions: []
                    });
                    setProcessDef(newDef);
                    setSelectedElementId('transferDate_demo');
                }
                 setHighlightId(null);
                 setOverlayPosition('bottom');
                 setStep(12);
            }, 4000);
        }
        else if (step === 12) {
            setMessage("The new field appears instantly. We rename it to 'Transfer Date'...");
            setHighlightId('transferDate_demo');
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(13), 3000);
        }
        else if (step === 13) {
            setMessage("...mark it as mandatory...");
            setActiveSidePanel('properties'); // Ensure properties panel is visible
            setSelectedSectionId(demoProcess.stages[0].sections[0].id);
            setSelectedElementId('transferDate_demo');
            setZoomArea('panel');
            setHighlightId('panel');
            timeoutId = setTimeout(() => {
                if (processDef) {
                    const newDef = JSON.parse(JSON.stringify(processDef));
                    const sec = newDef.stages[0].sections[0];
                    const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                    if (el) { el.label = 'Transfer Date'; el.required = true; }
                    setProcessDef(newDef);
                }
                setStep(14);
            }, 3000);
        }
        else if (step === 14) {
            setMessage("...and configure specific Data Validation rules.");
            setHighlightId('card-validation');
            timeoutId = setTimeout(() => {
                if (processDef) {
                    const newDef = JSON.parse(JSON.stringify(processDef));
                    const sec = newDef.stages[0].sections[0];
                    const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                    if (el) { el.validation = { type: 'date_future' }; }
                    setProcessDef(newDef);
                }
                setStep(15);
            }, 3000);
        }
        else if (step === 15) {
            setMessage("Let's look at logic. Select 'Spouse Name'.");
            setSelectedElementId(null);
            setHighlightId(null);
            setZoomArea('canvas');
            const spouseField = processDef?.stages[0].sections[0].elements.find(e => e.label === 'Spouse Name');
            if(spouseField) {
                setSelectedElementId(spouseField.id);
                setHighlightId(spouseField.id);
            }
            setActiveSidePanel('properties'); // Explicitly force panel open
            setActivePropTab('general');
            timeoutId = setTimeout(() => setStep(16), 4000);
        }
        else if (step === 16) {
            setMessage("Switch to the 'Logic' tab to see visibility rules.");
            setZoomArea('panel');
            setActiveSidePanel('properties'); // Ensure panel stays open
            setActivePropTab('logic');
            setHighlightId("tab-logic");
            timeoutId = setTimeout(() => {
                setHighlightId(null);
                setStep(17);
            }, 3000);
        }
        else if (step === 17) {
            setMessage("We see the rule: Show only if 'Marital Status' EQUALS 'Married'.");
            if (processDef) {
                const newDef = JSON.parse(JSON.stringify(processDef));
                const sec = newDef.stages[0].sections[0];
                const el = sec.elements.find((e: any) => e.label === 'Spouse Name');
                const ms = sec.elements.find((e: any) => e.label === 'Marital Status');
                if (el && ms) {
                    el.visibility = {
                        id: 'vis_spouse',
                        operator: 'AND',
                        conditions: [{
                            targetElementId: ms.id,
                            operator: 'equals',
                            value: 'Married'
                        }]
                    };
                }
                setProcessDef(newDef);
            }
             timeoutId = setTimeout(() => setStep(18), 5000);
        }
        else if (step === 18) {
             setMessage("We can also use the AI Copilot to make structural changes instantly.");
             setZoomArea('copilot');
             setHighlightId('sidebar-copilot');
             timeoutId = setTimeout(() => setStep(19), 4000);
        }
        else if (step === 19) {
            setMessage("Just describe what you need in natural language.");
            const text = "add another stage named 'post settlement checks' and put in whatever fields you think would be appropriate";
            let i = 0;
            intervalId = setInterval(() => {
                setAiPrompt(text.substring(0, i + 1));
                i++;
                if (i === text.length) {
                    clearInterval(intervalId);
                    timeoutId = setTimeout(() => setStep(20), 2000);
                }
            }, 40);
        }
        else if (step === 20) {
            setIsGenerating(true);
            setMessage("The AI interprets the request and generates the new stage and fields.");
            timeoutId = setTimeout(() => setStep(21), 3000);
        }
        else if (step === 21) {
             if (processDef) {
                const newDef = JSON.parse(JSON.stringify(processDef));
                newDef.stages.push({
                  id: "stg_post_settlement",
                  title: "Post Settlement Checks",
                  sections: [
                    {
                      id: "sec_checks",
                      title: "Compliance & Finalization",
                      layout: "1col",
                      variant: "standard",
                      elements: [
                        { id: "chk_aml", label: "AML Checks Complete", type: "checkbox", required: true },
                        { id: "chk_funds", label: "Funds Received", type: "checkbox", required: true },
                        { id: "date_settled", label: "Date Settled", type: "date", required: true },
                        { id: "txt_notes", label: "Settlement Notes", type: "textarea" }
                      ]
                    }
                  ]
                });
                setProcessDef(newDef);
             }
             setAiPrompt('');
             setIsGenerating(false);
             setMessage("The new stage is added to the process definition.");
             timeoutId = setTimeout(() => setStep(22), 4000);
        }
        else if (step === 22) {
            setMessage("Let's visualize the entire process flow.");
            setZoomArea('none');
            setHighlightId('nav-flow');
            timeoutId = setTimeout(() => setStep(23), 2500);
        }
        else if (step === 23) {
            setViewMode('flow');
            setHighlightId(null);
            setMessage("The Flow View visualizes stages, steps, and logic connections automatically.");
            timeoutId = setTimeout(() => setStep(33), 5000);
        }
        
        else if (step === 33) {
            setMessage("Design is complete. Now let's handle legacy assets.");
            setViewMode('onboarding');
            timeoutId = setTimeout(() => setStep(34), 4000);
        }
        else if (step === 34) {
            setMessage("For new projects, we can instantly digitize legacy PDF forms using Vision AI.");
            timeoutId = setTimeout(() => setStep(35), 4000);
        }
        else if (step === 35) {
            setMessage("Simply drag and drop existing documents directly into the studio.");
            setHighlightId('card-digitize');
            timeoutId = setTimeout(() => setStep(36), 1500);
        }
        else if (step === 36) {
            setShowDemoDrop(true);
            timeoutId = setTimeout(() => {
                setShowDemoDrop(false);
                setStep(37);
            }, 2500);
        }
        else if (step === 37) {
            setMessage("The AI analyzes the visual layout, extracts fields, and infers form logic.");
            setHighlightId(null);
            setIsGenerating(true);
            timeoutId = setTimeout(() => setStep(38), 5000);
        }
        else if (step === 38) {
            setMessage("The paper form is converted into a fully editable digital prototype.");
            setProcessDef(demoDigitizedProcess);
            setViewMode('editor');
            setIsGenerating(false);
            setSelectedStageId(demoDigitizedProcess.stages[0].id);
            setSelectedSectionId(demoDigitizedProcess.stages[0].sections[0].id);
            setSelectedElementId(null);
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(39), 5000);
        }
        else if (step === 39) {
            setMessage("Time to validate the experience with the interactive Preview.");
            setHighlightId('nav-preview');
            timeoutId = setTimeout(() => {
                setViewMode('preview');
                setHighlightId(null);
                setZoomArea('full');
                setStep(40);
            }, 3000);
        }
        else if (step === 40) {
            setMessage("We use the 'Persona Simulator' to test complex logic paths automatically.");
            setPersonaPrompt("Married, 145k value, advice received.");
            setIsGenerating(true);
            timeoutId = setTimeout(() => setStep(41), 4000);
        }
        else if (step === 41) {
            setMessage("The form fills instantly with realistic data matching the persona.");
            setFormData({}); 
            setTimeout(() => {
                 setFormData({ "scan_pol_num": "POL-998877", "scan_surname": "Smith", "scan_dob": "1980-05-12", "scan_date": "2024-01-15", "scan_desc": "Car accident on M1", "scan_police": "true" });
                 setIsGenerating(false);
            }, 500);
            timeoutId = setTimeout(() => setStep(42), 6000);
        }
        else if (step === 42) {
            setMessage("Prototype validated. Let's switch to the Pega Developer view.");
            setHighlightId('nav-pega');
            setZoomArea('none');
            timeoutId = setTimeout(() => {
                setViewMode('pega');
                setHighlightId(null);
                setStep(43);
            }, 3000);
        }
        else if (step === 43) {
            setMessage("We can generate the Blueprint prompt, or analyze the Data Model.");
            setHighlightId('tab-pega-data');
            setPegaTab('blueprint');
            timeoutId = setTimeout(() => {
                setPegaTab('data');
                setStep(44);
            }, 3000);
        }
        else if (step === 44) {
            setMessage("The Rule Inventory lists every specific rule needed for implementation.");
            setHighlightId('tab-pega-logic');
            timeoutId = setTimeout(() => {
                setPegaTab('logic');
                setStep(45);
            }, 3000);
        }
        else if (step === 45) {
            setMessage("Finally, we generate User Stories and Manual Test Cases for QA.");
            setHighlightId('nav-qa');
            setViewMode('qa');
            setUserStories(demoUserStories);
            setTestCases(demoTestCases);
            timeoutId = setTimeout(() => {
                setHighlightId('tab-qa-cases');
                setQaTab('cases');
                setStep(46);
            }, 4000);
        }
        else if (step === 46) {
            setMessage("Complete Discovery to Delivery. Demo Finished.");
            setHighlightId(null);
            timeoutId = setTimeout(() => {
                onStop();
            }, 8000);
        }
    };

    runStep();

    return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
    };
  }, [step, isPaused]);

  return (
    <>
        <div className={`fixed left-0 right-0 p-8 z-[100] pointer-events-none flex justify-center transition-all duration-500 ${overlayPosition === 'top' ? 'top-0' : 'bottom-0'}`}>
            <div className="bg-sw-teal/95 backdrop-blur text-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full text-center border border-white/10 pointer-events-auto animate-in slide-in-from-bottom-10">
                <p className="text-lg font-medium leading-relaxed mb-4 min-h-[3rem] flex items-center justify-center">{message}</p>
                
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        {isPaused ? (
                            <button onClick={() => setIsPaused(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Play size={20} fill="currentColor" /></button>
                        ) : (
                            <button onClick={() => setIsPaused(true)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Pause size={20} fill="currentColor" /></button>
                        )}
                    </div>
                    
                    <div className="flex-1 relative h-2 bg-white/20 rounded-full overflow-hidden group cursor-pointer">
                        {/* Range Input for Scrubbing */}
                        <input 
                            type="range" 
                            min="0" 
                            max="46" 
                            value={step} 
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-full bg-sw-red transition-all duration-300 ease-linear" style={{ width: `${(step / 46) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono opacity-50 w-12 text-right">{step} / 46</span>
                    
                    <button 
                        onClick={onStop}
                        className="text-xs font-bold uppercase tracking-widest text-sw-red hover:text-white transition-colors ml-4"
                    >
                        Stop Demo
                    </button>
                </div>
            </div>
        </div>
        <DemoFocusOverlay area={zoomArea} highlightId={highlightId} />
    </>
  );
};
