
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProcessDefinition, SectionDefinition, ElementDefinition, FormState, VisualTheme, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StageDefinition } from './types';
import { modifyProcess, generateProcessStructure, analyzeTranscript, generateProcessFromImage } from './services/geminiService';
import { generateId } from './utils/logic';
import { PropertiesPanel } from './components/PropertiesPanel';
import { demoProcess, demoUserStories, demoDigitizedProcess } from './services/demoData';
import { 
  Layout, Play, Settings, Download, RefreshCw, Mic, ScanLine, FileText, CheckSquare, Rocket, X, ArrowRight, MessageSquare, Sparkles, CheckCircle2, Pause
} from 'lucide-react';

// Import New Components
import { Onboarding } from './components/Onboarding';
import { ModeEditor } from './components/ModeEditor';
import { ModePreview } from './components/ModePreview';
import { ModeSpec } from './components/ModeSpec';
import { ModeQA } from './components/ModeQA';
import { ModePega } from './components/ModePega';

// --- Catapulse Branding Components ---

export const CatapulseLogo = ({ theme = 'dark', scale = 1, align = 'left' }: { theme?: 'dark' | 'light', scale?: number, align?: 'left' | 'center' }) => {
    const textColor = theme === 'dark' ? 'text-sw-teal' : 'text-white';
    const iconBg = theme === 'dark' ? 'bg-sw-teal' : 'bg-white';
    const iconColor = theme === 'dark' ? 'text-white' : 'text-sw-teal';
    const origin = align === 'center' ? 'center center' : 'left center';
    
    return (
        <div className={`flex items-center gap-2.5 select-none`} style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${iconBg} ${iconColor}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <span className={`font-sans font-bold text-xl tracking-tight ${textColor}`}>
                Catapulse
            </span>
        </div>
    );
};

// --- Demo Focus Overlay ---

const DemoFocusOverlay = ({ area, highlightId }: { area: string, highlightId: string | null }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
        if (highlightId) {
            const el = document.getElementById(highlightId);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setStyle({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        position: 'fixed'
                    });
                    setIsVisible(true);
                    return;
                }
            }
        }

        if (area === 'none' || area === 'modal' || area === 'full') {
            setIsVisible(false);
            return;
        }

        let areaStyle: React.CSSProperties = {};
        switch(area) {
            case 'sidebar':
                const sidebar = document.querySelector('.w-80');
                if (sidebar) {
                    const rect = sidebar.getBoundingClientRect();
                    areaStyle = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, position: 'fixed' };
                } else {
                     areaStyle = { left: 0, top: 0, bottom: 0, width: '20rem', position: 'fixed' };
                }
                break;
            case 'copilot':
                const cpSidebar = document.querySelector('.w-80');
                if (cpSidebar) {
                     const rect = cpSidebar.getBoundingClientRect();
                     areaStyle = { left: rect.left, top: 'auto', bottom: 0, width: rect.width, height: '280px', position: 'fixed' };
                } else {
                     areaStyle = { left: 0, bottom: 0, height: '280px', width: '20rem', position: 'fixed' };
                }
                break;
            case 'panel':
                 const panel = document.getElementById('panel');
                 if (panel) {
                    const rect = panel.getBoundingClientRect();
                    areaStyle = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, position: 'fixed' };
                 } else {
                    areaStyle = { right: 0, top: 0, bottom: 0, width: '24rem', position: 'fixed' };
                 }
                break;
            case 'canvas':
                const sidebarW = 320; 
                const panelW = 384; 
                areaStyle = { left: sidebarW, width: window.innerWidth - sidebarW - panelW, top: 0, bottom: 0, position: 'fixed' };
                break;
        }
        setStyle(areaStyle);
        setIsVisible(true);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    const interval = setInterval(updatePosition, 100);

    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        clearInterval(interval);
    };
  }, [area, highlightId]);

  if (!isVisible) return null;

  return (
    <div 
      className="z-[90] pointer-events-none transition-all duration-500 ease-in-out border-4 border-sw-red/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] rounded-lg"
      style={style}
    />
  );
};

// -------------------------------------

const getInitialProcess = (): ProcessDefinition => ({
  id: `proc_${Date.now()}`,
  name: 'New Pension Process',
  description: 'Admin process description...',
  stages: [
    {
      id: `stage_${Date.now()}_1`,
      title: 'Initial Check',
      sections: [
        {
          id: `sec_${Date.now()}_1`,
          title: 'Personal Details',
          layout: '1col',
          variant: 'standard',
          elements: []
        }
      ]
    }
  ]
});

const safelyGetElements = (section: SectionDefinition | undefined): ElementDefinition[] => {
  if (!section || !section.elements || !Array.isArray(section.elements)) return [];
  return section.elements;
};

