
import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { DemoFocusOverlay } from './DemoFocusOverlay';
import { 
  ProcessDefinition, SectionDefinition, ElementDefinition 
} from '../types';
import { 
  demoProcess, demoDigitizedProcess, demoFormData, demoUserStories 
} from '../services/demoData';

interface DemoManagerProps {
  // App State Setters
  setProcessDef: (val: ProcessDefinition | null) => void;
  setViewMode: (val: any) => void;
  setIsGenerating: (val: boolean) => void;
  setStartPrompt: (val: string) => void;
  setShowDemoDrop: (val: boolean) => void;
  setFormData: (val: any) => void;
  setUserStories: (val: any) => void;
  setPersonaPrompt: (val: string) => void;
  setAiPrompt: (val: string) => void;
  
  // Selection Setters
  setSelectedStageId: (val: string) => void;
  setSelectedSectionId: (val: string | null) => void;
  setSelectedElementId: (val: string | null) => void;
  
  // UI Setters
  setIsSettingsOpen: (val: boolean) => void;
  setActivePropTab: (val: 'general' | 'logic') => void;
  
  // Control
  onStop: () => void;
  
  // Current Data (for updates)
  processDef: ProcessDefinition | null;
}

export const DemoManager: React.FC<DemoManagerProps> = ({
  setProcessDef, setViewMode, setIsGenerating, setStartPrompt, setShowDemoDrop,
  setFormData, setUserStories, setPersonaPrompt, setAiPrompt,
  setSelectedStageId, setSelectedSectionId, setSelectedElementId,
  setIsSettingsOpen, setActivePropTab, onStop, processDef
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [zoomArea, setZoomArea] = useState<'none' | 'sidebar' | 'canvas' | 'panel' | 'modal' | 'full' | 'copilot'>('none');
  const [overlayPosition, setOverlayPosition] = useState<'bottom' | 'top'>('bottom');

  // Helper to update sections/elements during demo
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
      // Basic state repair for scrubbing
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
        // Reset overlay position default
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
            
            // Reset demo data state
            const initialDemoData = JSON.parse(JSON.stringify(demoProcess));
            const sec = initialDemoData.stages[0].sections[0];
            const spouseField = sec.elements.find((e: any) => e.label === 'Spouse Name');
            if (spouseField) spouseField.visibilityConditions = []; 
            
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
                setIsSettingsOpen(true);
                setHighlightId(null);
                setStep(7);
            }, 4000);
        }
        else if (step === 7) {
            setMessage("We can tighten the screen density for power users or increase spacing for accessibility.");
            // Visual theme update is global in App, simplified here for demo flow
            timeoutId = setTimeout(() => setStep(8), 4000);
        }
        else if (step === 8) {
            setMessage("These settings apply globally to the entire prototype.");
            setIsSettingsOpen(false);
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(9), 4000);
        }
        else if (step === 9) {
            setMessage("To extend the form, simply click a component from the toolbox.");
            setHighlightId('toolbox');
            setOverlayPosition('top'); // Move overlay up so toolbox is visible
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
                 setStep(10);
            }, 4000);
        }
        else if (step === 10) {
            setMessage("The new field appears instantly on the canvas.");
            setHighlightId('transferDate_demo');
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(11), 4000);
        }
        else if (step === 11) {
            setMessage("Use the Properties Panel to rename it to 'Transfer Date'.");
            setIsSettingsOpen(true); // Open panel
            setSelectedElementId('transferDate_demo'); // Ensure selection
            setZoomArea('panel');
            setHighlightId('panel');
            timeoutId = setTimeout(() => {
                if (processDef) {
                    const newDef = JSON.parse(JSON.stringify(processDef));
                    const sec = newDef.stages[0].sections[0];
                    const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                    if (el) { el.label = 'Transfer Date'; }
                    setProcessDef(newDef);
                }
                setStep(12);
            }, 4000);
        }
        else if (step === 12) {
            setMessage("We also mark it as mandatory, adding the red asterisk indicator.");
            setHighlightId('req');
            if (processDef) {
                const newDef = JSON.parse(JSON.stringify(processDef));
                const sec = newDef.stages[0].sections[0];
                const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                if (el) { el.required = true; }
                setProcessDef(newDef);
            }
            timeoutId = setTimeout(() => {
                setHighlightId(null);
                setStep(13);
            }, 4000);
        }
        else if (step === 13) {
            setMessage("We can apply logic to entire sections. Let's make this whole section conditional.");
            setSelectedElementId(null);
            setSelectedSectionId(demoProcess.stages[0].sections[0].id);
            setZoomArea('panel');
            timeoutId = setTimeout(() => setStep(14), 4000);
        }
        else if (step === 14) {
            setMessage("Switch to the 'Logic' tab to configure rules.");
            setActivePropTab('logic');
            setHighlightId("tab-logic");
            timeoutId = setTimeout(() => setStep(15), 4000);
        }
        else if (step === 15) {
            setMessage("Here you would add rules like 'Only show if Stage 1 is Complete'. Let's move to field logic.");
            setHighlightId(null);
            timeoutId = setTimeout(() => setStep(16), 4000);
        }
        else if (step === 16) {
            setMessage("Select 'Spouse Name'. We want this to appear only when 'Married' is selected.");
            setZoomArea('canvas');
            const spouseField = processDef?.stages[0].sections[0].elements.find(e => e.label === 'Spouse Name');
            if(spouseField) {
                setSelectedElementId(spouseField.id);
                setHighlightId(spouseField.id);
            }
            setActivePropTab('general');
            timeoutId = setTimeout(() => setStep(17), 5000);
        }
        else if (step === 17) {
            setMessage("Back to the Logic tab for this field.");
            setZoomArea('panel');
            setActivePropTab('logic');
            setHighlightId("tab-logic");
            timeoutId = setTimeout(() => {
                setHighlightId(null);
                setStep(18);
            }, 3000);
        }
        else if (step === 18) {
            setMessage("We define the rule: IF 'Marital Status' EQUALS 'Married'.");
            if (processDef) {
                const newDef = JSON.parse(JSON.stringify(processDef));
                const sec = newDef.stages[0].sections[0];
                const el = sec.elements.find((e: any) => e.label === 'Spouse Name');
                const ms = sec.elements.find((e: any) => e.label === 'Marital Status');
                if (el && ms) {
                    el.visibilityConditions = [{
                        targetElementId: ms.id,
                        operator: 'equals',
                        value: 'Married'
                    }];
                }
                setProcessDef(newDef);
            }
             setTimeout(() => setHighlightId('condition-visibilityConditions-0'), 100);
             timeoutId = setTimeout(() => setStep(19), 5000);
        }
        else if (step === 19) {
             setMessage("We can also use the AI Copilot to make larger structural changes instantly.");
             setZoomArea('copilot');
             setHighlightId('sidebar-copilot');
             timeoutId = setTimeout(() => setStep(20), 4000);
        }
        else if (step === 20) {
            setMessage("Just describe what you need in natural language.");
            const text = "add another stage named 'post settlement checks' and put in whatever fields you think would be appropriate";
            let i = 0;
            intervalId = setInterval(() => {
                setAiPrompt(text.substring(0, i + 1));
                i++;
                if (i === text.length) {
                    clearInterval(intervalId);
                    timeoutId = setTimeout(() => setStep(21), 2000);
                }
            }, 40);
        }
        else if (step === 21) {
            setIsGenerating(true);
            setMessage("The AI interprets the request and generates the new stage and fields.");
            timeoutId = setTimeout(() => setStep(22), 3000);
        }
        else if (step === 22) {
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
             timeoutId = setTimeout(() => setStep(23), 4000);
        }
        else if (step === 23) {
            setMessage("Let's view the generated fields.");
            setSelectedStageId("stg_post_settlement");
            setSelectedSectionId("sec_checks");
            setHighlightId(null);
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(33), 5000);
        }
        else if (step === 33) {
            setMessage("Requirements are now synced. Let's see how we handle legacy assets.");
            setZoomArea('none');
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
            if (demoDigitizedProcess.stages.length > 0) {
                setSelectedStageId(demoDigitizedProcess.stages[0].id);
                if (demoDigitizedProcess.stages[0].sections.length > 0) {
                     setSelectedSectionId(demoDigitizedProcess.stages[0].sections[0].id);
                }
            }
            setSelectedElementId(null);
            setZoomArea('canvas');
            timeoutId = setTimeout(() => setStep(39), 5000);
        }
        else if (step === 39) {
            setMessage("Time to validate the experience with the interactive Preview.");
            setViewMode('preview');
            setZoomArea('full');
            timeoutId = setTimeout(() => setStep(40), 4000);
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
            setMessage("With the prototype validated, we generate the Functional Specification.");
            setViewMode('spec');
            timeoutId = setTimeout(() => setStep(43), 5000);
        }
        else if (step === 43) {
            setMessage("The 'Blueprint Accelerator' creates the specific prompt for Pega GenAI.");
            setViewMode('pega');
            // Assuming setPegaTab is managed in parent or defaulted
            timeoutId = setTimeout(() => setStep(44), 5000);
        }
        else if (step === 44) {
            setMessage("And the 'Implementation Guide' gives developers the property definitions and rules.");
            // setPegaTab('manual');
            timeoutId = setTimeout(() => setStep(45), 5000);
        }
        else if (step === 45) {
            setMessage("Finally, we generate User Stories in GWT format with Data Tables for QA.");
            setViewMode('qa');
            setUserStories(demoUserStories);
            timeoutId = setTimeout(() => setStep(46), 5000);
        }
        else if (step === 46) {
            setMessage("Complete Discovery to Delivery. Demo Finished.");
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
