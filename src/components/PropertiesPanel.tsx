

import React, { useEffect, useState } from 'react';
import { ElementDefinition, SectionDefinition, StageDefinition, SkillRule, LogicGroup, RepeaterColumn, VisualTheme } from '../types';
import { Trash2, Info, Layout, Briefcase, ShieldCheck, GitMerge, Eye, X, Edit2, Plus, ArrowLeft, Palette } from 'lucide-react';
import { LogicBuilder } from './LogicBuilder';
import { ModalWrapper } from './ModalWrapper';
import { formatLogicSummary } from '../utils/logic';

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
  onDeleteStage: (id: string) => void;
  visualTheme?: VisualTheme;
  onUpdateTheme?: (theme: VisualTheme) => void;
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
  onDeleteStage,
  visualTheme,
  onUpdateTheme,
  onClose
}) => {
  
  const isEditingElement = !!selectedElement;
  const isEditingSection = !selectedElement && !!selectedSection;
  const isEditingStage = !selectedElement && !selectedSection && !!selectedStage;
  
  const data = selectedElement || selectedSection || selectedStage;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Toggle between Selection Properties and Global Settings
  const [forceGlobalSettings, setForceGlobalSettings] = useState(false);

  // Resizable sidebar state - Default to 480px
  const [panelWidth, setPanelWidth] = useState(480);
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
  
  // When selection changes, switch back to item properties view automatically
  useEffect(() => {
    setForceGlobalSettings(false);
  }, [selectedElement?.id, selectedSection?.id, selectedStage?.id]);

  // Sidebar Resizing
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          const newWidth = document.body.clientWidth - e.clientX;
          if (newWidth > 300 && newWidth < 1200) {
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
                              className="w-full p-3 border border-sw-teal/30 rounded-lg font-bold text-sw-teal mb-4 focus:ring-2 focus:ring-sw-teal bg-white"
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

  // --- RENDER GLOBAL SETTINGS IF NO SELECTION OR FORCED ---
  if (!data || forceGlobalSettings) {
    return (
      <div id="panel" style={{ width: panelWidth }} className="h-full flex flex-col bg-white border-l border-gray-200 shadow-2xl z-40 relative">
         <div 
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-sw-teal/20 cursor-col-resize z-50 transition-colors"
            onMouseDown={() => setIsResizing(true)}
         ></div>

         <div className="p-8 border-b border-gray-100 flex items-start gap-4">
             {data && (
                <button 
                    onClick={() => setForceGlobalSettings(false)}
                    className="mt-1 p-1 -ml-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-full transition-colors"
                    title="Back to Selection"
                >
                    <ArrowLeft size={20} />
                </button>
             )}
             <div className="flex-1">
                <h2 className="font-serif font-bold text-2xl text-sw-teal">Global Settings</h2>
                <p className="text-xs text-gray-400 mt-1">Application Styling & Themes</p>
             </div>
             <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
                 <X size={20} />
             </button>
         </div>

         {visualTheme && onUpdateTheme ? (
             <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                 {/* Theme Mode Selector */}
                 <div className="space-y-4">
                     <label className={labelClass}>Color Theme</label>
                     <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type1' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${visualTheme.mode === 'type1' ? 'border-sw-teal bg-sw-lightGray text-sw-teal ring-1 ring-sw-teal' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                         >
                             <div className="w-12 h-8 bg-sw-teal border border-sw-teal rounded flex items-center justify-center shadow-sm">
                                 <Palette size={16} className="text-white" />
                             </div>
                             <span className="text-xs font-bold">Type 1 (Teal)</span>
                         </button>
                         <button 
                            onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type2' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${visualTheme.mode === 'type2' ? 'border-[#e61126] bg-[#e0e0e0] text-[#e61126] ring-1 ring-[#e61126]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                         >
                             <div className="w-12 h-8 bg-[#e61126] border border-[#e61126] rounded flex items-center justify-center shadow-sm">
                                 <Palette size={16} className="text-white" />
                             </div>
                             <span className="text-xs font-bold">Type 2 (Red/Pink)</span>
                         </button>
                         <button 
                            onClick={() => onUpdateTheme({ ...visualTheme, mode: 'type3' })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all col-span-2 ${visualTheme.mode === 'type3' ? 'border-[#006a4d] bg-[#f1f1f1] text-[#006a4d] ring-1 ring-[#006a4d]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                         >
                             <div className="w-12 h-8 bg-[#006a4d] border border-[#006a4d] rounded flex items-center justify-center shadow-sm">
                                 <Palette size={16} className="text-white" />
                             </div>
                             <span className="text-xs font-bold">Type 3 (Green)</span>
                         </button>
                     </div>
                 </div>

                 {/* Density Selector */}
                 <div className="space-y-4">
                     <label className={labelClass}>Screen Density</label>
                     <div className="grid grid-cols-2 gap-2">
                        {['dense', 'compact', 'default', 'spacious'].map((d) => (
                            <button
                                key={d}
                                onClick={() => onUpdateTheme({ ...visualTheme, density: d as any })}
                                className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${visualTheme.density === d ? 'bg-sw-teal text-white border-sw-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {d}
                            </button>
                        ))}
                     </div>
                 </div>

                 {/* Radius Selector */}
                 <div className="space-y-4">
                     <label className={labelClass}>Corner Radius</label>
                     <div className="flex gap-2">
                        {['none', 'small', 'medium', 'large'].map((r) => (
                            <button
                                key={r}
                                onClick={() => onUpdateTheme({ ...visualTheme, radius: r as any })}
                                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${visualTheme.radius === r ? 'bg-sw-teal text-white border-sw-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {r}
                            </button>
                        ))}
                     </div>
                 </div>

                 <div className="pt-6 border-t border-gray-100">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm text-blue-700">
                        <Info className="shrink-0" size={18} />
                        <p>These settings affect the Preview mode and exported HTML prototypes.</p>
                    </div>
                 </div>
             </div>
         ) : (
             <div className="p-8 text-center text-gray-400">
                <Info size={48} className="mb-4 opacity-20 mx-auto" />
                <p className="text-lg font-serif text-sw-teal mb-2">No Selection</p>
                <p className="text-sm">Select an element to edit properties.</p>
            </div>
         )}
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

  // Repeater Column Handlers
  const handleRepeaterChange = (cols: RepeaterColumn[]) => {
      handleChange('columns', cols);
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
          else if (isEditingStage) onDeleteStage(data.id);
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
             <button 
                onClick={() => setForceGlobalSettings(true)}
                className="p-2 text-gray-400 hover:text-sw-teal rounded-full hover:bg-sw-lightGray transition-colors"
                title="Global Theme Settings"
            >
                <Palette size={20} />
            </button>
            <button onClick={handleDelete} className={`p-2 rounded-full transition-all flex items-center gap-2 shrink-0 ${confirmDeleteId === data.id ? 'bg-sw-red text-white pr-4 shadow-md' : 'text-gray-400 hover:text-sw-red hover:bg-sw-lightGray'}`} title="Delete">
            <Trash2 size={20} />
            {confirmDeleteId === data.id && <span className="text-xs font-bold animate-in fade-in">Confirm?</span>}
            </button>
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
                            <option value="text">Single Line Text</option><option value="email">Email Address</option><option value="textarea">Multi-line Text</option><option value="number">Number</option><option value="date">Date</option><option value="currency">Currency</option><option value="select">Dropdown</option><option value="radio">Radio Buttons</option><option value="checkbox">Checkbox</option><option value="repeater">Repeater List</option><option value="static">Static Text</option>
                        </select>
                    </div>

                    {/* Repeater Configuration */}
                    {(data as ElementDefinition).type === 'repeater' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <label className={labelClass}>List Columns</label>
                            <div className="space-y-3 mb-3">
                                {((data as ElementDefinition).columns || []).map((col, idx) => (
                                    <div key={col.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400">Column {idx + 1}</span>
                                            <button 
                                                onClick={() => {
                                                    const newCols = [...((data as ElementDefinition).columns || [])];
                                                    newCols.splice(idx, 1);
                                                    handleRepeaterChange(newCols);
                                                }}
                                                className="text-gray-400 hover:text-sw-red"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input 
                                                type="text" 
                                                value={col.label} 
                                                onChange={(e) => {
                                                    const newCols = [...((data as ElementDefinition).columns || [])];
                                                    newCols[idx] = { ...newCols[idx], label: e.target.value };
                                                    handleRepeaterChange(newCols);
                                                }}
                                                className="w-full p-2 text-xs border border-gray-300 rounded bg-white text-sw-text focus:border-sw-teal focus:ring-1 focus:ring-sw-teal outline-none"
                                                placeholder="Label"
                                            />
                                            <select 
                                                value={col.type} 
                                                onChange={(e) => {
                                                    const newCols = [...((data as ElementDefinition).columns || [])];
                                                    newCols[idx] = { ...newCols[idx], type: e.target.value as any };
                                                    handleRepeaterChange(newCols);
                                                }}
                                                className="w-full p-2 text-xs border border-gray-300 rounded bg-white text-sw-text focus:border-sw-teal focus:ring-1 focus:ring-sw-teal outline-none"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="select">Select</option>
                                                <option value="checkbox">Checkbox</option>
                                            </select>
                                        </div>
                                        {col.type === 'select' && (
                                             <input 
                                                type="text" 
                                                value={col.options?.join(',') || ''}
                                                onChange={(e) => {
                                                    const newCols = [...((data as ElementDefinition).columns || [])];
                                                    newCols[idx] = { ...newCols[idx], options: e.target.value.split(',') };
                                                    handleRepeaterChange(newCols);
                                                }}
                                                className="w-full p-2 text-xs border border-gray-300 rounded bg-white text-sw-text focus:border-sw-teal focus:ring-1 focus:ring-sw-teal outline-none"
                                                placeholder="Options (comma separated)"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => {
                                    const newCols = [...((data as ElementDefinition).columns || [])];
                                    newCols.push({ id: `col_${Date.now()}`, label: 'New Column', type: 'text' });
                                    handleRepeaterChange(newCols);
                                }}
                                className="w-full py-2 bg-white border border-sw-teal text-sw-teal text-xs font-bold rounded-lg hover:bg-sw-teal hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Add Column
                            </button>
                        </div>
                    )}

                    {['select', 'radio'].includes((data as ElementDefinition).type) && (
                        <div><label className={labelClass}>Options (comma separated)</label><textarea value={Array.isArray((data as ElementDefinition).options) ? ((data as ElementDefinition).options as string[]).join(',') : (data as ElementDefinition).options} onChange={(e) => handleChange('options', e.target.value.split(','))} className={inputClass} rows={3} /></div>
                    )}
                    {(data as ElementDefinition).type !== 'static' && (data as ElementDefinition).type !== 'repeater' && (
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
                            }} className="text-xs bg-sw-teal text-white px-3 py-2 rounded-lg font-bold hover:bg-sw-tealHover">+ Add Routing Condition</button>
                        </div>
                        <div className="space-y-2">
                            {(data as StageDefinition).skillLogic?.map((rule, idx) => {
                                const summary = formatLogicSummary(rule.logic, allElements);
                                return (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center text-sm group">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-gray-400">#{idx+1}</span>
                                                <span className="font-bold text-gray-700">{rule.requiredSkill || 'Unassigned'}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 ml-6 mt-1 font-mono bg-gray-50 p-1 rounded inline-block">
                                                If: {summary}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setActiveRuleIndex(idx); setSkillModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-sw-teal"><Edit2 size={14}/></button>
                                            <button onClick={() => { const nl = [...selectedStage!.skillLogic!]; nl.splice(idx,1); onUpdateStage({...selectedStage!, skillLogic: nl}); }} className="p-1.5 hover:bg-gray-100 rounded text-sw-red"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                );
                            })}
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
            {isEditingElement && (data as ElementDefinition).type !== 'static' && (data as ElementDefinition).type !== 'repeater' && (
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
}