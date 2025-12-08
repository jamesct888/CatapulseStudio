
import React, { useState } from 'react';
import { ProcessDefinition, ElementDefinition, DataObjectSuggestion, StageDefinition, LogicGroup, Condition } from '../types';
import { Rocket, Hammer, Copy, Database, Sparkles, ArrowRight, Edit2, Check, RefreshCw, Table as TableIcon, ClipboardList } from 'lucide-react';
import { CatapulseLogo } from './Shared';
import { generateDataMapping } from '../services/geminiService';

interface ModePegaProps {
    processDef: ProcessDefinition;
    pegaTab: 'blueprint' | 'manual' | 'data' | 'logic';
    setPegaTab: (val: 'blueprint' | 'manual' | 'data' | 'logic') => void;
}

export const ModePega: React.FC<ModePegaProps> = ({ processDef, pegaTab, setPegaTab }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dataSuggestions, setDataSuggestions] = useState<DataObjectSuggestion[]>([]);
    const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
    const [tempClassName, setTempClassName] = useState('');
    const [selectedDecisionStage, setSelectedDecisionStage] = useState<string>(processDef.stages[0]?.id || '');

    const handleAnalyzeData = async () => {
        setIsAnalyzing(true);
        // Gather all elements
        const allElements = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements).map(e => ({ id: e.id, label: e.label, type: e.type }));
        const suggestions = await generateDataMapping(allElements);
        setDataSuggestions(suggestions);
        setIsAnalyzing(false);
    };

    const handleSaveClassName = (index: number) => {
        const newSuggestions = [...dataSuggestions];
        newSuggestions[index].className = tempClassName;
        setDataSuggestions(newSuggestions);
        setEditingClassIndex(null);
    };

    // Helper to find element details for display
    const getElementDetails = (id: string) => {
        for (const s of processDef.stages) {
            for (const sec of s.sections) {
                const el = sec.elements.find(e => e.id === id);
                if (el) return el;
            }
        }
        return null;
    };

    // --- Decision Table Logic ---
    const getFlattenedLogic = (stage: StageDefinition) => {
        if (!stage.skillLogic || stage.skillLogic.length === 0) return null;

        const allElements = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);

        // 1. Identify all unique columns (Input Conditions)
        const uniqueConditionFieldIds = new Set<string>();
        stage.skillLogic.forEach(rule => {
            const traverse = (g: LogicGroup) => {
                g.conditions.forEach(c => uniqueConditionFieldIds.add(c.targetElementId));
                g.groups?.forEach(traverse);
            }
            traverse(rule.logic);
        });
        const columns = Array.from(uniqueConditionFieldIds).map(id => {
            const el = allElements.find(e => e.id === id);
            return { id, label: el ? el.label : 'Unknown Field' };
        });

        // 2. Build Rows
        const rows = stage.skillLogic.map(rule => {
            const rowData: {[key: string]: string} = {};
            
            const traverse = (g: LogicGroup) => {
                g.conditions.forEach(c => {
                    const opMap: Record<string, string> = {
                        'equals': '=',
                        'notEquals': '!=',
                        'greaterThan': '>',
                        'lessThan': '<',
                        'contains': 'contains',
                        'isEmpty': 'is empty',
                        'isNotEmpty': 'is populated'
                    };
                    const opSymbol = opMap[c.operator] || c.operator;
                    
                    const valStr = (c.operator === 'isEmpty' || c.operator === 'isNotEmpty') 
                        ? opSymbol 
                        : `${opSymbol} "${c.value}"`;

                    // Aggregate conditions if multiple exist for the same field (e.g. > 5 AND < 10)
                    if (rowData[c.targetElementId]) {
                        rowData[c.targetElementId] += ` AND ${valStr}`;
                    } else {
                        rowData[c.targetElementId] = valStr;
                    }
                });
                g.groups?.forEach(traverse);
            }
            traverse(rule.logic);
            
            return {
                inputs: rowData,
                result: rule.requiredSkill
            };
        });

        return { columns, rows };
    };
    
    const handleCopyTable = (tableData: any) => {
        if (!tableData) return;
        const headers = [...tableData.columns.map((c:any) => c.label), "Return"];
        const rows = tableData.rows.map((r:any) => {
            return [...tableData.columns.map((c:any) => r.inputs[c.id] || ""), r.result];
        });
        
        const csv = [headers.join("\t"), ...rows.map((r:any) => r.join("\t"))].join("\n");
        navigator.clipboard.writeText(csv);
        alert("Table copied to clipboard (Tab Separated). You can paste this directly into Excel or Pega.");
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-6">
            <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-lg inline-flex mx-auto sticky top-4 z-20 shadow-sm border border-gray-200">
                 <button 
                    onClick={() => setPegaTab('blueprint')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'blueprint' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Blueprint Generator
                 </button>
                 <button 
                    onClick={() => setPegaTab('manual')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'manual' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Implementation Guide
                 </button>
                 <button 
                    onClick={() => setPegaTab('data')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'data' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    <Database size={14}/> Data Dictionary
                 </button>
                 <button 
                    onClick={() => setPegaTab('logic')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'logic' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    <TableIcon size={14}/> Logic & Decisions
                 </button>
            </div>
  
            {pegaTab === 'blueprint' && (
                <div className="bg-white rounded-xl shadow-card border border-gray-200 p-8 text-center animate-in fade-in">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Rocket size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Pega GenAI Blueprint™ Prompt</h2>
                    <p className="text-gray-500 mb-8 max-w-lg mx-auto">
                        Copy the generated prompt below and paste it into Pega GenAI Blueprint to instantly scaffold this application structure.
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left font-mono text-sm text-gray-600 overflow-x-auto mb-6 whitespace-pre-wrap">
                        {`Create a Case Type named "${processDef.name}".
                        
  Description: ${processDef.description}
  
  Stages:
  ${processDef.stages.map(s => `- ${s.title}`).join('\n')}
  
  Data Model:
  ${processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements).map(el => `- ${el.label} (${el.type})`).join('\n')}
                        `}
                    </div>
                    
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                        <Copy size={18} /> Copy to Clipboard
                    </button>
                </div>
            )}
            
            {pegaTab === 'manual' && (
                <div className="bg-white rounded-xl shadow-card border border-gray-200 p-8 animate-in fade-in">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Hammer size={20} /> Developer Implementation Guide
                    </h2>
                    <div className="space-y-4">
                        {processDef.stages.map(stage => (
                            <div key={stage.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 font-bold text-sm text-gray-600 border-b border-gray-100">
                                    Stage: {stage.title}
                                </div>
                                <div className="p-4">
                                    <ul className="space-y-2">
                                        {stage.sections.map(sec => (
                                            <li key={sec.id} className="text-sm">
                                                <span className="font-bold text-sw-teal">{sec.title}</span> maps to <code className="bg-gray-100 px-1 rounded text-xs">Rule-HTML-Section</code> with {sec.layout} template.
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pegaTab === 'data' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Header Card */}
                    <div className="bg-sw-teal rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Database/> Data Object Normalizer</h2>
                            <p className="opacity-80 max-w-xl">
                                Automatically group flat form fields into reusable Data Objects (Classes). 
                                Map these to your existing framework to ensure compliance.
                            </p>
                            
                            <button 
                                onClick={handleAnalyzeData}
                                disabled={isAnalyzing}
                                className="mt-6 bg-white text-sw-teal px-6 py-3 rounded-lg font-bold hover:bg-sw-lightGray transition-colors flex items-center gap-2 shadow-lg"
                            >
                                {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {dataSuggestions.length > 0 ? 'Re-Analyze Data Model' : 'Analyze & Map to Common Data Model'}
                            </button>
                        </div>
                        <Database size={120} className="absolute -right-6 -bottom-6 opacity-10" />
                    </div>

                    {/* Results Grid */}
                    {dataSuggestions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {dataSuggestions.map((group, idx) => (
                                <div key={idx} className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-sw-purpleLight rounded text-sw-teal">
                                                <Database size={16} />
                                            </div>
                                            {editingClassIndex === idx ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        autoFocus
                                                        type="text" 
                                                        value={tempClassName} 
                                                        onChange={(e) => setTempClassName(e.target.value)}
                                                        className="text-sm font-bold border border-sw-teal rounded px-2 py-1"
                                                    />
                                                    <button onClick={() => handleSaveClassName(idx)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2 cursor-pointer hover:text-sw-teal" onClick={() => { setTempClassName(group.className); setEditingClassIndex(idx); }}>
                                                        {group.className} <Edit2 size={12} className="opacity-30" />
                                                    </h3>
                                                    <p className="text-xs text-gray-500">Reusable Data Type</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 flex-1">
                                        <p className="text-xs text-gray-500 mb-4 italic">{group.description}</p>
                                        <div className="space-y-2">
                                            {group.mappings.map((mapping, mIdx) => {
                                                const el = getElementDetails(mapping.elementId);
                                                return (
                                                    <div key={mIdx} className="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                            <span className="text-gray-700">{el?.label || 'Unknown Field'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sw-teal font-mono text-xs">
                                                            <ArrowRight size={12} className="text-gray-300" />
                                                            {mapping.suggestedProperty}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 text-center border-t border-gray-200 text-xs text-gray-400 font-medium">
                                        {group.mappings.length} Fields Mapped
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {dataSuggestions.length === 0 && !isAnalyzing && (
                         <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                            <p>No mapping generated yet. Click analyze to start.</p>
                        </div>
                    )}
                </div>
            )}

            {pegaTab === 'logic' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Logic & Decisions</h2>
                            <p className="text-sm text-gray-500">Convert logic to Decision Tables for easy Pega implementation.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Context:</label>
                            <select 
                                value={selectedDecisionStage}
                                onChange={(e) => setSelectedDecisionStage(e.target.value)}
                                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-sw-teal"
                            >
                                {processDef.stages.map(s => <option key={s.id} value={s.id}>Stage: {s.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Table Render */}
                    {(() => {
                        const stage = processDef.stages.find(s => s.id === selectedDecisionStage);
                        const tableData = stage ? getFlattenedLogic(stage) : null;

                        if (!stage || !tableData) {
                            return (
                                <div className="text-center py-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-400 font-medium mb-2">No routing logic defined for this stage.</p>
                                    <p className="text-xs text-gray-400">Add Skill Routing in the Editor -> Properties Panel to see a decision table here.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <TableIcon size={16} className="text-sw-teal" />
                                        <span className="font-bold text-sm text-gray-700">Decision Table: {stage.title} Routing</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopyTable(tableData)}
                                        className="text-xs font-bold bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-sw-teal hover:text-white hover:border-sw-teal transition-colors flex items-center gap-2"
                                    >
                                        <ClipboardList size={14} /> Copy for Pega/Excel
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="p-1 w-12 text-center bg-gray-100 border border-gray-200 text-xs font-mono text-gray-400">#</th>
                                                {/* Conditions Header */}
                                                {tableData.columns.map(col => (
                                                    <th key={col.id} className="p-0 border border-gray-200 min-w-[150px]">
                                                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase text-center">
                                                            Condition
                                                        </div>
                                                        <div className="px-3 py-2 bg-gray-50 text-sw-teal font-bold text-center">
                                                            {col.label}
                                                        </div>
                                                    </th>
                                                ))}
                                                {/* Actions Header */}
                                                <th className="p-0 border border-gray-200 min-w-[150px] bg-sw-teal/5">
                                                     <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase text-center">
                                                            Return
                                                    </div>
                                                    <div className="px-3 py-2 bg-sw-teal/10 text-sw-teal font-bold text-center">
                                                        Route To
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.rows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="p-2 text-center border border-gray-200 font-mono text-xs text-gray-400 bg-gray-50">{idx + 1}</td>
                                                    {tableData.columns.map(col => (
                                                        <td key={col.id} className="p-2 border border-gray-200 text-center font-mono text-gray-600">
                                                            {row.inputs[col.id] || <span className="text-gray-300">-</span>}
                                                        </td>
                                                    ))}
                                                    <td className="p-2 border border-gray-200 text-center font-bold text-sw-teal bg-sw-teal/5">
                                                        {row.result}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50">
                                                <td className="p-2 text-center border border-gray-200 font-mono text-xs text-gray-400">Else</td>
                                                {tableData.columns.map(col => (
                                                     <td key={col.id} className="p-2 border border-gray-200 text-center text-gray-400 italic">
                                                        Otherwise
                                                     </td>
                                                ))}
                                                 <td className="p-2 border border-gray-200 text-center text-gray-400 italic bg-sw-teal/5">
                                                    {stage.defaultSkill || 'Stop'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center text-gray-400">
                <CatapulseLogo theme="light" scale={0.7} />
                <p className="text-xs">Generated by Catapulse Process Engine</p>
            </div>
        </div>
    );
};
