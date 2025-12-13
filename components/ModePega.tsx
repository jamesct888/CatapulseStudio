
import React, { useState } from 'react';
import { ProcessDefinition, ElementDefinition, DataObjectSuggestion, StageDefinition, LogicGroup, Condition } from '../types';
import { Rocket, Hammer, Copy, Database, Sparkles, ArrowRight, Edit2, Check, RefreshCw, Table as TableIcon, ClipboardList, Eye, ShieldCheck, Layout, GitMerge, FileCode } from 'lucide-react';
import { CatapulseLogo } from './Shared';
import { generateDataMapping } from '../services/geminiService';
import { formatLogicSummary } from '../utils/logic';

interface ModePegaProps {
    processDef: ProcessDefinition;
    pegaTab: 'blueprint' | 'manual' | 'data' | 'logic';
    setPegaTab: (val: 'blueprint' | 'manual' | 'data' | 'logic') => void;
}

type PegaRuleType = 'Rule-Obj-When' | 'Rule-Obj-Validate' | 'Rule-HTML-Section' | 'Rule-Declare-Decision';

interface PegaRuleItem {
    id: string;
    label: string;
    type: PegaRuleType;
    context: string;
    logicDescription: string;
    technicalName: string;
}

export const ModePega: React.FC<ModePegaProps> = ({ processDef, pegaTab, setPegaTab }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dataSuggestions, setDataSuggestions] = useState<DataObjectSuggestion[]>([]);
    const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
    const [tempClassName, setTempClassName] = useState('');
    const [activeRuleFilter, setActiveRuleFilter] = useState<PegaRuleType | 'ALL'>('ALL');

    const handleAnalyzeData = async () => {
        setIsAnalyzing(true);
        try {
            // Gather all elements
            const allElements = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements).map(e => ({ id: e.id, label: e.label, type: e.type }));
            const suggestions = await generateDataMapping(allElements);
            if (suggestions) {
                setDataSuggestions(suggestions);
            } else {
                alert("Could not generate data mapping.");
            }
        } catch (e) {
            console.error(e);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
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

    // --- Rule Extraction Engine ---
    const getRuleInventory = (): PegaRuleItem[] => {
        const rules: PegaRuleItem[] = [];
        const allElements = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements).map(e => ({ id: e.id, label: e.label }));

        processDef.stages.forEach(stage => {
            // 1. Decision Rules (Routing)
            if (stage.skillLogic && stage.skillLogic.length > 0) {
                rules.push({
                    id: `dec_${stage.id}`,
                    label: `${stage.title} Routing`,
                    type: 'Rule-Declare-Decision',
                    context: `Stage: ${stage.title}`,
                    logicDescription: `Routes based on ${stage.skillLogic.length} logic conditions (Decision Table)`,
                    technicalName: `Determine${stage.title.replace(/\s+/g,'')}Routing`
                });
            }

            stage.sections.forEach(section => {
                // 2. Section Rules
                rules.push({
                    id: `sec_${section.id}`,
                    label: section.title,
                    type: 'Rule-HTML-Section',
                    context: `Stage: ${stage.title}`,
                    logicDescription: `Layout: ${section.layout || '1col'}, Variant: ${section.variant || 'Standard'}`,
                    technicalName: section.title.replace(/[^a-zA-Z0-9]/g, '')
                });

                // 3. When Rules (Section Visibility)
                if (section.visibility && (section.visibility.conditions.length > 0 || (section.visibility.groups && section.visibility.groups.length > 0))) {
                    rules.push({
                        id: `when_sec_${section.id}`,
                        label: `${section.title} Visibility`,
                        type: 'Rule-Obj-When',
                        context: `Section: ${section.title}`,
                        logicDescription: formatLogicSummary(section.visibility, allElements),
                        technicalName: `When${section.title.replace(/[^a-zA-Z0-9]/g, '')}Visible`
                    });
                }

                section.elements.forEach(element => {
                    // 4. When Rules (Field Visibility)
                    if (element.visibility && (element.visibility.conditions.length > 0 || (element.visibility.groups && element.visibility.groups.length > 0))) {
                        rules.push({
                            id: `when_el_${element.id}`,
                            label: `${element.label} Visibility`,
                            type: 'Rule-Obj-When',
                            context: `Field: ${element.label}`,
                            logicDescription: formatLogicSummary(element.visibility, allElements),
                            technicalName: `When${element.label.replace(/[^a-zA-Z0-9]/g, '')}Visible`
                        });
                    }

                    // 5. When Rules (Required Logic)
                    if (element.requiredLogic && (element.requiredLogic.conditions.length > 0 || (element.requiredLogic.groups && element.requiredLogic.groups.length > 0))) {
                        rules.push({
                            id: `req_el_${element.id}`,
                            label: `${element.label} Required`,
                            type: 'Rule-Obj-When',
                            context: `Field: ${element.label}`,
                            logicDescription: formatLogicSummary(element.requiredLogic, allElements),
                            technicalName: `When${element.label.replace(/[^a-zA-Z0-9]/g, '')}Required`
                        });
                    }

                    // 6. Validate Rules
                    if (element.validation && element.validation.type !== 'none') {
                        rules.push({
                            id: `val_${element.id}`,
                            label: `${element.label} Validation`,
                            type: 'Rule-Obj-Validate',
                            context: `Field: ${element.label}`,
                            logicDescription: element.validation.type === 'custom' 
                                ? (element.validation.customDescription || 'Custom Logic') 
                                : `Format check: ${element.validation.type}`,
                            technicalName: `Val${element.label.replace(/[^a-zA-Z0-9]/g, '')}`
                        });
                    }
                });
            });
        });

        return rules;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-6">
            <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-lg inline-flex mx-auto sticky top-4 z-20 shadow-sm border border-gray-200">
                 <button 
                    id="tab-pega-blueprint"
                    onClick={() => setPegaTab('blueprint')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'blueprint' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Blueprint Generator
                 </button>
                 <button 
                    id="tab-pega-manual"
                    onClick={() => setPegaTab('manual')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'manual' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    Implementation Guide
                 </button>
                 <button 
                    id="tab-pega-data"
                    onClick={() => setPegaTab('data')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'data' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    <Database size={14}/> Data Dictionary
                 </button>
                 <button 
                    id="tab-pega-logic"
                    onClick={() => setPegaTab('logic')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'logic' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                 >
                    <TableIcon size={14}/> Rule Inventory
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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Technical Rule Inventory</h2>
                            <p className="text-sm text-gray-500">Automatically extracted rule candidates for implementation.</p>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(['ALL', 'Rule-Obj-When', 'Rule-Obj-Validate', 'Rule-HTML-Section', 'Rule-Declare-Decision'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveRuleFilter(f)}
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeRuleFilter === f ? 'bg-white shadow-sm text-sw-teal' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {f === 'ALL' ? 'All Rules' : f.replace('Rule-', '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rules Table */}
                    <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase whitespace-nowrap w-48">Type</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Rule Name / ID</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Context</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase w-1/3">Logic / Configuration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {getRuleInventory()
                                    .filter(r => activeRuleFilter === 'ALL' || r.type === activeRuleFilter)
                                    .map(rule => (
                                    <tr key={rule.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-block text-xs font-medium px-3 py-1.5 rounded-md border shadow-sm ${
                                                rule.type === 'Rule-Obj-When' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                rule.type === 'Rule-Obj-Validate' ? 'bg-red-50 text-red-700 border-red-200' :
                                                rule.type === 'Rule-HTML-Section' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                                {rule.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs font-bold text-sw-teal flex items-center gap-2">
                                                {rule.technicalName}
                                                <button onClick={() => handleCopy(rule.technicalName)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-sw-teal transition-opacity">
                                                    <ClipboardList size={12} />
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">{rule.label}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-600">
                                            {rule.context}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded border border-gray-100 break-words">
                                                {rule.logicDescription}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {getRuleInventory().filter(r => activeRuleFilter === 'ALL' || r.type === activeRuleFilter).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                            No rules found for this category.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center text-gray-400">
                <CatapulseLogo theme="light" scale={0.7} />
                <p className="text-xs">Generated by Catapulse Process Engine</p>
            </div>
        </div>
    );
};
