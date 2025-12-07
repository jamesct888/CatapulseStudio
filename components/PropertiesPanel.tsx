
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ElementDefinition, SectionDefinition, StageDefinition, SkillRule, LogicGroup } from '../types';
import { Plus, Trash2, AlertCircle, Info, Layout, Briefcase, ShieldCheck, GitMerge, ArrowDown, Tag, X, Edit2, Maximize2, GripHorizontal, Eye, CheckCircle2 } from 'lucide-react';
import { LogicBuilder } from './LogicBuilder';

interface PropertiesPanelProps {
  selectedElement: ElementDefinition | null;
  selectedSection: SectionDefinition | null;
  selectedStage: StageDefinition | null;
  allElements: ElementDefinition[];
  activeTab: 'general' | 'logic';
  onTabChange: (tab: 'general' | 'logic') => void;
  onUpdateElement: (updated: ElementDefinition) => void;
  onUpdateSection: (updated: SectionDefinition) => void;
  onUpdateStage: (updated: StageDefinition) => void;
  onDeleteElement: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onClose: () => void;
}

const COMMON_SKILLS = [
    "Customer Service", 
    "Senior Underwriter", 
    "Compliance Officer", 
    "Claims Handler", 
    "Finance Manager",
    "System Admin"
];

interface ModalWrapperProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  onClose: () => void;
  modalSize: { width: number; height: number };
  onResizeStart: () => void;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, icon: Icon, children, onClose, modalSize, onResizeStart }) => {
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative border border-gray-200"
              style={{ width: modalSize.width, height: modalSize.height, maxWidth: '95vw', maxHeight: '95vh' }}
            >
                {/* Modal Header */}
                <div className="bg-sw-teal p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                            <Icon size={24} /> {title}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    {children}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 relative">
                    <div className="text-xs text-gray-400 italic">Changes apply immediately</div>
                    <button onClick={onClose} className="px-6 py-2 bg-sw-teal text-white rounded-lg font-bold hover:bg-sw-tealHover shadow-sm">
                        Done
                    </button>
                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 text-gray-300 hover:text-sw-teal"
                      onMouseDown={onResizeStart}
                    >
                        <svg viewBox="0 0 10 10" className="w-3 h-3 fill-current">
                            <path d="M10 10 L10 0 L0 10 Z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedElement, 
  selectedSection,
  selectedStage,
  allElements, 
  activeTab, 
  onTabChange,
  onUpdateElement,
  onUpdateSection, 
  onUpdateStage,
  onDeleteElement,
  onDeleteSection,
  onClose
}) => {
  
  const isEditingElement = !!selectedElement;
  const isEditingSection = !selectedElement && !!selectedSection;
  const isEditingStage = !selectedElement && !selectedSection && !!selectedStage;
  
  const data = selectedElement || selectedSection || selectedStage;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Resizable sidebar state - Default to 400px
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Modal States
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [activeRuleIndex, setActiveRuleIndex] = useState<number | null>(null);
  
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  
  // Shared Modal Resize State (persists across modals for consistency)
  const [modalSize, setModalSize] = useState({ width: 900, height: 700 });
  const [isResizingModal, setIsResizingModal] = useState(false);

  useEffect(() => {
    setConfirmDeleteId(null);
  }, [data?.id]);

  // Sidebar Resizing
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          const newWidth = document.body.clientWidth - e.clientX;
          if (newWidth > 300 && newWidth < 800) {
              setPanelWidth(newWidth);
          }
      };
      const handleMouseUp = () => setIsResizing(false);

      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing]);

  // Modal Resizing Logic
  useEffect(() => {
      const handleModalMouseMove = (e: MouseEvent) => {
          if (!isResizingModal) return;
          setModalSize(prev => ({
              width: Math.max(600, prev.width + e.movementX * 2),
              height: Math.max(400, prev.height + e.movementY * 2)
          }));
      };
      const handleModalMouseUp = () => setIsResizingModal(false);

      if (isResizingModal) {
          window.addEventListener('mousemove', handleModalMouseMove);
          window.addEventListener('mouseup', handleModalMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleModalMouseMove);
          window.removeEventListener('mouseup', handleModalMouseUp);
      };
  }, [isResizingModal]);


  const inputClass = "w-full p-3 bg-white text-sw-text border border-gray-300 rounded-lg focus:outline-none focus:border-sw-teal focus:ring-1 focus:ring-sw-teal transition-all text-sm";
  const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";

  // --- SPECIFIC MODAL CONTENTS ---

  const renderSkillModal = () => {
      if (!skillModalOpen || activeRuleIndex === null || !selectedStage) return null;
      const rule = selectedStage.skillLogic?.[activeRuleIndex];
      if (!rule) return null;

      const handleModalUpdate = (updatedRule: SkillRule) => {
          const newList = [...selectedStage.skillLogic!];
          newList[activeRuleIndex] = updatedRule;
          onUpdateStage({ ...selectedStage, skillLogic: newList });
      };

      return (
          <ModalWrapper 
            title={`Configure Routing Rule #${activeRuleIndex + 1}`} 
            icon={Briefcase} 
            onClose={() => setSkillModalOpen(false)}
            modalSize={modalSize}
            onResizeStart={() => setIsResizingModal(true)}
          >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                  <div className="lg:col-span-2 space-y-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                          <GitMerge className="text-sw-teal" size={20} />
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest">When these conditions are met...</h4>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto">
                          <LogicBuilder 
                              group={rule.logic} 
                              onChange={(g) => handleModalUpdate({ ...rule, logic: g })} 
                              availableTargets={availableTargets}
                          />
                      </div>
                  </div>
                  <div className="space-y-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="text-sw-teal" size={20} />
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Route to...</h4>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                          <label className="block text-xs font-bold text-gray-400 mb-2">Required Skill / Work Queue</label>
                          <input 
                              type="text" 
                              value={rule.requiredSkill}
                              onChange={(e) => handleModalUpdate({ ...rule, requiredSkill: e.target.value })}
                              className="w-full p-3 border border-sw-teal/30 rounded-lg font-bold text-sw-teal mb-4 focus:ring-2 focus:ring-sw-teal"
                              placeholder="e.g. Senior Underwriter"
                          />
                          <div className="text-xs font-bold text-gray-400 mb-2">Quick Select:</div>
                          <div className="flex flex-wrap gap-2 overflow-y-auto content-start">
                              {COMMON_SKILLS.map(skill => (
                                  <button
                                      key={skill}
                                      onClick={() => handleModalUpdate({ ...rule, requiredSkill: skill })}
                                      className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${rule.requiredSkill === skill ? 'bg-sw-teal text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-sw-teal/10'}`}
                                  >
                                      {skill}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </ModalWrapper>
      );
  };

  const renderVisibilityModal = () => {
      if (!visibilityModalOpen || !data) return null;
      const logicGroup = (data as any).visibility;

      return (
          <ModalWrapper 
            title="Configure Visibility Logic" 
            icon={Eye} 
            onClose={() => setVisibilityModalOpen(false)}
            modalSize={modalSize}
            onResizeStart={() => setIsResizingModal(true)}
          >
              <div className="max-w-4xl mx-auto">
                  <p className="text-gray-500 mb-6">Define the rules that determine when this {isEditingElement ? 'field' : 'section'} should be visible.</p>
                  <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                      <LogicBuilder 
                          group={logicGroup} 
                          onChange={(g) => handleChange('visibility', g)} 
                          availableTargets={availableTargets}
                      />
                  </div>
              </div>
          </ModalWrapper>
      );
  }

  const renderValidationModal = () => {
      if (!validationModalOpen || !isEditingElement) return null;
      const el = data as ElementDefinition;

      return (
          <ModalWrapper 
            title="Field Validation Rules" 
            icon={ShieldCheck} 
            onClose={() => setValidationModalOpen(false)}
            modalSize={modalSize}
            onResizeStart={() => setIsResizingModal(true)}
          >
              <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
                      <div>
                          <label className={labelClass}>Validation Type</label>
                          <select 
                              value={el.validation?.type || 'none'} 
                              onChange={(e) => handleValidationChange('type', e.target.value)}
                              className={inputClass}
                          >
                              <option value="none">No Validation</option>
                              <option value="email">Email Format</option>
                              <option value="phone_uk">UK Mobile/Phone Number</option>
                              <option value="nino_uk">UK National Insurance Number</option>
                              <option value="date_future">Date must be in Future</option>
                              <option value="date_past">Date must be in Past</option>
                              <option value="custom">Custom Description</option>
                          </select>
                      </div>
                      
                      {el.validation?.type === 'custom' && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                              <label className={labelClass}>Custom Rule Description</label>
                              <textarea
                                  value={el.validation?.customDescription || ''}
                                  onChange={(e) => handleValidationChange('customDescription', e.target.value)}
                                  className={inputClass}
                                  rows={4}
                                  placeholder="Describe the validation rule (e.g., 'Must start with 3 letters...')"
                              />
                              <p className="text-xs text-gray-400 mt-2">This description will be included in the generated user stories for developers.</p>
                          </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                          <Info className="text-blue-500 shrink-0" size={20} />
                          <div className="text-sm text-blue-700">
                              <p className="font-bold mb-1">Note:</p>
                              <p>Standard validations (Email, Phone, NI) are automatically enforced in the Preview mode. Custom validations are documentation-only.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalWrapper>
      );
  }

  if (!data) {
    return (
      <div id="panel" style={{ width: panelWidth }} className="h-full flex flex-col items-center justify-center bg-white border-l border-gray-200 shadow-2xl z-40 relative">
         <div 
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-sw-teal/20 cursor-col-resize z-50 transition-colors"
            onMouseDown={() => setIsResizing(true)}
         ></div>
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">
             <X size={20} />
         </button>
        <div className="p-8 text-center text-gray-400">
            <Info size={48} className="mb-4 opacity-20 mx-auto" />
            <p className="text-lg font-serif text-sw-teal mb-2">No Selection</p>
            <p className="text-sm">Select an element, section, or stage to edit properties.</p>
        </div>
      </div>
    );
  }

  // Generic handler
  const handleChange = (field: string, value: any) => {
    if (isEditingElement) {
        onUpdateElement({ ...selectedElement!, [field]: value });
    } else if (isEditingSection) {
        onUpdateSection({ ...selectedSection!, [field]: value });
    } else if (isEditingStage) {
        onUpdateStage({ ...selectedStage!, [field]: value });
    }
  };

  const handleValidationChange = (field: string, value: any) => {
    if (!isEditingElement) return;
    const currentValidation = selectedElement?.validation || { type: 'none' };
    const updatedValidation = { ...currentValidation, [field]: value };
    onUpdateElement({ ...selectedElement!, validation: updatedValidation });
  };

  const handleDelete = () => {
      if (confirmDeleteId === data.id) {
          if (isEditingElement) onDeleteElement(data.id);
          else if (isEditingSection) onDeleteSection(data.id);
          setConfirmDeleteId(null);
      } else {
          setConfirmDeleteId(data.id);
          setTimeout(() => {
              setConfirmDeleteId(current => current === data.id ? null : current);
          }, 3000);
      }
  }

  const availableTargets = allElements.filter(e => e.id !== data.id);

  const ensureLogicGroup = (field: 'visibility' | 'requiredLogic') => {
      const current = (data as any)[field];
      if (!current) {
          const newGroup: LogicGroup = { id: 'root', operator: 'AND', conditions: [] };
          handleChange(field, newGroup);
      }
  };

  // --- Render ---
  return (
    <div id="panel" style={{ width: panelWidth }} className="h-full flex flex-col bg-white border-l border-gray-200 shadow-2xl z-40 relative">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-sw-teal/20 cursor-col-resize z-50 transition-colors" onMouseDown={() => setIsResizing(true)}></div>

      {renderSkillModal()}
      {renderVisibilityModal()}
      {renderValidationModal()}

      {/* Header */}
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex flex-col overflow-hidden max-w-[200px]">
            <h2 className="font-serif font-bold text-2xl text-sw-teal truncate">
                {isEditingElement ? 'Element' : isEditingSection ? 'Section' : 'Stage'}
            </h2>
            <span className="text-xs text-gray-400 font-mono truncate">{data.id}</span>
        </div>
        <div className="flex items-center gap-1">
            {!isEditingStage && (
                <button onClick={handleDelete} className={`p-2 rounded-full transition-all flex items-center gap-2 shrink-0 ${confirmDeleteId === data.id ? 'bg-sw-red text-white pr-4 shadow-md' : 'text-gray-400 hover:text-sw-red hover:bg-sw-lightGray'}`} title="Delete">
                <Trash2 size={20} />
                {confirmDeleteId === data.id && <span className="text-xs font-bold animate-in fade-in">Confirm?</span>}
                </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-sw-lightGray transition-colors" title="Close Panel">
                <X size={20} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'general' ? 'text-sw-teal border-b-4 border-sw-teal bg-sw-lightGray/30' : 'text-gray-400 hover:text-sw-teal'}`} onClick={() => onTabChange('general')}>
          General
        </button>
        <button className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'logic' ? 'text-sw-teal border-b-4 border-sw-teal bg-sw-lightGray/30' : 'text-gray-400 hover:text-sw-teal'}`} onClick={() => onTabChange('logic')}>
          {isEditingStage ? 'Operations' : 'Logic'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* --- GENERAL TAB --- */}
        {activeTab === 'general' && (
          <>
            {isEditingStage && (
                <>
                    <div><label className={labelClass}>Stage Title</label><input type="text" value={(data as StageDefinition).title} onChange={(e) => handleChange('title', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Default Required Skill</label><input type="text" value={(data as StageDefinition).defaultSkill || ''} onChange={(e) => handleChange('defaultSkill', e.target.value)} className={inputClass} placeholder="e.g. Customer Service Rep" /></div>
                </>
            )}
            {isEditingSection && (
                <>
                    <div><label className={labelClass}>Section Title</label><input type="text" value={(data as SectionDefinition).title} onChange={(e) => handleChange('title', e.target.value)} className={inputClass} /></div>
                    <div>
                    <label className={labelClass}>Layout Grid</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['1col', '2col', '3col'].map(l => (
                            <button key={l} onClick={() => handleChange('layout', l)} className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${(data as SectionDefinition).layout === l ? 'border-sw-teal bg-sw-teal/5 text-sw-teal font-bold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}><Layout size={20} /><span className="text-xs uppercase">{l.replace('col', ' Col')}</span></button>
                        ))}
                    </div>
                 </div>
                </>
            )}
            {isEditingElement && (
                <>
                    <div><label className={labelClass}>Field Label</label><input type="text" value={(data as ElementDefinition).label} onChange={(e) => handleChange('label', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Field Type</label>
                        <select value={(data as ElementDefinition).type} onChange={(e) => handleChange('type', e.target.value)} className={inputClass}>
                            <option value="text">Single Line Text</option><option value="email">Email Address</option><option value="textarea">Multi-line Text</option><option value="number">Number</option><option value="date">Date</option><option value="currency">Currency</option><option value="select">Dropdown</option><option value="radio">Radio Buttons</option><option value="checkbox">Checkbox</option><option value="static">Static Text</option>
                        </select>
                    </div>
                    {['select', 'radio'].includes((data as ElementDefinition).type) && (
                        <div><label className={labelClass}>Options (comma separated)</label><textarea value={Array.isArray((data as ElementDefinition).options) ? ((data as ElementDefinition).options as string[]).join(',') : (data as ElementDefinition).options} onChange={(e) => handleChange('options', e.target.value.split(','))} className={inputClass} rows={3} /></div>
                    )}
                    {(data as ElementDefinition).type !== 'static' && (
                        <div className="flex items-center gap-3 mt-4 p-4 bg-sw-lightGray rounded-xl">
                            <input type="checkbox" checked={(data as ElementDefinition).required} onChange={(e) => handleChange('required', e.target.checked)} className="w-5 h-5 text-sw-teal rounded focus:ring-sw-teal" />
                            <label className="text-sm text-sw-teal font-bold">Mandatory Field</label>
                        </div>
                    )}
                </>
            )}
          </>
        )}

        {/* --- LOGIC TAB --- */}
        {activeTab === 'logic' && (
          <div className="space-y-6">
            
            {/* STAGE SKILLS */}
            {isEditingStage && (
                <div className="space-y-4">
                    <div className="bg-sw-purpleLight/30 p-6 rounded-xl border border-sw-teal/10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-sw-teal p-2 rounded-lg text-white"><Briefcase size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-sw-teal">Skill Routing</h3>
                                    <p className="text-xs text-gray-500">{(data as StageDefinition).skillLogic?.length || 0} Rules Configured</p>
                                </div>
                            </div>
                            <button onClick={() => {
                                const newRule: SkillRule = { logic: { id: Date.now().toString(), operator: 'AND', conditions: [] }, requiredSkill: '' };
                                const newIndex = (selectedStage.skillLogic?.length || 0);
                                onUpdateStage({ ...selectedStage!, skillLogic: [...(selectedStage?.skillLogic || []), newRule] });
                                setActiveRuleIndex(newIndex);
                                setSkillModalOpen(true);
                            }} className="text-xs bg-sw-teal text-white px-3 py-2 rounded-lg font-bold hover:bg-sw-tealHover">+ Add Rule</button>
                        </div>
                        <div className="space-y-2">
                            {(data as StageDefinition).skillLogic?.map((rule, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center text-sm group">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-gray-400">#{idx+1}</span>
                                        <span className="font-bold text-gray-700">{rule.requiredSkill || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setActiveRuleIndex(idx); setSkillModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-sw-teal"><Edit2 size={14}/></button>
                                        <button onClick={() => { const nl = [...selectedStage!.skillLogic!]; nl.splice(idx,1); onUpdateStage({...selectedStage!, skillLogic: nl}); }} className="p-1.5 hover:bg-gray-100 rounded text-sw-red"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VISIBILITY CARD */}
            {!isEditingStage && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card hover:shadow-lg transition-all cursor-pointer group" onClick={() => { ensureLogicGroup('visibility'); setVisibilityModalOpen(true); }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-sw-purpleLight rounded-lg text-sw-teal group-hover:bg-sw-teal group-hover:text-white transition-colors">
                            <Eye size={24} />
                        </div>
                        <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${((data as any).visibility?.conditions?.length > 0 || (data as any).visibility?.groups?.length > 0) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                {((data as any).visibility?.conditions?.length || 0)} Conditions
                            </span>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Visibility Logic</h3>
                    <p className="text-sm text-gray-500 mb-4">Control when this component appears based on other field values.</p>
                    <button className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 group-hover:bg-sw-teal group-hover:text-white group-hover:border-sw-teal transition-all">Configure Rules</button>
                </div>
            )}

            {/* VALIDATION CARD */}
            {isEditingElement && (data as ElementDefinition).type !== 'static' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card hover:shadow-lg transition-all cursor-pointer group" onClick={() => setValidationModalOpen(true)}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 rounded-lg text-sw-red group-hover:bg-sw-red group-hover:text-white transition-colors">
                            <ShieldCheck size={24} />
                        </div>
                        <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${(data as ElementDefinition).validation?.type !== 'none' && (data as ElementDefinition).validation ? 'bg-sw-teal text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {(data as ElementDefinition).validation?.type || 'None'}
                            </span>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Data Validation</h3>
                    <p className="text-sm text-gray-500 mb-4">Set format rules like Email, UK Phone, or custom logic checks.</p>
                    <button className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 group-hover:bg-sw-red group-hover:text-white group-hover:border-sw-red transition-all">Setup Validation</button>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
