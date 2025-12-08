
import React from 'react';
import { LogicGroup, Condition } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface LogicBuilderProps {
    group: LogicGroup;
    onChange: (g: LogicGroup) => void;
    availableTargets: any[];
    depth?: number;
}

export const LogicBuilder: React.FC<LogicBuilderProps> = ({ group, onChange, availableTargets, depth = 0 }) => {
    const addCondition = () => {
        const newCond: Condition = { id: Date.now().toString(), targetElementId: availableTargets[0]?.id || '', operator: 'equals', value: '' };
        onChange({ ...group, conditions: [...group.conditions, newCond] });
    };

    const addSubGroup = () => {
        const newSubGroup: LogicGroup = { id: Date.now().toString(), operator: 'AND', conditions: [] };
        onChange({ ...group, groups: [...(group.groups || []), newSubGroup] });
    };

    const updateCondition = (idx: number, field: string, value: any) => {
        const newConds = [...group.conditions];
        // If changing the target field, reset the value to avoid mismatch types
        if (field === 'targetElementId') {
            newConds[idx] = { ...newConds[idx], [field]: value, value: '' };
        } else {
            newConds[idx] = { ...newConds[idx], [field]: value };
        }
        onChange({ ...group, conditions: newConds });
    };

    const removeCondition = (idx: number) => {
        const newConds = [...group.conditions];
        newConds.splice(idx, 1);
        onChange({ ...group, conditions: newConds });
    };

    const updateSubGroup = (idx: number, updatedSubGroup: LogicGroup) => {
        const newGroups = [...(group.groups || [])];
        newGroups[idx] = updatedSubGroup;
        onChange({ ...group, groups: newGroups });
    };

    const removeSubGroup = (idx: number) => {
        const newGroups = [...(group.groups || [])];
        newGroups.splice(idx, 1);
        onChange({ ...group, groups: newGroups });
    };

    const toggleOperator = () => {
        onChange({ ...group, operator: group.operator === 'AND' ? 'OR' : 'AND' });
    };

    // Determine Logic Color based on depth/operator
    const borderColor = depth === 0 ? 'border-gray-200' : group.operator === 'AND' ? 'border-sw-teal/30' : 'border-sw-purpleLight';
    const bgColor = depth === 0 ? 'bg-gray-50/50' : 'bg-white';

    return (
        <div className={`border rounded-xl p-3 relative ${borderColor} ${bgColor} ${depth > 0 ? 'ml-6 mt-4 shadow-sm' : ''}`}>
            {/* Connector Line for nested groups */}
            {depth > 0 && (
                <div className={`absolute -left-6 top-6 w-6 h-0.5 ${group.operator === 'AND' ? 'bg-sw-teal/30' : 'bg-sw-purpleLight'}`}></div>
            )}

            {/* Group Header */}
            <div className="flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-center">
                    <button 
                      onClick={toggleOperator}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors border shadow-sm ${
                          group.operator === 'AND' 
                          ? 'bg-sw-teal text-white border-sw-teal' 
                          : 'bg-white text-sw-teal border-sw-teal'
                      }`}
                      title="Click to toggle between matching ALL conditions or ANY condition"
                    >
                        {group.operator === 'AND' ? 'Match ALL (AND)' : 'Match ANY (OR)'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={addCondition} className="text-[10px] bg-white text-gray-700 border border-gray-300 px-2 py-1.5 rounded hover:border-sw-teal hover:text-sw-teal transition-colors flex items-center gap-1 shadow-sm">
                            <Plus size={12} /> Condition
                        </button>
                        <button onClick={addSubGroup} className="text-[10px] bg-white text-gray-700 border border-gray-300 px-2 py-1.5 rounded hover:border-sw-teal hover:text-sw-teal transition-colors flex items-center gap-1 shadow-sm">
                            <Plus size={12} /> Group
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {group.conditions.length === 0 && (!group.groups || group.groups.length === 0) && (
                <div className="text-xs text-gray-400 italic text-center py-4 border-2 border-dashed border-gray-100 rounded-lg bg-white">
                    No rules defined. Add a condition to start.
                </div>
            )}

            {/* Conditions List */}
            <div className="space-y-3">
                {group.conditions.map((cond, idx) => {
                    const targetEl = availableTargets.find(t => t.id === cond.targetElementId);
                    
                    // Logic to check if we should show a dropdown for the Value field
                    let valueOptions: string[] = [];
                    const isSelectOrRadio = targetEl && (targetEl.type === 'select' || targetEl.type === 'radio');
                    
                    if (isSelectOrRadio) {
                        if (Array.isArray(targetEl.options)) {
                            valueOptions = targetEl.options;
                        } else if (typeof targetEl.options === 'string') {
                            valueOptions = (targetEl.options as string).split(',');
                        }
                    }

                    const showValueDropdown = isSelectOrRadio && valueOptions.length > 0;

                    return (
                        <div key={cond.id || idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                            <button 
                                onClick={() => removeCondition(idx)} 
                                className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-sw-red border border-gray-200 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Remove Condition"
                            >
                                <X size={12} />
                            </button>
                            
                            {/* 2-Row Grid Layout for Inputs */}
                            <div className="flex flex-col gap-2">
                                {/* Row 1: Field & Operator */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Field</label>
                                        <select 
                                            className="w-full p-2 rounded border border-gray-300 text-xs bg-white text-gray-900 focus:ring-1 focus:ring-sw-teal focus:border-sw-teal shadow-sm"
                                            value={cond.targetElementId}
                                            onChange={(e) => updateCondition(idx, 'targetElementId', e.target.value)}
                                        >
                                            <option value="">Select Field...</option>
                                            {availableTargets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Operator</label>
                                        <select 
                                            className="w-full p-2 rounded border border-gray-300 text-xs bg-white text-gray-900 focus:ring-1 focus:ring-sw-teal focus:border-sw-teal shadow-sm"
                                            value={cond.operator}
                                            onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                                        >
                                            <option value="equals">Equals</option>
                                            <option value="notEquals">Doesn't Equal</option>
                                            <option value="contains">Contains</option>
                                            <option value="greaterThan">Greater Than &gt;</option>
                                            <option value="lessThan">Less Than &lt;</option>
                                            <option value="isNotEmpty">Is Populated</option>
                                            <option value="isEmpty">Is Empty</option>
                                            <option value="dateInLast">Date in last (days)</option>
                                            <option value="dateInNext">Date in next (days)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Value (Full Width) */}
                                {cond.operator !== 'isEmpty' && cond.operator !== 'isNotEmpty' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Value</label>
                                        {showValueDropdown ? (
                                            <select
                                                className="w-full p-2 rounded border border-gray-300 text-xs bg-white text-gray-900 focus:ring-1 focus:ring-sw-teal focus:border-sw-teal shadow-sm"
                                                value={String(cond.value)}
                                                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                                            >
                                                <option value="">Select Value...</option>
                                                {valueOptions.map((opt: string, i: number) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                className="w-full p-2 rounded border border-gray-300 text-xs bg-white text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-sw-teal focus:border-sw-teal shadow-sm"
                                                value={String(cond.value)}
                                                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                                                placeholder="Value to match..."
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recursive Sub-Groups */}
            {group.groups && group.groups.length > 0 && (
                <div className="mt-3 space-y-4">
                    {group.groups.map((subGroup, idx) => (
                        <div key={subGroup.id || idx} className="relative">
                            <button 
                                onClick={() => removeSubGroup(idx)}
                                className="absolute top-2 right-2 z-10 text-gray-300 hover:text-sw-red p-1 bg-white rounded-full shadow-sm border border-gray-100"
                                title="Remove Group"
                            >
                                <Trash2 size={12} />
                            </button>
                            <LogicBuilder 
                                group={subGroup} 
                                onChange={(g) => updateSubGroup(idx, g)} 
                                depth={depth + 1}
                                availableTargets={availableTargets}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