const MAGIC_LOGS = [
    "Gathering inspiration...",
    "Sorry about the wait - at least you don't have to sit in silence...",
    "Convincing the AI that this is a good idea...",
    "Reticulating splines...",
    "Still faster than a steering committee meeting...",
    "Aligning the synergy crystals...",
    "Consulting the design oracle...",
    "Wait, did I leave the stove on? No, focused...",
    "Generating business value...",
    "Doing the fiddly bits...",
    "Almost there..."
];

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [processDef, setProcessDef] = useState<ProcessDefinition>(getInitialProcess());
  const [mode, setMode] = useState<'edit' | 'preview' | 'spec' | 'qa' | 'pega'>('edit');
  
  // Selection State
  const [selectedStageId, setSelectedStageId] = useState<string>(processDef.stages[0].id);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(processDef.stages[0].sections[0].id);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Properties Panel State
  const [propertiesPanelTab, setPropertiesPanelTab] = useState<'general' | 'logic'>('general');

  // Tool States
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [storyStrategy, setStoryStrategy] = useState<StoryStrategy>('screen');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [qaTab, setQaTab] = useState<'stories' | 'cases'>('stories');
  
  // Visual Theme State
  const [visualTheme, setVisualTheme] = useState<VisualTheme>({ density: 'default', radius: 'medium' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Workshop / Discovery State
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [workshopSuggestions, setWorkshopSuggestions] = useState<WorkshopSuggestion[]>([]);
  const [isAnalyzingWorkshop, setIsAnalyzingWorkshop] = useState(false);
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set());

  // Runtime State
  const [formData, setFormData] = useState<FormState>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Generation Animation State
  const [showGenerationAnimation, setShowGenerationAnimation] = useState(false);
  const [currentMagicLog, setCurrentMagicLog] = useState(MAGIC_LOGS[0]);

  // Demo & Onboarding State
  const [startPrompt, setStartPrompt] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDemoPaused, setIsDemoPaused] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoMessage, setDemoMessage] = useState('');
  const [demoHighlight, setDemoHighlight] = useState<string | null>(null);
  const [demoZoomArea, setDemoZoomArea] = useState<'none' | 'sidebar' | 'canvas' | 'panel' | 'modal' | 'full' | 'copilot'>('none');
  const [showDemoDrop, setShowDemoDrop] = useState(false);

  // Refs
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const legacyInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const selectedStage = processDef.stages?.find(s => s.id === selectedStageId);
  const selectedSection = selectedStage?.sections?.find(s => s.id === selectedSectionId);
  
  useEffect(() => {
    if (!isDemoMode) {
        setPropertiesPanelTab('general');
    }
  }, [selectedElementId, selectedSectionId, isDemoMode]);

  const allProcessElements = useMemo(() => {
    const elements: ElementDefinition[] = [];
    if (processDef.stages && Array.isArray(processDef.stages)) {
        processDef.stages.forEach(s => {
          if (s.sections && Array.isArray(s.sections)) {
            s.sections.forEach(sec => {
                const secElements = safelyGetElements(sec);
                if (secElements.length > 0) {
                   elements.push(...secElements);
                }
            });
          }
        });
    }
    return elements;
  }, [processDef]);

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return allProcessElements.find(e => e.id === selectedElementId) || null;
  }, [selectedElementId, allProcessElements]);

  // --- Animation Loop ---
  useEffect(() => {
      if (!showGenerationAnimation) return;
      let index = 0;
      const interval = setInterval(() => {
          index = (index + 1) % MAGIC_LOGS.length;
          if (index === 0) index = 2; 
          setCurrentMagicLog(MAGIC_LOGS[index]);
      }, 4000); 
      return () => clearInterval(interval);
  }, [showGenerationAnimation]);

  // --- Actions ---

  const handleStart = async (useDemo: boolean = false) => {
    if (useDemo) {
        setIsDemoMode(true);
        setDemoStep(0);
        setIsDemoPaused(false);
        setHasStarted(false);
        return;
    }
    if (!startPrompt.trim()) return;

    setIsGenerating(true);
    setShowGenerationAnimation(true);
    setCurrentMagicLog("Analyzing business requirements...");
    
    const structure = await generateProcessStructure(startPrompt);
    if (structure) {
      setProcessDef(structure);
      setHasStarted(true);
      if (structure.stages[0]) {
          setSelectedStageId(structure.stages[0].id);
          if (structure.stages[0].sections[0]) setSelectedSectionId(structure.stages[0].sections[0].id);
      }
    }
    setIsGenerating(false);
    setShowGenerationAnimation(false);
  };

  const handleAiModification = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    const updated = await modifyProcess(processDef, aiPrompt, { selectedStageId, selectedSectionId });
    if (updated) {
      setProcessDef(updated);
      setAiPrompt('');
      if (!updated.stages.find(s => s.id === selectedStageId)) {
         setSelectedStageId(updated.stages[0].id);
      }
    }
    setIsGenerating(false);
  };

  const updateSection = (sectionId: string, updates: Partial<SectionDefinition>) => {
    const newDef = { ...processDef };
    newDef.stages.forEach(stage => {
      const section = stage.sections.find(s => s.id === sectionId);
      if (section) {
        Object.assign(section, updates);
      }
    });
    setProcessDef(newDef);
  };

  const updateElement = (updated: ElementDefinition) => {
    const newDef = { ...processDef };
    newDef.stages.forEach(stage => {
      stage.sections.forEach(section => {
        const idx = section.elements.findIndex(e => e.id === updated.id);
        if (idx !== -1) {
          section.elements[idx] = updated;
        }
      });
    });
    setProcessDef(newDef);
  };

  const deleteElement = (elementId: string) => {
      setProcessDef(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next.stages.forEach((stg: StageDefinition) => {
              stg.sections.forEach((sec: SectionDefinition) => {
                  sec.elements = sec.elements.filter(e => e.id !== elementId);
              });
          });
          return next;
      });
      if (selectedElementId === elementId) setSelectedElementId(null);
  };

  const deleteSection = (sectionId: string) => {
      setProcessDef(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next.stages.forEach((stg: StageDefinition) => {
              stg.sections = stg.sections.filter(s => s.id !== sectionId);
          });
          return next;
      });
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const applyWorkshopSuggestion = (suggestion: WorkshopSuggestion) => {
      if (suggestion.type === 'remove' && suggestion.targetLabel) {
          const el = allProcessElements.find(e => e.label === suggestion.targetLabel);
          if (el) deleteElement(el.id);
      } else if (suggestion.type === 'add' && suggestion.newElement) {
          // Find target section
          let targetSecId = selectedSectionId;
          if (suggestion.newElement.sectionTitle) {
               // fuzzy find
               processDef.stages.forEach(s => s.sections.forEach(sec => {
                   if (sec.title.toLowerCase().includes(suggestion.newElement!.sectionTitle!.toLowerCase())) {
                       targetSecId = sec.id;
                   }
               }));
          }
          if (targetSecId) {
             const newEl: ElementDefinition = {
                 id: generateId(suggestion.newElement.label),
                 label: suggestion.newElement.label,
                 type: suggestion.newElement.type,
                 required: false,
                 visibilityConditions: []
             };
             const newDef = { ...processDef };
             newDef.stages.forEach(s => s.sections.forEach(sec => {
                 if (sec.id === targetSecId) sec.elements.push(newEl);
             }));
             setProcessDef(newDef);
          }
      }
      setAppliedSuggestionIds(prev => new Set(prev).add(suggestion.id));
  };

  const handleReset = () => {
    setProcessDef(getInitialProcess());
    setHasStarted(false);
    setIsResetModalOpen(false);
    setMode('edit');
    setStartPrompt('');
  }

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        setIsAnalyzingWorkshop(true);
        const suggestions = await analyzeTranscript(processDef, text);
        setWorkshopSuggestions(suggestions);
        setIsAnalyzingWorkshop(false);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleTranscript = async () => {
    setIsAnalyzingWorkshop(true);
    const suggestions = await analyzeTranscript(processDef, undefined);
    setWorkshopSuggestions(suggestions);
    setIsAnalyzingWorkshop(false);
  };

  // --- Legacy Form Import ---
  const handleLegacyFormUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert("Please upload an image file (PNG, JPG) or PDF document.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Raw = e.target?.result as string;
        const base64Data = base64Raw.split(',')[1];
        const mimeType = file.type;

        setIsGenerating(true);
        setShowGenerationAnimation(true);
        setCurrentMagicLog("Scanning document structure...");
        
        const logs = ["Analyzing layout geometry...", "Extracting text fields...", "Inferring data types...", "Structuring logic...", "Digitizing form..."];
        let logIdx = 0;
        const logInterval = setInterval(() => {
             if(logIdx < logs.length) setCurrentMagicLog(logs[logIdx++]);
        }, 1200);

        try {
            const result = await generateProcessFromImage(base64Data, mimeType);
            if (result) {
                setProcessDef(result);
                setHasStarted(true);
                if (result.stages.length > 0) {
                    setSelectedStageId(result.stages[0].id);
                    if (result.stages[0].sections.length > 0) {
                        setSelectedSectionId(result.stages[0].sections[0].id);
                    }
                }
                setSelectedElementId(null);
            } else {
                alert("Could not extract form data. Please try a clearer document.");
            }
        } catch (err) {
            console.error(err);
            alert("Error processing document.");
        } finally {
            clearInterval(logInterval);
            setIsGenerating(false);
            setShowGenerationAnimation(false);
            if (legacyInputRef.current) legacyInputRef.current.value = '';
        }
    };
    reader.readAsDataURL(file);
  };
  
  // --- Demo Logic Implementation ---
  const handleDemoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStep = parseInt(e.target.value);
      setDemoStep(newStep);
      setIsDemoPaused(true);
      
      // State Repair Logic
      if (newStep <= 1 || (newStep >= 34 && newStep <= 37)) {
          setHasStarted(false);
          setMode('edit');
          setIsWorkshopOpen(false);
          setIsSettingsOpen(false);
          setDemoZoomArea('none');
          setShowGenerationAnimation(false);
          setStartPrompt(newStep === 1 ? "Pension Transfer Away" : "");
          setShowDemoDrop(newStep === 36);
      } 
      else if (newStep >= 2 && newStep < 34) {
          setHasStarted(true);
          setMode('edit');
          const base = JSON.parse(JSON.stringify(demoProcess));
          if (newStep >= 22) {
              base.stages.push({
                  id: "stg_post_settlement",
                  title: "Post Settlement Checks",
                  sections: [{ 
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
                  }]
              });
          }
          if (newStep >= 10) {
              const sec = base.stages[0].sections[0];
              if (!sec.elements.find((e: any) => e.id === 'transferDate_demo')) {
                  sec.elements.push({ id: 'transferDate_demo', label: newStep >= 11 ? 'Transfer Date' : 'New Field', type: 'date', required: newStep >= 13 });
              }
          }
          setProcessDef(base);
          setIsWorkshopOpen(newStep >= 26 && newStep <= 33);
          setIsSettingsOpen(newStep >= 7 && newStep <= 8);
          
          if (newStep >= 2 && newStep <= 3) setDemoZoomArea('sidebar');
          else if (newStep === 11 || newStep === 12) setDemoZoomArea('panel');
          else if (newStep >= 19 && newStep <= 21) setDemoZoomArea('copilot');
          else if (newStep >= 25) setDemoZoomArea('none');
          else setDemoZoomArea('canvas');
      }
      else if (newStep >= 38) {
          setHasStarted(true);
          setProcessDef(demoDigitizedProcess);
          setIsWorkshopOpen(false);
          setShowGenerationAnimation(false);
          if (newStep >= 40 && newStep <= 42) setMode('preview');
          else if (newStep === 43) setMode('spec');
          else if (newStep >= 44 && newStep <= 45) setMode('pega');
          else if (newStep === 46) {
              setMode('qa');
              setUserStories(demoUserStories);
          }
          else setMode('edit');
          setDemoZoomArea(newStep >= 40 ? 'full' : 'none');
      }
  };

  useEffect(() => {
    if (!isDemoMode) return;
    if (isDemoPaused) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const runStep = () => {
        const step = demoStep;
        
        if (step === 0) {
            setDemoMessage("Welcome. The user begins by describing their intent in natural language.");
            const text = "Pension Transfer Away";
            let i = 0;
            intervalId = setInterval(() => {
                setStartPrompt(text.substring(0, i + 1));
                i++;
                if (i === text.length) {
                    clearInterval(intervalId);
                    timeoutId = setTimeout(() => setDemoStep(1), 4000);
                }
            }, 80); 
        }
        else if (step === 1) {
            setDemoMessage("The AI engine interprets this business intent to construct a multi-stage prototype.");
            setIsGenerating(true);
            setShowGenerationAnimation(true);
            timeoutId = setTimeout(() => setDemoStep(2), 6000);
        }
        else if (step === 2) {
            setDemoMessage("The structure is generated instantly. Stages are listed on the left, fields in the center.");
            setShowGenerationAnimation(false);
            const initialDemoData = JSON.parse(JSON.stringify(demoProcess));
            const sec = initialDemoData.stages[0].sections[0];
            const spouseField = sec.elements.find((e: any) => e.label === 'Spouse Name');
            if (spouseField) spouseField.visibilityConditions = []; 
            setProcessDef(initialDemoData);
            setHasStarted(true);
            setIsGenerating(false);
            setSelectedStageId(initialDemoData.stages[0].id);
            setSelectedSectionId(initialDemoData.stages[0].sections[0].id);
            setPropertiesPanelTab('general');
            setDemoZoomArea('sidebar');
            timeoutId = setTimeout(() => setDemoStep(3), 8000);
        }
        else if (step === 3) {
            setDemoMessage("Users can manage layouts easily. Here we select the section header to view properties.");
            setDemoZoomArea('canvas');
            setSelectedSectionId(demoProcess.stages[0].sections[0].id);
            setSelectedElementId(null);
            setDemoHighlight('section-header');
            timeoutId = setTimeout(() => setDemoStep(4), 7000);
        }
        else if (step === 4) {
            setDemoMessage("We can switch from a single column to a dense 3-column grid with one click.");
            setDemoHighlight("btn-layout-3col");
            timeoutId = setTimeout(() => {
                updateSection(demoProcess.stages[0].sections[0].id, { layout: '3col' });
                setDemoStep(5);
            }, 4000);
        }
        else if (step === 5) {
            setDemoMessage("Let's stick to a 2-column layout for better readability.");
            setDemoHighlight("btn-layout-2col");
            timeoutId = setTimeout(() => {
                updateSection(demoProcess.stages[0].sections[0].id, { layout: '2col' });
                setDemoHighlight(null);
                setDemoStep(6);
            }, 4000);
        }
        else if (step === 6) {
            setDemoMessage("The look and feel is also fully customizable via the Interface Settings.");
            setDemoHighlight("btn-settings");
            setDemoZoomArea('none'); 
            timeoutId = setTimeout(() => {
                setIsSettingsOpen(true);
                setDemoHighlight(null);
                setDemoStep(7);
            }, 5000);
        }
        else if (step === 7) {
            setDemoMessage("We can tighten the screen density for power users or increase spacing for accessibility.");
            setVisualTheme({ density: 'compact', radius: 'medium' });
            timeoutId = setTimeout(() => setDemoStep(8), 5000);
        }
        else if (step === 8) {
            setDemoMessage("These settings apply globally to the entire prototype.");
            setIsSettingsOpen(false);
            setDemoZoomArea('canvas');
            timeoutId = setTimeout(() => setDemoStep(9), 5000);
        }
        else if (step === 9) {
            setDemoMessage("To extend the form, simply click a component from the toolbox.");
            setDemoHighlight('toolbox');
            timeoutId = setTimeout(() => {
                setProcessDef(prev => {
                    const newDef = JSON.parse(JSON.stringify(prev));
                    const sec = newDef.stages[0].sections[0];
                    sec.elements.push({
                        id: 'transferDate_demo',
                        label: 'New Field',
                        type: 'date',
                        required: false
                    });
                    return newDef;
                 });
                 setSelectedElementId('transferDate_demo');
                 setDemoHighlight(null);
                 setDemoStep(10);
            }, 5000);
        }
        else if (step === 10) {
            setDemoMessage("The new field appears instantly on the canvas.");
            setDemoHighlight('transferDate_demo');
            setDemoZoomArea('canvas');
            timeoutId = setTimeout(() => setDemoStep(11), 5000);
        }
        else if (step === 11) {
            setDemoMessage("Use the Properties Panel to rename it to 'Transfer Date'.");
            setDemoZoomArea('panel');
            setDemoHighlight('panel');
            timeoutId = setTimeout(() => {
                setProcessDef(prev => {
                    const newDef = JSON.parse(JSON.stringify(prev));
                    const sec = newDef.stages[0].sections[0];
                    const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                    if (el) { el.label = 'Transfer Date'; }
                    return newDef;
                });
                setDemoStep(12);
            }, 5000);
        }
        else if (step === 12) {
            setDemoMessage("We also mark it as mandatory, adding the red asterisk indicator.");
            setDemoHighlight('req');
            setProcessDef(prev => {
                const newDef = JSON.parse(JSON.stringify(prev));
                const sec = newDef.stages[0].sections[0];
                const el = sec.elements.find((e: any) => e.id === 'transferDate_demo');
                if (el) { el.required = true; }
                return newDef;
            });
            timeoutId = setTimeout(() => {
                setDemoHighlight(null);
                setDemoStep(13);
            }, 5000);
        }
        else if (step === 13) {
            setDemoMessage("We can apply logic to entire sections. Let's make this whole section conditional.");
            setSelectedElementId(null);
            setSelectedSectionId(demoProcess.stages[0].sections[0].id);
            setDemoZoomArea('panel');
            timeoutId = setTimeout(() => setDemoStep(14), 5000);
        }
        else if (step === 14) {
            setDemoMessage("Switch to the 'Logic' tab to configure rules.");
            setPropertiesPanelTab('logic');
            setDemoHighlight("tab-logic");
            timeoutId = setTimeout(() => setDemoStep(15), 5000);
        }
        else if (step === 15) {
            setDemoMessage("Here you would add rules like 'Only show if Stage 1 is Complete'. Let's move to field logic.");
            setDemoHighlight(null);
            timeoutId = setTimeout(() => setDemoStep(16), 5000);
        }
        else if (step === 16) {
            setDemoMessage("Select 'Spouse Name'. We want this to appear only when 'Married' is selected.");
            setDemoZoomArea('canvas');
            const spouseField = processDef.stages[0].sections[0].elements.find(e => e.label === 'Spouse Name');
            if(spouseField) {
                setSelectedElementId(spouseField.id);
                setDemoHighlight(spouseField.id);
            }
            setPropertiesPanelTab('general');
            timeoutId = setTimeout(() => setDemoStep(17), 6000);
        }
        else if (step === 17) {
            setDemoMessage("Back to the Logic tab for this field.");
            setDemoZoomArea('panel');
            setPropertiesPanelTab('logic');
            setDemoHighlight("tab-logic");
            timeoutId = setTimeout(() => {
                setDemoHighlight(null);
                setDemoStep(18);
            }, 4000);
        }
        else if (step === 18) {
            setDemoMessage("We define the rule: IF 'Marital Status' EQUALS 'Married'.");
            setProcessDef(prev => {
                const newDef = JSON.parse(JSON.stringify(prev));
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
                return newDef;
             });
             setTimeout(() => setDemoHighlight('condition-visibilityConditions-0'), 100);
             timeoutId = setTimeout(() => setDemoStep(19), 6000);
        }
        else if (step === 19) {
             setDemoMessage("We can also use the AI Copilot to make larger structural changes instantly.");
             setDemoZoomArea('copilot');
             setDemoHighlight('sidebar-copilot');
             timeoutId = setTimeout(() => setDemoStep(20), 5000);
        }
        else if (step === 20) {
            setDemoMessage("Just describe what you need in natural language.");
            const text = "add another stage named 'post settlement checks' and put in whatever fields you think would be appropriate";
            let i = 0;
            intervalId = setInterval(() => {
                setAiPrompt(text.substring(0, i + 1));
                i++;
                if (i === text.length) {
                    clearInterval(intervalId);
                    timeoutId = setTimeout(() => setDemoStep(21), 2000);
                }
            }, 40);
        }
        else if (step === 21) {
            setIsGenerating(true);
            setDemoMessage("The AI interprets the request and generates the new stage and fields.");
            timeoutId = setTimeout(() => setDemoStep(22), 4000);
        }
        else if (step === 22) {
             setProcessDef(prev => {
                const newDef = JSON.parse(JSON.stringify(prev));
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
                return newDef;
             });
             setAiPrompt('');
             setIsGenerating(false);
             setDemoMessage("The new stage is added to the process definition.");
             timeoutId = setTimeout(() => setDemoStep(23), 4000);
        }
        else if (step === 23) {
            setDemoMessage("Let's view the generated fields.");
            setSelectedStageId("stg_post_settlement");
            setSelectedSectionId("sec_checks");
            setDemoHighlight(null);
            setDemoZoomArea('canvas');
            timeoutId = setTimeout(() => setDemoStep(24), 5000);
        }
        else if (step === 24) {
            setDemoMessage("Now, the 'Discovery Mode'. We can ingest real workshop audio to validate requirements.");
            setDemoZoomArea('none');
            setDemoHighlight("btn-workshop");
            timeoutId = setTimeout(() => {
                setDemoHighlight(null);
                setDemoStep(25);
            }, 6000);
        }
        else if (step === 25) {
            setDemoMessage("Clicking the microphone icon opens the Workshop Review panel.");
            setIsWorkshopOpen(true);
            setDemoZoomArea('modal');
            timeoutId = setTimeout(() => setDemoStep(26), 5000);
        }
        else if (step === 26) {
            setDemoMessage("You can upload transcripts or use the sample provided.");
            timeoutId = setTimeout(() => setDemoStep(27), 5000);
        }
        else if (step === 27) {
            setDemoMessage("Let's process a sample transcript from a meeting with Compliance and Ops.");
            // We can't actually upload in demo, so we simulate the result
            setAppliedSuggestionIds(new Set());
            setTimeout(() => {
              setWorkshopSuggestions([
                { id: "demo_remove_ni", type: "remove", description: "Remove 'Member ID'", reasoning: "Sarah (Ops Lead) mentioned this is passed from login context.", targetLabel: "Member ID" },
                { id: "demo_add_dob", type: "add", description: "Add 'Date of Birth'", reasoning: "Mike (Compliance) stated we need to validate age < 75.", newElement: { label: "Date of Birth", type: "date", sectionTitle: "Personal Information" } }
              ]);
            }, 500);
            timeoutId = setTimeout(() => setDemoStep(28), 5000);
        }
        else if (step === 28) {
            setDemoMessage("The AI compares the conversation against your current prototype to find gaps.");
            timeoutId = setTimeout(() => setDemoStep(29), 7000);
        }
        else if (step === 29) {
            setDemoMessage("It noticed the Ops Lead said 'Member ID' is redundant. It suggests removing it.");
            setDemoHighlight("demo_remove_ni");
            timeoutId = setTimeout(() => setDemoStep(30), 6000);
        }
        else if (step === 30) {
            setDemoMessage("We apply this change with one click.");
            const s = workshopSuggestions.find(s => s.id === "demo_remove_ni");
            if(s) applyWorkshopSuggestion(s);
            setDemoHighlight(null);
            timeoutId = setTimeout(() => setDemoStep(31), 4000);
        }
        else if (step === 31) {
            setDemoMessage("Compliance mentioned needing 'Date of Birth' for validation. The AI suggests adding it.");
            setDemoHighlight("demo_add_dob");
            timeoutId = setTimeout(() => setDemoStep(32), 6000);
        }
        else if (step === 32) {
            setDemoMessage("We approve. The field is added to the correct section automatically.");
            const s = workshopSuggestions.find(s => s.id === "demo_add_dob");
            if(s) applyWorkshopSuggestion(s);
            setDemoHighlight(null);
            timeoutId = setTimeout(() => setDemoStep(33), 5000);
        }
        else if (step === 33) {
            setDemoMessage("Requirements are now synced. Let's see how we handle legacy assets.");
            setIsWorkshopOpen(false);
            setDemoZoomArea('none');
            setHasStarted(false);
            timeoutId = setTimeout(() => setDemoStep(34), 4000);
        }
        else if (step === 34) {
            setDemoMessage("For new projects, we can instantly digitize legacy PDF forms using Vision AI.");
            timeoutId = setTimeout(() => setDemoStep(35), 4000);
        }
        else if (step === 35) {
            setDemoMessage("Simply drag and drop existing documents directly into the studio.");
            setDemoHighlight('card-digitize');
            timeoutId = setTimeout(() => setDemoStep(36), 1500);
        }
        else if (step === 36) {
            setShowDemoDrop(true);
            timeoutId = setTimeout(() => {
                setShowDemoDrop(false);
                setDemoStep(37);
            }, 2500);
        }
        else if (step === 37) {
            setDemoMessage("The AI analyzes the visual layout, extracts fields, and infers form logic.");
            setDemoHighlight(null);
            setIsGenerating(true);
            setShowGenerationAnimation(true);
            setCurrentMagicLog("Scanning document structure...");
            timeoutId = setTimeout(() => setDemoStep(38), 6000);
        }
        else if (step === 38) {
            setDemoMessage("The paper form is converted into a fully editable digital prototype.");
            setProcessDef(demoDigitizedProcess);
            setHasStarted(true); 
            setIsGenerating(false);
            setShowGenerationAnimation(false);
            if (demoDigitizedProcess.stages.length > 0) {
                setSelectedStageId(demoDigitizedProcess.stages[0].id);
                if (demoDigitizedProcess.stages[0].sections.length > 0) {
                     setSelectedSectionId(demoDigitizedProcess.stages[0].sections[0].id);
                }
            }
            setSelectedElementId(null);
            setDemoZoomArea('canvas');
            timeoutId = setTimeout(() => setDemoStep(39), 6000);
        }
        else if (step === 39) {
            setDemoMessage("Time to validate the experience with the interactive Preview.");
            setMode('preview');
            setDemoZoomArea('full');
            timeoutId = setTimeout(() => setDemoStep(40), 5000);
        }
        else if (step === 40) {
            setDemoMessage("We use the 'Persona Simulator' to test complex logic paths automatically.");
            setIsGenerating(true);
            timeoutId = setTimeout(() => setDemoStep(41), 5000);
        }
        else if (step === 41) {
            setDemoMessage("The form fills instantly with realistic data matching the persona.");
            setFormData({}); 
            setTimeout(() => {
                 setFormData({ "scan_pol_num": "POL-998877", "scan_surname": "Smith", "scan_dob": "1980-05-12", "scan_date": "2024-01-15", "scan_desc": "Car accident on M1", "scan_police": "true" });
                 setIsGenerating(false);
            }, 500);
            timeoutId = setTimeout(() => setDemoStep(42), 8000);
        }
        else if (step === 42) {
            setDemoMessage("With the prototype validated, we generate the Functional Specification.");
            setMode('spec');
            timeoutId = setTimeout(() => setDemoStep(43), 6000);
        }
        else if (step === 43) {
            setDemoMessage("The 'Blueprint Accelerator' creates the specific prompt for Pega GenAI.");
            setMode('pega');
            timeoutId = setTimeout(() => setDemoStep(44), 6000);
        }
        else if (step === 44) {
            setDemoMessage("And the 'Implementation Guide' gives developers the property definitions and rules.");
            timeoutId = setTimeout(() => setDemoStep(45), 6000);
        }
        else if (step === 45) {
            setDemoMessage("Finally, we generate User Stories in GWT format with Data Tables for QA.");
            setMode('qa');
            setUserStories(demoUserStories);
            timeoutId = setTimeout(() => setDemoStep(46), 6000);
        }
        else if (step === 46) {
            setDemoMessage("Complete Discovery to Delivery. Demo Finished.");
            timeoutId = setTimeout(() => {
                setIsDemoMode(false);
                setDemoMessage("");
                setDemoHighlight(null);
                setDemoZoomArea('none');
            }, 8000);
        }
    };

    runStep();

    return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
    };
  }, [isDemoMode, demoStep, isDemoPaused]);

  // --- Render Functions ---

  const renderResetModal = () => {
    if (!isResetModalOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-100 animate-in fade-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Project?</h3>
                <p className="text-gray-500 mb-8">This will clear your current prototype and all associated data. This action cannot be undone.</p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsResetModalOpen(false)}
                        className="flex-1 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleReset}
                        className="flex-1 py-3 font-bold bg-sw-red text-white rounded-xl hover:bg-sw-redHover transition-colors shadow-lg shadow-sw-red/20"
                    >
                        Reset Project
                    </button>
                </div>
            </div>
        </div>
    );
  }

  const renderSettingsModal = () => {
      if (!isSettingsOpen) return null;
      return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 pointer-events-auto sm:mb-20 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-gray-800">Interface Settings</h3>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Screen Density</label>
                          <div className="grid grid-cols-2 gap-3">
                              {['dense', 'compact', 'default', 'spacious'].map((d) => (
                                  <button
                                      key={d}
                                      onClick={() => setVisualTheme(prev => ({...prev, density: d as any}))}
                                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${visualTheme.density === d ? 'border-sw-teal bg-sw-teal/5 text-sw-teal shadow-sm ring-1 ring-sw-teal' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                  >
                                      {d.charAt(0).toUpperCase() + d.slice(1)}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Corner Radius</label>
                          <div className="flex gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                              {['none', 'small', 'medium', 'large'].map((r) => (
                                  <button
                                      key={r}
                                      onClick={() => setVisualTheme(prev => ({...prev, radius: r as any}))}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${visualTheme.radius === r ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                  >
                                      {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  const renderWorkshopModal = () => {
    if (!isWorkshopOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-sw-teal text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg"><Mic size={24} /></div>
                        <div>
                            <h2 className="font-bold text-xl">Workshop Assistant</h2>
                            <p className="text-sw-teal/70 text-sm">Analyze transcripts to find gaps and requirements.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsWorkshopOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                     {/* Input Column */}
                     <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 flex flex-col gap-4">
                         <div 
                            className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-sw-teal hover:bg-sw-teal/5 transition-all cursor-pointer relative group"
                            onClick={() => transcriptInputRef.current?.click()}
                         >
                             <FileText className="text-gray-400 mb-3 group-hover:text-sw-teal" size={48} />
                             <p className="font-bold text-gray-600 mb-1">Upload Transcript</p>
                             <p className="text-xs text-gray-400">.txt, .docx, .vtt</p>
                             <input type="file" ref={transcriptInputRef} className="hidden" accept=".txt,.vtt,.docx" onChange={handleTranscriptUpload}/>
                         </div>
                         
                         <div className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest my-2">- OR -</div>

                         <button 
                            onClick={handleLoadSampleTranscript}
                            disabled={isAnalyzingWorkshop}
                            className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-sw-teal hover:shadow-md transition-all group"
                         >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sw-teal">Load Sample Workshop</span>
                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-sw-teal"/>
                            </div>
                            <p className="text-xs text-gray-500">Pension Transfer Review (Compliance & Ops)</p>
                         </button>
                     </div>

                     {/* Analysis Column */}
                     <div className="flex-1 p-6 overflow-y-auto bg-white">
                         {isAnalyzingWorkshop ? (
                             <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sw-teal"></div>
                                 <p className="animate-pulse">Analyzing conversation context...</p>
                             </div>
                         ) : workshopSuggestions.length > 0 ? (
                             <div className="space-y-6">
                                 <div className="flex items-center gap-2 mb-4">
                                     <Sparkles className="text-sw-teal" size={20} />
                                     <h3 className="font-bold text-lg text-gray-800">Suggested Changes</h3>
                                 </div>
                                 {workshopSuggestions.map(suggestion => (
                                     <div key={suggestion.id} id={suggestion.id} className="border border-gray-200 rounded-xl p-5 hover:border-sw-teal/30 hover:shadow-sm transition-all">
                                         <div className="flex justify-between items-start mb-3">
                                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                                 suggestion.type === 'add' ? 'bg-green-100 text-green-700' :
                                                 suggestion.type === 'remove' ? 'bg-red-100 text-red-700' :
                                                 'bg-blue-100 text-blue-700'
                                             }`}>
                                                 {suggestion.type}
                                             </span>
                                             {appliedSuggestionIds.has(suggestion.id) ? (
                                                 <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                                                     <CheckCircle2 size={16} /> Applied
                                                 </span>
                                             ) : (
                                                 <button 
                                                     onClick={() => applyWorkshopSuggestion(suggestion)}
                                                     className="text-sm bg-sw-teal text-white px-3 py-1.5 rounded-lg font-bold hover:bg-sw-tealHover transition-colors shadow-sm"
                                                 >
                                                     Apply Change
                                                 </button>
                                             )}
                                         </div>
                                         <p className="font-bold text-gray-800 mb-2">{suggestion.description}</p>
                                         <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic border-l-4 border-gray-300">
                                             "{suggestion.reasoning}"
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center">
                                 <MessageSquare size={64} className="mb-4 opacity-20" />
                                 <p>Upload a transcript or load a sample<br/>to generate insights.</p>
                             </div>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
  }

  const renderGenerationOverlay = () => {
      if (!showGenerationAnimation) return null;
      return (
          <div className="fixed inset-0 z-[100] bg-sw-teal/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8">
              {/* High Energy Spinner */}
              <div className="relative w-32 h-32 mb-12">
                  <div className="absolute inset-0 border-4 border-sw-purpleLight/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                  <div className="absolute inset-2 border-4 border-t-sw-red border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
                  <div className="absolute inset-6 border-4 border-b-white border-t-transparent border-l-transparent border-r-transparent rounded-full animate-[spin_2s_linear_reverse_infinite]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                       <Sparkles className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-sw-teal rounded-full blur-3xl opacity-40 animate-pulse"></div>
              </div>

              <h2 className="text-4xl font-serif font-bold mb-4 text-center animate-in fade-in slide-in-from-bottom-4">{currentMagicLog}</h2>
              <p className="text-sw-purpleLight/70 font-mono text-sm animate-pulse">Processing business logic...</p>
          </div>
      );
  }

  // --- Main Render ---

  if (!hasStarted) {
    return (
      <>
        <Onboarding 
            startPrompt={startPrompt} 
            setStartPrompt={setStartPrompt} 
            handleStart={handleStart} 
            handleLegacyFormUpload={handleLegacyFormUpload} 
            showDemoDrop={showDemoDrop} 
        />
        {renderGenerationOverlay()}
        {isDemoMode && (
             <div className="fixed bottom-0 left-0 right-0 p-8 z-[100] pointer-events-none flex justify-center">
                 <div className="bg-sw-teal/95 backdrop-blur text-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full text-center border border-white/10 pointer-events-auto animate-in slide-in-from-bottom-10">
                     <p className="text-lg font-medium leading-relaxed mb-4 min-h-[3rem] flex items-center justify-center">{demoMessage}</p>
                     
                     <div className="flex items-center gap-4">
                         <div className="flex gap-2">
                             {isDemoPaused ? (
                                 <button onClick={() => setIsDemoPaused(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Play size={20} fill="currentColor" /></button>
                             ) : (
                                 <button onClick={() => setIsDemoPaused(true)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Pause size={20} fill="currentColor" /></button>
                             )}
                         </div>
                         
                         <div className="flex-1 relative h-2 bg-white/20 rounded-full overflow-hidden group cursor-pointer">
                             {/* Range Input for Scrubbing */}
                             <input 
                                 type="range" 
                                 min="0" 
                                 max="47" 
                                 value={demoStep} 
                                 onChange={handleDemoSeek}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                             />
                             <div className="h-full bg-sw-red transition-all duration-300 ease-linear" style={{ width: `${(demoStep / 47) * 100}%` }} />
                         </div>
                         <span className="text-xs font-mono opacity-50 w-12 text-right">{demoStep} / 47</span>
                         
                         <button 
                             onClick={() => { setIsDemoMode(false); setHasStarted(false); setProcessDef(getInitialProcess()); }}
                             className="text-xs font-bold uppercase tracking-widest text-sw-red hover:text-white transition-colors ml-4"
                         >
                             Stop Demo
                         </button>
                     </div>
                 </div>
             </div>
        )}
        <DemoFocusOverlay area={demoZoomArea} highlightId={demoHighlight} />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans text-sw-text selection:bg-sw-teal/20">
      
      {/* App Header */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <CatapulseLogo theme="dark" scale={0.8} />
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <h1 className="font-bold text-gray-700 truncate max-w-xs">{processDef.name}</h1>
        </div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setMode('edit')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'edit' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
             <Layout size={16} /> Editor
          </button>
          <button onClick={() => setMode('preview')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'preview' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
             <Play size={16} /> Preview
          </button>
          <button onClick={() => setMode('spec')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'spec' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
             <FileText size={16} /> Spec
          </button>
          <button onClick={() => setMode('qa')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'qa' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
             <CheckSquare size={16} /> QA / Tests
          </button>
          <button onClick={() => setMode('pega')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pega' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
             <Rocket size={16} /> Pega
          </button>
        </div>

        <div className="flex items-center gap-2">
           <button id="btn-workshop" onClick={() => setIsWorkshopOpen(true)} className="p-2 text-gray-400 hover:text-sw-teal transition-colors" title="Workshop Assistant">
               <Mic size={20} />
           </button>
           <button id="btn-digitize" onClick={() => legacyInputRef.current?.click()} className="p-2 text-gray-400 hover:text-sw-teal transition-colors" title="Digitize Legacy Form">
               <ScanLine size={20} />
               <input type="file" ref={legacyInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleLegacyFormUpload}/>
           </button>
           <button id="btn-settings" onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-sw-teal transition-colors" title="Settings">
              <Settings size={20} />
           </button>
           <button onClick={() => setIsResetModalOpen(true)} className="p-2 text-gray-400 hover:text-sw-red transition-colors" title="Reset Project">
              <RefreshCw size={20} />
           </button>
           <div className="h-6 w-px bg-gray-200 mx-2"></div>
           <button 
              className="bg-sw-teal text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-sw-tealHover transition-colors shadow-sm flex items-center gap-2"
              onClick={() => {
                  const blob = new Blob([JSON.stringify(processDef, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `process-${processDef.id}.json`;
                  a.click();
              }}
           >
              <Download size={16} /> Export
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {mode === 'edit' && (
          <>
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
            <PropertiesPanel 
                selectedElement={selectedElement} 
                selectedSection={selectedSection || null}
                allElements={allProcessElements}
                activeTab={propertiesPanelTab}
                onTabChange={setPropertiesPanelTab}
                onUpdateElement={updateElement}
                onUpdateSection={(updated) => updateSection(updated.id, updated)}
                onDeleteElement={deleteElement}
                onDeleteSection={deleteSection}
            />
          </>
        )}
        
        {mode === 'preview' && <div className="flex-1 bg-sw-lightGray overflow-y-auto"><ModePreview processDef={processDef} formData={formData} setFormData={setFormData} visualTheme={visualTheme} /></div>}
        {mode === 'spec' && <div className="flex-1 bg-sw-lightGray overflow-y-auto"><ModeSpec processDef={processDef} allElements={allProcessElements} /></div>}
        {mode === 'pega' && <div className="flex-1 bg-sw-lightGray overflow-y-auto"><ModePega processDef={processDef} /></div>}
        {mode === 'qa' && (
            <div className="flex-1 bg-sw-lightGray overflow-y-auto">
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
      </main>

      {/* Modals & Overlays */}
      {renderResetModal()}
      {renderSettingsModal()}
      {renderWorkshopModal()}
      {renderGenerationOverlay()}
      
      {/* Demo Overlay */}
      {isDemoMode && (
          <div className="fixed bottom-0 left-0 right-0 p-8 z-[100] pointer-events-none flex justify-center">
              <div className="bg-sw-teal/95 backdrop-blur text-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full text-center border border-white/10 pointer-events-auto animate-in slide-in-from-bottom-10">
                  <p className="text-lg font-medium leading-relaxed mb-4 min-h-[3rem] flex items-center justify-center">{demoMessage}</p>
                  
                  <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                           {isDemoPaused ? (
                               <button onClick={() => setIsDemoPaused(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Play size={20} fill="currentColor" /></button>
                           ) : (
                               <button onClick={() => setIsDemoPaused(true)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Pause size={20} fill="currentColor" /></button>
                           )}
                      </div>
                      
                      <div className="flex-1 relative h-2 bg-white/20 rounded-full overflow-hidden group cursor-pointer">
                          <input 
                              type="range" 
                              min="0" 
                              max="47" 
                              value={demoStep} 
                              onChange={handleDemoSeek}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="h-full bg-sw-red transition-all duration-300 ease-linear" style={{ width: `${(demoStep / 47) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono opacity-50 w-12 text-right">{demoStep} / 47</span>
                      
                      <button 
                          onClick={() => { setIsDemoMode(false); setHasStarted(false); setProcessDef(getInitialProcess()); }}
                          className="text-xs font-bold uppercase tracking-widest text-sw-red hover:text-white transition-colors ml-4"
                      >
                          Stop Demo
                      </button>
                  </div>
              </div>
          </div>
      )}
      <DemoFocusOverlay area={demoZoomArea} highlightId={demoHighlight} />
    </div>
  );
};

export default App;
