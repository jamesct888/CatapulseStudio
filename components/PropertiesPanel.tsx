
import React, { useEffect, useState } from 'react';
import { ElementDefinition, SectionDefinition, Condition, ValidationType } from '../types';
import { Plus, Trash2, AlertCircle, Cpu, Info, Layout, Database, PanelBottom, Layers, ShieldCheck } from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: ElementDefinition | null;
  selectedSection: SectionDefinition | null;
  allElements: ElementDefinition[];
  activeTab: 'general' | 'logic';
  onTabChange: (tab: 'general' | 'logic') => void;
  onUpdateElement: (updated: ElementDefinition) => void;
  onUpdateSection: (updated: SectionDefinition) => void;
  onDeleteElement: (id: string) => void;
  onDeleteSection: (id: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedElement, 
  selectedSection,
  allElements, 
  activeTab,
  onTabChange,
  onUpdateElement,
  onUpdateSection, 
  onDeleteElement,
  onDeleteSection
}) => {
  
  // Determine what we are editing
  const isEditingElement = !!selectedElement;
  const isEditingSection = !selectedElement && !!selectedSection;
  const data = selectedElement || selectedSection;

  // Local state for delete confirmation to avoid window.confirm sandbox issues
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset confirmation state if selection changes
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [data?.id]);

  // Updated input style class to match design system
  const inputClass = "w-full p-3 bg-white text-sw-text border border-gray-300 rounded-lg focus:outline-none focus:border-sw-teal focus:ring-1 focus:ring-sw-teal transition-all text-sm";
  const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full bg-white">
        <Info size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-serif text-sw-teal mb-2">No Selection</p>
        <p className="text-sm">Select an element or section on the canvas to edit its properties.</p>
      </div>
    );
  }

  // Generic handler for root properties
  const handleChange = (field: string, value: any) => {
    if (isEditingElement) {
        onUpdateElement({ ...selectedElement!, [field]: value });
    } else if (isEditingSection) {
        onUpdateSection({ ...selectedSection!, [field]: value });
    }
  };

  // Validation Handler
  const handleValidationChange = (field: string, value: any) => {
    if (!isEditingElement) return;
    const currentValidation = selectedElement?.validation || { type: 'none' };
    const updatedValidation = { ...currentValidation, [field]: value };
    onUpdateElement({ ...selectedElement!, validation: updatedValidation });
  };

  const handleConditionChange = (
    type: 'visibilityConditions' | 'requiredConditions',
    index: number,
    field: keyof Condition,
    value: any
  ) => {
    const currentConditions = (data as any)[type] || [];
    let newValue = value;
    let newConditions = [...currentConditions];
    
    // Create updated condition object
    const updatedCondition = { ...currentConditions[index], [field]: newValue };

    if (field === 'operator' && (newValue === 'isEmpty' || newValue === 'isNotEmpty')) {
        updatedCondition.value = '';
    }

    newConditions[index] = updatedCondition;

    if (isEditingElement) {
        onUpdateElement({ ...selectedElement!, [type]: newConditions });
    } else {
        onUpdateSection({ ...selectedSection!, [type]: newConditions });
    }
  };

  const addCondition = (type: 'visibilityConditions' | 'requiredConditions') => {
    const newCondition: Condition = {
      targetElementId: allElements.filter(e => e.id !== data.id)[0]?.id || '',
      operator: 'equals',
      value: ''
    };
    const currentList = (data as any)[type] || [];
    
    if (isEditingElement) {
        onUpdateElement({ ...selectedElement!, [type]: [...currentList, newCondition] });
    } else {
        onUpdateSection({ ...selectedSection!, [type]: [...currentList, newCondition] });
    }
  };

  const removeCondition = (type: 'visibilityConditions' | 'requiredConditions', index: number) => {
    const conditions = [...((data as any)[type] || [])];
    conditions.splice(index, 1);
    
    if (isEditingElement) {
        onUpdateElement({ ...selectedElement!, [type]: conditions });
    } else {
        onUpdateSection({ ...selectedSection!, [type]: conditions });
    }
  };

  // Filter available targets to avoid self-reference or cyclic dependencies (simple check)
  const availableTargets = allElements.filter(e => e.id !== data.id);

  const renderConditionRow = (cond: Condition, idx: number, type: 'visibilityConditions' | 'requiredConditions') => {
      const isUnary = cond.operator === 'isEmpty' || cond.operator === 'isNotEmpty';
      return (
        <div key={idx} id={`condition-${type}-${idx}`} className="p-4 bg-sw-lightGray rounded-xl relative text-sm border border-gray-200">
            <button onClick={() => removeCondition(type, idx)} className="absolute top-2 right-2 text-gray-400 hover:text-sw-red transition-colors">
            <Trash2 size={16} />
            </button>
            <div className="space-y-3 pt-2">
            <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">If Field</label>
                <select 
                    className={inputClass}
                    value={cond.targetElementId}
                    onChange={(e) => handleConditionChange(type, idx, 'targetElementId', e.target.value)}
                >
                    <option value="">Select Field...</option>
                    {availableTargets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
            </div>
            <div className="flex gap-3">
                <div className={isUnary ? "w-full" : "w-1/2"}>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Condition</label>
                    <select 
                        className={inputClass}
                        value={cond.operator}
                        onChange={(e) => handleConditionChange(type, idx, 'operator', e.target.value)}
                    >
                        <option value="equals">Equals</option>
                        <option value="notEquals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greaterThan">Greater Than</option>
                        <option value="lessThan">Less Than</option>
                        <option value="isNotEmpty">Is Not Empty</option>
                        <option value="isEmpty">Is Empty</option>
                    </select>
                </div>
                {!isUnary && (
                    <div className="w-1/2">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Value</label>
                        <input 
                            type="text" 
                            className={inputClass}
                            value={String(cond.value)}
                            onChange={(e) => handleConditionChange(type, idx, 'value', e.target.value)}
                        />
                    </div>
                )}
            </div>
            </div>
        </div>
      );
  }

  const handleDelete = () => {
      // 2-step confirmation to bypass sandbox window.confirm restrictions
      if (confirmDeleteId === data.id) {
          if (isEditingElement) onDeleteElement(data.id);
          else onDeleteSection(data.id);
          setConfirmDeleteId(null);
      } else {
          setConfirmDeleteId(data.id);
          // Auto-reset after 3 seconds if not confirmed
          setTimeout(() => {
              setConfirmDeleteId(current => current === data.id ? null : current);
          }, 3000);
      }
  }

  return (
    <div id="panel" className="h-full flex flex-col bg-white border-l border-gray-200 shadow-2xl z-40">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <div className="flex flex-col">
            <h2 className="font-serif font-bold text-2xl text-sw-teal">
                {isEditingElement ? 'Element' : 'Section'}
            </h2>
            <span className="text-xs text-gray-400 font-mono">{data.id}</span>
        </div>
        <button 
          onClick={handleDelete}
          className={`p-2 rounded-full transition-all flex items-center gap-2 ${confirmDeleteId === data.id ? 'bg-sw-red text-white pr-4 shadow-md' : 'text-gray-400 hover:text-sw-red hover:bg-sw-lightGray'}`}
          title={confirmDeleteId === data.id ? "Click again to confirm" : `Delete ${isEditingElement ? 'Element' : 'Section'}`}
        >
          <Trash2 size={20} />
          {confirmDeleteId === data.id && <span className="text-xs font-bold animate-in fade-in">Confirm?</span>}
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          id="tab-general"
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'general' ? 'text-sw-teal border-b-4 border-sw-teal bg-sw-lightGray/30' : 'text-gray-400 hover:text-sw-teal'}`}
          onClick={() => onTabChange('general')}
        >
          General
        </button>
        <button
          id="tab-logic"
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'logic' ? 'text-sw-teal border-b-4 border-sw-teal bg-sw-lightGray/30' : 'text-gray-400 hover:text-sw-teal'}`}
          onClick={() => onTabChange('logic')}
        >
          Logic
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {activeTab === 'general' && (
          <>
            {isEditingElement ? (
              /* Element Specific Fields */
              <>
                <div>
                  <label className={labelClass}>Field Label</label>
                  <input
                    type="text"
                    value={(data as ElementDefinition).label}
                    onChange={(e) => handleChange('label', e.target.value)}
                    className={inputClass}
                    placeholder="Enter label text..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Field Type</label>
                  <select
                    value={(data as ElementDefinition).type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className={inputClass}
                  >
                    <option value="text">Single Line Text</option>
                    <option value="email">Email Address</option>
                    <option value="textarea">Multi-line Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="currency">Currency</option>
                    <option value="select">Dropdown</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="static">Static Text / Read-Only</option>
                  </select>
                </div>
                
                {/* Static Element Specific: Data Source */}
                {(data as ElementDefinition).type === 'static' && (
                    <div className="p-4 bg-sw-lightGray rounded-xl border border-gray-200">
                        <label className={labelClass}>Content Mode</label>
                        <div className="flex bg-white p-1 rounded-lg border border-gray-300 mb-4">
                            <button 
                                onClick={() => handleChange('staticDataSource', 'manual')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${(data as ElementDefinition).staticDataSource !== 'field' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-sw-teal'}`}
                            >
                                Manual Text
                            </button>
                            <button 
                                onClick={() => handleChange('staticDataSource', 'field')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${(data as ElementDefinition).staticDataSource === 'field' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-sw-teal'}`}
                            >
                                Value from Field
                            </button>
                        </div>

                        {(data as ElementDefinition).staticDataSource === 'field' ? (
                             <div>
                                <label className={labelClass}>Source Field</label>
                                <select
                                    value={(data as ElementDefinition).sourceFieldId || ''}
                                    onChange={(e) => handleChange('sourceFieldId', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Select a field...</option>
                                    {availableTargets.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                                    <Database size={12}/> This field will display the value of the selected source.
                                </p>
                             </div>
                        ) : (
                             <div>
                                <label className={labelClass}>Content</label>
                                <textarea
                                    value={data.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className={inputClass}
                                    rows={4}
                                    placeholder="Enter static text content here..."
                                />
                             </div>
                        )}
                    </div>
                )}

                {/* Options for Select/Radio */}
                {((data as ElementDefinition).type === 'select' || (data as ElementDefinition).type === 'radio') && (
                  <div>
                    <label className={labelClass}>Options (comma separated)</label>
                    <textarea
                      value={Array.isArray((data as ElementDefinition).options) ? ((data as ElementDefinition).options as string[]).join(',') : (data as ElementDefinition).options}
                      onChange={(e) => handleChange('options', e.target.value.split(','))}
                      className={inputClass}
                      rows={3}
                      placeholder="Option 1, Option 2, Option 3..."
                    />
                  </div>
                )}

                {/* Description for Input Fields */}
                {((data as ElementDefinition).type === 'text' || (data as ElementDefinition).type === 'email' || (data as ElementDefinition).type === 'textarea') && (
                  <div>
                    <label className={labelClass}>Placeholder / Help Text</label>
                    <textarea
                      value={data.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={inputClass}
                      rows={3}
                    />
                  </div>
                )}

                {/* Mandatory Checkbox (Not available for Static) */}
                {(data as ElementDefinition).type !== 'static' && (
                    <div className="flex items-center gap-3 mt-6 p-4 bg-sw-lightGray rounded-xl">
                    <input 
                        type="checkbox" 
                        id="req" 
                        checked={(data as ElementDefinition).required} 
                        onChange={(e) => handleChange('required', e.target.checked)}
                        className="w-5 h-5 text-sw-teal border-gray-300 rounded focus:ring-sw-teal accent-sw-teal"
                    />
                    <label htmlFor="req" className="text-sm text-sw-teal font-bold">Mandatory Field</label>
                    </div>
                )}
              </>
            ) : (
               /* Section Specific Fields */
               <>
                 <div>
                    <label className={labelClass}>Section Title</label>
                    <input
                        type="text"
                        value={(data as SectionDefinition).title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={inputClass}
                    />
                 </div>
                 
                 {/* Section Variant Selector (Standard vs Summary) */}
                 <div>
                    <label className={labelClass}>Section Type</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button 
                            onClick={() => handleChange('variant', 'standard')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${!(data as SectionDefinition).variant || (data as SectionDefinition).variant === 'standard' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Layers size={14} /> Standard Flow
                        </button>
                        <button 
                            onClick={() => handleChange('variant', 'summary')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${(data as SectionDefinition).variant === 'summary' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <PanelBottom size={14} /> Sticky Summary
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                        {(data as SectionDefinition).variant === 'summary' 
                            ? 'Appears at the bottom of the form across all stages. Read-only.' 
                            : 'Appears in the normal form flow within its specific stage.'}
                    </p>
                 </div>

                 <div>
                    <label className={labelClass}>Layout Grid</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['1col', '2col', '3col'].map(l => (
                            <button
                                key={l}
                                onClick={() => handleChange('layout', l)}
                                className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${(data as SectionDefinition).layout === l ? 'border-sw-teal bg-sw-teal/5 text-sw-teal font-bold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <Layout size={20} />
                                <span className="text-xs uppercase">{l.replace('col', ' Col')}</span>
                            </button>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className={labelClass}>Description / Notes</label>
                    <textarea
                        value={data.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className={inputClass}
                        rows={4}
                        placeholder="Internal notes or description..."
                    />
                 </div>
               </>
            )}
          </>
        )}

        {activeTab === 'logic' && (
          <div className="space-y-10">
             {/* Data Validation Section (Elements Only) */}
             {isEditingElement && (data as ElementDefinition).type !== 'static' && (
                <div className="pb-8 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-sw-teal uppercase flex items-center gap-2">
                            <ShieldCheck size={16} /> Data Validation
                        </label>
                    </div>
                    
                    <div className="p-4 bg-sw-lightGray rounded-xl border border-gray-200 space-y-4">
                         <div>
                            <label className={labelClass}>Validation Type</label>
                            <select 
                                value={(data as ElementDefinition).validation?.type || 'none'} 
                                onChange={(e) => handleValidationChange('type', e.target.value)}
                                className={inputClass}
                            >
                                <option value="none">None</option>
                                <option value="email">Email Format</option>
                                <option value="phone_uk">UK Mobile/Phone Number</option>
                                <option value="nino_uk">UK National Insurance Number</option>
                                <option value="date_future">Date must be in Future</option>
                                <option value="date_past">Date must be in Past</option>
                                <option value="custom">Custom / Other</option>
                            </select>
                         </div>

                         {(data as ElementDefinition).validation?.type === 'custom' && (
                             <div className="animate-in fade-in slide-in-from-top-2">
                                <label className={labelClass}>Custom Rule Description</label>
                                <textarea
                                    value={(data as ElementDefinition).validation?.customDescription || ''}
                                    onChange={(e) => handleValidationChange('customDescription', e.target.value)}
                                    className={inputClass}
                                    rows={3}
                                    placeholder="e.g. Must start with 'n' and be followed by 5 numbers..."
                                />
                                <p className="text-[10px] text-gray-400 mt-2 italic flex items-center gap-1">
                                    <Info size={12}/> Used for documentation. Not enforced in preview.
                                </p>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {/* Visibility Logic (Common to both) */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-sw-teal uppercase flex items-center gap-2">
                   <AlertCircle size={16} /> Visibility Rules
                </label>
                <button onClick={() => addCondition('visibilityConditions')} className="text-xs bg-sw-teal text-white px-3 py-1.5 rounded-full hover:bg-sw-tealHover font-bold transition-all flex items-center gap-1 shadow-sm">
                  <Plus size={14} /> Add Rule
                </button>
              </div>
              <div className="space-y-4">
                {(!data.visibilityConditions || data.visibilityConditions.length === 0) && (
                   <div className="text-sm text-gray-400 italic p-4 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                     {isEditingElement ? 'Element' : 'Section'} is always visible.
                   </div>
                )}
                {data.visibilityConditions?.map((cond, idx) => renderConditionRow(cond, idx, 'visibilityConditions'))}
              </div>
            </div>

            {/* Required Logic (Only for Elements) */}
            {isEditingElement && (data as ElementDefinition).type !== 'static' && (
                <div>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-sw-teal uppercase flex items-center gap-2">
                    <Cpu size={16} /> Mandatory Rules
                    </label>
                    <button onClick={() => addCondition('requiredConditions')} className="text-xs bg-sw-teal text-white px-3 py-1.5 rounded-full hover:bg-sw-tealHover font-bold transition-all flex items-center gap-1 shadow-sm">
                    <Plus size={14} /> Add Rule
                    </button>
                </div>
                <div className="space-y-4">
                    {(!(data as ElementDefinition).requiredConditions || (data as ElementDefinition).requiredConditions?.length === 0) && (
                    <div className="text-sm text-gray-400 italic p-4 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                        Follows default mandatory setting.
                    </div>
                    )}
                    {(data as ElementDefinition).requiredConditions?.map((cond, idx) => renderConditionRow(cond, idx, 'requiredConditions'))}
                </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
