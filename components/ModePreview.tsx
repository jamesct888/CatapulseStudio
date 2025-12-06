
import React, { useState } from 'react';
import { ProcessDefinition, FormState, VisualTheme } from '../types';
import { isElementVisible, isElementRequired, isSectionVisible, validateValue } from '../utils/logic';
import { RenderElement } from './FormElements';
import { generateFormData } from '../services/geminiService';
import { User, Sparkles, PanelBottom, ArrowRight } from 'lucide-react';

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

  const currentStage = processDef.stages[currentStageIdx];
  const visibleSections = currentStage.sections.filter(sec => isSectionVisible(sec, formData));

  const handleNext = () => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    visibleSections.forEach(sec => {
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

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="mb-8 flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-serif text-sw-teal mb-2">{processDef.name}</h2>
                <div className="flex gap-2">
                    {processDef.stages.map((s, i) => (
                        <div key={s.id} className={`h-1.5 w-12 rounded-full ${i <= currentStageIdx ? 'bg-sw-teal' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </div>
            
            <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                <User size={16} className="text-gray-400 ml-2" />
                <input 
                    type="text" 
                    value={personaPrompt}
                    onChange={(e) => setPersonaPrompt(e.target.value)}
                    placeholder="Persona (e.g. Married, High Value)..."
                    className="text-sm border-none focus:ring-0 w-48"
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

        <div className="bg-white shadow-card rounded-2xl border border-gray-100 overflow-hidden min-h-[600px] relative">
            <div className="bg-sw-teal text-white p-6">
                <h3 className="text-xl font-bold">{currentStage.title}</h3>
            </div>
            
            <div className="p-8 space-y-8">
                {visibleSections.map(section => (
                    <div key={section.id}>
                        <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase text-sm tracking-wide">{section.title}</h4>
                        <div className={`grid gap-x-8 gap-y-2 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                            {section.elements.filter(el => isElementVisible(el, formData)).map(el => (
                                <RenderElement
                                    key={el.id}
                                    element={{...el, required: isElementRequired(el, formData)}} 
                                    value={formData[el.id]}
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
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <button 
                    onClick={() => setCurrentStageIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentStageIdx === 0}
                    className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:text-sw-teal disabled:opacity-30"
                >
                    Back
                </button>
                <button 
                    onClick={handleNext}
                    className="px-8 py-3 bg-sw-teal text-white rounded-full font-bold shadow-lg hover:bg-sw-tealHover transition-all flex items-center gap-2"
                >
                    {currentStageIdx === processDef.stages.length - 1 ? 'Submit' : 'Next Step'}
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
        
        {/* Sticky Summary Render */}
        <div className="mt-8 space-y-4">
             {processDef.stages.flatMap(s => s.sections).filter(s => s.variant === 'summary' && isSectionVisible(s, formData)).map(summarySec => (
                 <div key={summarySec.id} className="bg-sw-teal/5 border border-sw-teal/20 rounded-xl p-6">
                     <h4 className="text-xs font-bold text-sw-teal uppercase tracking-widest mb-4 flex items-center gap-2">
                        <PanelBottom size={14} /> {summarySec.title}
                     </h4>
                     <div className={`grid gap-4 ${summarySec.layout === '2col' ? 'grid-cols-2' : summarySec.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        {summarySec.elements.filter(el => isElementVisible(el, formData)).map(el => (
                            <RenderElement key={el.id} element={el} value={formData[el.id]} onChange={()=>{}} disabled theme={{density: 'compact', radius: 'small'}} />
                        ))}
                     </div>
                 </div>
             ))}
        </div>
    </div>
  );
};
