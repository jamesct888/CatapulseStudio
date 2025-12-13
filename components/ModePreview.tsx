
import React, { useState, useEffect } from 'react';
import { ProcessDefinition, FormState, VisualTheme } from '../types';
import { isElementVisible, isElementRequired, isSectionVisible, validateValue, evaluateLogicGroup } from '../utils/logic';
import { RenderElement } from './FormElements';
import { generateFormData } from '../services/geminiService';
import { User, Sparkles, PanelBottom, ArrowRight, AlertTriangle, Info, Shield, ChevronRight, ArrowLeft, Check } from 'lucide-react';
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
      try {
          const data = await generateFormData(processDef, personaPrompt || "Standard user");
          if (data) {
              setFormData(prev => ({...prev, ...data}));
              setFormErrors({});
          } else {
              alert("Failed to generate data.");
          }
      } catch (e) {
          console.error(e);
          alert("Error generating persona data.");
      } finally {
          setIsGenerating(false);
      }
  }

  // --- Theme Classes ---
  
  const stageHeaderBg = isType2 
    ? 'bg-[#e61126]' 
    : isType3
        ? 'bg-[#006a4d]'
        : 'bg-sw-teal';
        
  const sectionTitleColor = isType2 
    ? 'text-[#e61126]' 
    : isType3
        ? 'text-[#006a4d]'
        : 'text-gray-800';
        
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

  const cardClass = isType2
    ? 'bg-white border border-[#e0e0e0] shadow-sm rounded-xl'
    : isType3
        ? 'bg-white border border-gray-200 shadow-sm rounded-xl'
        : 'bg-white border border-gray-100 shadow-sm rounded-xl';

  return (
    <div className={`h-full overflow-y-auto ${pageBg}`}>
    <div className="w-[80%] max-w-[1000px] mx-auto py-12 px-6 relative flex flex-col gap-8 pb-32">
        <OperationsHUD 
            key={`${currentStageIdx}-${isHudEnabled}`} 
            isVisible={hudVisible} 
            requiredSkill={activeSkill} 
            reason={skillReason}
            onDismiss={() => setHudVisible(false)}
        />

        {/* Top Navigation Bar */}
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-serif ${headerTextColor}`}>{processDef.name}</h2>
                
                <div className={`flex gap-2 items-center p-2 rounded-xl border shadow-sm ${isType2 ? 'bg-white border-white' : 'bg-white border-gray-200'}`}>
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

            {/* Breadcrumb Trail */}
            <nav className="flex items-center space-x-2 text-sm overflow-x-auto pb-2 scrollbar-none">
                {processDef.stages.map((s, i) => {
                    const isPast = i < currentStageIdx;
                    const isCurrent = i === currentStageIdx;
                    
                    const activeText = isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal';
                    const activeBg = isType2 ? 'bg-[#e61126]' : isType3 ? 'bg-[#006a4d]' : 'bg-sw-teal';
                    const activeBorder = isType2 ? 'border-[#e61126]' : isType3 ? 'border-[#006a4d]' : 'border-sw-teal';

                    return (
                        <React.Fragment key={s.id}>
                            <button 
                                onClick={() => {
                                    if (isPast) setCurrentStageIdx(i);
                                }}
                                disabled={!isPast}
                                className={`flex items-center gap-2 whitespace-nowrap transition-colors ${isPast ? 'cursor-pointer hover:opacity-70' : 'cursor-default'} ${isCurrent ? `font-bold ${activeText}` : isPast ? 'text-gray-500' : 'text-gray-300'}`}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all
                                    ${isPast 
                                        ? `${activeBg} text-white border-transparent` 
                                        : isCurrent 
                                            ? `bg-white ${activeText} ${activeBorder} ring-2 ring-offset-1 ${isType2 ? 'ring-[#e61126]/20' : isType3 ? 'ring-[#006a4d]/20' : 'ring-sw-teal/20'}` 
                                            : 'bg-transparent border-gray-300'
                                    }
                                `}>
                                    {isPast ? <Check size={12} strokeWidth={3} /> : i + 1}
                                </div>
                                <span>{s.title}</span>
                            </button>
                            {i < processDef.stages.length - 1 && (
                                <ChevronRight size={14} className="text-gray-300 shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        </div>

        {/* Stage Title Banner */}
        <div className={`p-6 rounded-xl shadow-md ${stageHeaderBg} text-white flex justify-between items-center`}>
            <div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Current Stage</span>
                <h3 className="text-2xl font-bold">{currentStage.title}</h3>
            </div>
            <div className="text-4xl font-serif opacity-20">{currentStageIdx + 1}</div>
        </div>
        
        {/* Sections List - Separated Cards */}
        <div className="flex flex-col gap-8">
            {visibleSections.map(section => {
                // Filter out 'Summary' sections from main flow - they belong in footer
                if (section.variant === 'summary') return null;

                // Check if this is a 'Warning' or 'Info' section
                const isWarning = section.variant === 'warning';
                const isInfo = section.variant === 'info';
                const isSpecial = isWarning || isInfo;

                if (isSpecial) {
                    return (
                        <div key={section.id} className={`p-6 rounded-xl border shadow-sm ${
                            isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                        }`}>
                            <div className="flex items-center gap-2 mb-4">
                                {isWarning ? <AlertTriangle size={20} className="text-amber-600"/> : <Info size={20} className="text-blue-600"/>}
                                <h4 className={`font-bold uppercase text-sm tracking-wide ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>{section.title}</h4>
                            </div>
                            <div className={`grid gap-x-8 gap-y-4 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
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

                // Standard Rendering - Card Style
                // Changed: removed overflow-hidden to allow dropdowns to pop out
                return (
                    <div key={section.id} className={`${cardClass}`}>
                        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 rounded-t-xl">
                            <h4 className={`font-bold uppercase text-sm tracking-wide ${sectionTitleColor}`}>{section.title}</h4>
                            {section.description && <span className="text-xs text-gray-400">{section.description}</span>}
                        </div>
                        <div className={`p-8 grid gap-x-8 gap-y-6 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
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

        {/* Footer Actions */}
        <div className="sticky bottom-4 mt-8 flex justify-between items-center bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl z-20">
            <button 
                onClick={() => setCurrentStageIdx(prev => Math.max(0, prev - 1))}
                disabled={currentStageIdx === 0}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${backButtonClass}`}
            >
                <ArrowLeft size={18} /> Back
            </button>
            
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:block">
                {currentStageIdx + 1} of {processDef.stages.length} Steps
            </div>

            <button 
                onClick={handleNext}
                className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 ${primaryButtonClass}`}
            >
                {currentStageIdx === processDef.stages.length - 1 ? 'Submit Application' : 'Next Step'}
                <ChevronRight size={18} />
            </button>
        </div>
        
        {/* Summary Footer Sections */}
        {processDef.stages
        .filter((_, idx) => idx <= currentStageIdx)
        .flatMap(s => s.sections)
        .filter(s => s.variant === 'summary' && isSectionVisible(s, formData))
        .length > 0 && (
            <div className="mt-8 space-y-4 pt-8 border-t border-gray-200/50">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Application Summary</h5>
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
        )}
    </div>
    </div>
  );
};
