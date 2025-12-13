
import React, { useState, useEffect } from 'react';
import { ProcessDefinition, FormState, VisualTheme } from '../types';
import { isElementVisible, isElementRequired, isSectionVisible, validateValue, evaluateLogicGroup } from '../utils/logic';
import { RenderElement } from './FormElements';
import { generateFormData } from '../services/geminiService';
import { User, Sparkles, PanelBottom, ArrowRight, AlertTriangle, Info, Shield } from 'lucide-react';
import { OperationsHUD } from './OperationsHUD';

interface ModePreviewProps {
  processDef: ProcessDefinition;
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  visualTheme: VisualTheme;
  personaPrompt: string;
  setPersonaPrompt: (val: string) => void;
}

export const ModePreview: React.FC<ModePreviewProps> = ({ processDef, formData, setFormData, visualTheme, personaPrompt, setPersonaPrompt }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // HUD State
  const [isHudEnabled, setIsHudEnabled] = useState(true);
  const [hudVisible, setHudVisible] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string>('');
  const [skillReason, setSkillReason] = useState<string>('');

  const currentStage = processDef.stages[currentStageIdx];
  const visibleSections = currentStage.sections.filter(sec => isSectionVisible(sec, formData));
  
  const isType2 = visualTheme.mode === 'type2';
  const isType3 = visualTheme.mode === 'type3';

  // 1. Calculate Active Skill (Runs on Data or Stage Change)
  useEffect(() => {
      if (!currentStage) return;
      
      let foundSkill = currentStage.defaultSkill || '';
      let foundReason = '';

      if (currentStage.skillLogic && currentStage.skillLogic.length > 0) {
          for (const rule of currentStage.skillLogic) {
              if (evaluateLogicGroup(rule.logic, formData)) {
                  foundSkill = rule.requiredSkill;
                  foundReason = "Logic match found";
                  break;
              }
          }
      }

      // Default state if no match found
      if (!foundSkill) {
          foundSkill = "No routing defined";
          foundReason = "Standard processing";
      }

      setActiveSkill(foundSkill);
      setSkillReason(foundReason);
  }, [currentStage, formData, processDef]);

  // 2. Trigger HUD Visibility (Runs ONLY on Stage Change or Toggle)
  useEffect(() => {
      if (isHudEnabled) {
          setHudVisible(true);
      } else {
          setHudVisible(false);
      }
  }, [currentStageIdx, isHudEnabled]);

  const handleNext = () => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    visibleSections.forEach(sec => {
        // Skip validation for read-only sections
        if (sec.variant === 'warning' || sec.variant === 'info' || sec.variant === 'summary') return;

        sec.elements.forEach(el => {
            if (isElementVisible(el, formData)) {
                if (isElementRequired(el, formData) && (formData[el.id] === undefined || formData[el.id] === '')) {
                    errors[el.id] = "This field is required";
                    isValid = false;
                }
                if (el.validation && el.validation.type !== 'none') {
                    const valMsg = validateValue(el, formData[el.id]);
                    if (valMsg) {
                        errors[el.id] = valMsg;
                        isValid = false;
                    }
                }
            }
        });
    });
    
    setFormErrors(errors);
    
    if (isValid) {
        if (currentStageIdx < processDef.stages.length - 1) {
            setCurrentStageIdx(prev => prev + 1);
            window.scrollTo(0,0);
        } else {
            alert("Process Completed!");
        }
    }
  };

  const handleAutoFill = async () => {
      setIsGenerating(true);
      const data = await generateFormData(processDef, personaPrompt || "Standard user");
      if (data) {
          setFormData(prev => ({...prev, ...data}));
          setFormErrors({});
      }
      setIsGenerating(false);
  }

  // --- Theme Classes ---
  
  const containerBg = isType2 
    ? 'bg-white border-[#e0e0e0]' 
    : isType3
        ? 'bg-white border-gray-200'
        : 'bg-white border-gray-100';
        
  const stageHeaderBg = isType2 
    ? 'bg-[#e61126]' 
    : isType3
        ? 'bg-[#006a4d]'
        : 'bg-sw-teal';
        
  const sectionTitleColor = isType2 
    ? 'text-[#e61126] border-gray-100' 
    : isType3
        ? 'text-[#006a4d] border-gray-200'
        : 'text-gray-800 border-gray-100';
        
  const pageBg = isType2 
    ? 'bg-[#e0e0e0]' 
    : isType3
        ? 'bg-[#f1f1f1]'
        : 'bg-sw-lighterGray';
  
  // Text Colors
  const headerTextColor = isType2 
    ? 'text-[#0b3239]' 
    : isType3
        ? 'text-[#006a4d]' 
        : 'text-sw-teal';
        
  const primaryButtonClass = isType2
    ? 'bg-[#0b3239] hover:bg-[#062126] text-white'
    : isType3
        ? 'bg-[#006a4d] hover:bg-[#00482f] text-white'
        : 'bg-sw-red hover:bg-sw-redHover text-white';

  const backButtonClass = isType2
    ? 'text-gray-500 hover:text-[#e61126]'
    : isType3
        ? 'text-gray-500 hover:text-[#006a4d]'
        : 'text-gray-500 hover:text-sw-teal';

  return (
    <div className={`h-full overflow-y-auto ${pageBg}`}>
    <div className="w-[80%] max-w-[2400px] mx-auto py-12 px-6 relative">
        <OperationsHUD 
            key={`${currentStageIdx}-${isHudEnabled}`} // Only re-animate on stage change or toggle, not data change
            isVisible={hudVisible} 
            requiredSkill={activeSkill} 
            reason={skillReason}
            onDismiss={() => setHudVisible(false)}
        />

        <div className="mb-8 flex justify-between items-end">
            <div>
                <h2 className={`text-3xl font-serif mb-2 ${headerTextColor}`}>{processDef.name}</h2>
                <div className="flex gap-2">
                    {processDef.stages.map((s, i) => (
                        <div key={s.id} className={`h-1.5 w-12 rounded-full ${i <= currentStageIdx ? (isType2 ? 'bg-[#e61126]' : isType3 ? 'bg-[#006a4d]' : 'bg-sw-red') : 'bg-gray-300/50'}`} />
                    ))}
                </div>
            </div>
            
            <div className={`flex gap-2 items-center p-2 rounded-xl border shadow-sm ${isType2 ? 'bg-white border-white' : 'bg-white border-gray-200'}`}>
                {/* HUD Toggle */}
                <button 
                    onClick={() => setIsHudEnabled(!isHudEnabled)}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${isHudEnabled ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={isHudEnabled ? "Operations HUD: ON" : "Operations HUD: OFF"}
                >
                    <Shield size={16} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                
                <User size={16} className={'text-gray-400 ml-1'} />
                <input 
                    type="text" 
                    value={personaPrompt}
                    onChange={(e) => setPersonaPrompt(e.target.value)}
                    placeholder="Persona (e.g. Married, High Value)..."
                    className={`text-sm border-none focus:ring-0 w-48 bg-transparent placeholder-gray-400 text-sw-text`}
                />
                <button 
                    onClick={handleAutoFill}
                    disabled={isGenerating}
                    className="text-xs bg-sw-purpleLight text-sw-teal font-bold px-3 py-1.5 rounded-lg hover:bg-sw-teal hover:text-white transition-colors flex items-center gap-1"
                >
                    <Sparkles size={12} /> Auto-Fill
                </button>
            </div>
        </div>

        <div className={`shadow-card rounded-2xl border overflow-hidden min-h-[600px] relative transition-colors duration-300 ${containerBg}`}>
            <div className={`p-6 ${stageHeaderBg}`}>
                <h3 className="text-xl font-bold text-white">{currentStage.title}</h3>
            </div>
            
            <div className="p-8 space-y-8">
                {visibleSections.map(section => {
                    // Filter out 'Summary' sections from main flow - they belong in footer
                    if (section.variant === 'summary') return null;

                    // Check if this is a 'Warning' or 'Info' section
                    const isWarning = section.variant === 'warning';
                    const isInfo = section.variant === 'info';
                    const isSpecial = isWarning || isInfo;

                    if (isSpecial) {
                        return (
                            <div key={section.id} className={`p-4 rounded-xl border ${
                                isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                            }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    {isWarning ? <AlertTriangle size={18} className="text-amber-600"/> : <Info size={18} className="text-blue-600"/>}
                                    <h4 className={`font-bold uppercase text-sm tracking-wide ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>{section.title}</h4>
                                </div>
                                <div className={`grid gap-x-8 gap-y-2 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                                    {section.elements.filter(el => isElementVisible(el, formData)).map(el => {
                                        // Handle Reflection Logic
                                        let elementValue = formData[el.id];
                                        if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                                            elementValue = formData[el.sourceFieldId];
                                        }
                                        
                                        return (
                                            <RenderElement
                                                key={el.id}
                                                element={{...el, required: false}} // Force non-required as it's read-only
                                                value={elementValue}
                                                onChange={()=>{}} // Read only
                                                disabled={true}
                                                theme={{...visualTheme, density: 'compact'}}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // Standard Rendering
                    return (
                        <div key={section.id}>
                            <h4 className={`font-bold pb-2 mb-6 uppercase text-sm tracking-wide ${sectionTitleColor}`}>{section.title}</h4>
                            <div className={`grid gap-x-8 gap-y-2 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                                {section.elements.filter(el => isElementVisible(el, formData)).map(el => {
                                    // Logic for handling "Reflection" fields
                                    let elementValue = formData[el.id];
                                    if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                                        elementValue = formData[el.sourceFieldId];
                                    }

                                    return (
                                        <RenderElement
                                            key={el.id}
                                            element={{...el, required: isElementRequired(el, formData)}} 
                                            value={elementValue}
                                            onChange={(val) => {
                                                setFormData(prev => ({...prev, [el.id]: val}));
                                                if (formErrors[el.id]) {
                                                    setFormErrors(prev => { const n = {...prev}; delete n[el.id]; return n; });
                                                }
                                            }}
                                            onBlur={() => {
                                                const msg = validateValue(el, formData[el.id]);
                                                if (msg) setFormErrors(prev => ({...prev, [el.id]: msg}));
                                            }}
                                            error={formErrors[el.id]}
                                            theme={visualTheme}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={`p-6 border-t flex justify-between items-center ${isType2 ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100'}`}>
                <button 
                    onClick={() => setCurrentStageIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentStageIdx === 0}
                    className={`px-6 py-2 rounded-lg font-bold disabled:opacity-30 ${backButtonClass}`}
                >
                    Back
                </button>
                <button 
                    onClick={handleNext}
                    className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${primaryButtonClass}`}
                >
                    {currentStageIdx === processDef.stages.length - 1 ? 'Submit' : 'Next Step'}
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
        
        <div className="mt-8 space-y-4">
             {/* FOOTER: Only show Summary sections from current or previous stages to create a "running receipt" */}
             {processDef.stages
                .filter((_, idx) => idx <= currentStageIdx)
                .flatMap(s => s.sections)
                .filter(s => s.variant === 'summary' && isSectionVisible(s, formData))
                .map(summarySec => (
                 <div key={summarySec.id} className={`${isType2 ? 'bg-white border-[#ffe2e8]' : isType3 ? 'bg-white border-gray-200' : 'bg-sw-teal/5 border-sw-teal/20'} border rounded-xl p-6`}>
                     <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'}`}>
                        <PanelBottom size={14} /> {summarySec.title}
                     </h4>
                     <div className={`grid gap-4 ${summarySec.layout === '2col' ? 'grid-cols-2' : summarySec.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        {summarySec.elements.filter(el => isElementVisible(el, formData)).map(el => {
                            // Ensure data is pulled for reflection fields in summary
                            let elementValue = formData[el.id];
                            if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                                elementValue = formData[el.sourceFieldId];
                            }
                            return (
                                <RenderElement key={el.id} element={el} value={elementValue} onChange={()=>{}} disabled theme={{...visualTheme, density: 'compact', radius: 'small'}} />
                            );
                        })}
                     </div>
                 </div>
             ))}
        </div>
    </div>
    </div>
  );
};
