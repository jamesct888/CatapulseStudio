import React, { useState } from 'react';
import { ProcessDefinition, ElementDefinition, DataObjectSuggestion, StageDefinition, LogicGroup, Condition, CalculationPart } from '../types';
import { Rocket, Hammer, Copy, Database, Sparkles, ArrowRight, Edit2, Check, RefreshCw, Table as TableIcon, ClipboardList, Eye, ShieldCheck, Layout, GitMerge, FileCode, Calculator, Workflow, User, CheckSquare, Mail, Play, AlertTriangle, Briefcase, Grid } from 'lucide-react';
import { CatapulseLogo } from './Shared';
import { generateDataMapping } from '../services/geminiService';
import { formatLogicSummary } from '../utils/logic';

interface ModePegaProps {
    processDef: ProcessDefinition;
    pegaTab: 'design' | 'blueprint' | 'manual' | 'data' | 'logic' | 'routing';
    setPegaTab: (val: 'design' | 'blueprint' | 'manual' | 'data' | 'logic' | 'routing') => void;
}

type PegaRuleType = 'Rule-Obj-When' | 'Rule-Obj-Validate' | 'Rule-HTML-Section' | 'Rule-Declare-Decision' | 'Rule-Declare-Expressions';

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
    const [baseClass, setBaseClass] = useState('MyOrg-MyApp-Work'); // Default base class



    const handleAnalyzeData = async () => {
        setIsAnalyzing(true);
        try {
            // Gather all elements safely
            const stages = processDef?.stages || [];
            const allElements = stages.flatMap(s => s.sections || []).flatMap(sec => sec.elements || []).map(e => ({ id: e.id, label: e.label, type: e.type }));

            if (allElements.length === 0) {
                alert("No fields found to map.");
                return;
            }

            const suggestions = await generateDataMapping(allElements, baseClass);
            if (suggestions && suggestions.length > 0) {
                setDataSuggestions(suggestions);
            } else {
                alert("Could not generate data mapping based on these fields.");
            }
        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please check the console for details.");
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

    const allElementsList = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);

    // --- Rule Extraction Engine ---
    const getRuleInventory = (): PegaRuleItem[] => {
        const rules: PegaRuleItem[] = [];
        const allElements = allElementsList.map(e => ({ id: e.id, label: e.label }));

        const formatCalculation = (parts: CalculationPart[] | undefined) => {
            if (!parts || parts.length === 0) return 'Value set via external logic';
            return parts.map(p => {
                if (p.type === 'operator') return p.value;
                if (p.type === 'constant') return p.value;
                if (p.type === 'field') {
                    const el = allElements.find(e => e.id === p.value);
                    return el ? `.${el.label.replace(/[^a-zA-Z0-9]/g, '')}` : 'UnknownProp';
                }
                return '';
            }).join(' ');
        }

        processDef.stages.forEach(stage => {
            // 1. Decision Rules (Routing)
            if (stage.skillLogic && stage.skillLogic.length > 0) {
                rules.push({
                    id: `dec_${stage.id}`,
                    label: `${stage.title} Routing`,
                    type: 'Rule-Declare-Decision',
                    context: `Stage: ${stage.title}`,
                    logicDescription: `Routes based on ${stage.skillLogic.length} logic conditions (Decision Table)`,
                    technicalName: `Determine${stage.title.replace(/[^a-zA-Z0-9]/g, '')}Routing`
                });
            }

            // 2. Stage Skip Logic (NEW)
            const skipConditions = stage.skipLogic?.conditions || [];
            const skipGroups = stage.skipLogic?.groups || [];
            if (stage.skipLogic && (skipConditions.length > 0 || skipGroups.length > 0)) {
                rules.push({
                    id: `skip_${stage.id}`,
                    label: `${stage.title} Skip Condition`,
                    type: 'Rule-Obj-When',
                    context: `Stage: ${stage.title}`,
                    logicDescription: `SKIP IF: ${formatLogicSummary(stage.skipLogic, allElements)}`,
                    technicalName: `WhenSkip${stage.title.replace(/[^a-zA-Z0-9]/g, '')}`
                });
            }

            stage.sections.forEach(section => {
                // 3. Section Rules
                rules.push({
                    id: `sec_${section.id}`,
                    label: section.title,
                    type: 'Rule-HTML-Section',
                    context: `Stage: ${stage.title}`,
                    logicDescription: `Layout: ${section.layout || '1col'}, Variant: ${section.variant || 'Standard'}`,
                    technicalName: section.title.replace(/[^a-zA-Z0-9]/g, '')
                });

                // 4. When Rules (Section Visibility)
                const secConditions = section.visibility?.conditions || [];
                const secGroups = section.visibility?.groups || [];
                if (section.visibility && (secConditions.length > 0 || secGroups.length > 0)) {
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
                    // 5. When Rules (Field Visibility)
                    const elConditions = element.visibility?.conditions || [];
                    const elGroups = element.visibility?.groups || [];
                    if (element.visibility && (elConditions.length > 0 || elGroups.length > 0)) {
                        rules.push({
                            id: `when_el_${element.id}`,
                            label: `${element.label} Visibility`,
                            type: 'Rule-Obj-When',
                            context: `Field: ${element.label}`,
                            logicDescription: formatLogicSummary(element.visibility, allElements),
                            technicalName: `When${element.label.replace(/[^a-zA-Z0-9]/g, '')}Visible`
                        });
                    }

                    // 6. When Rules (Required Logic)
                    const reqConditions = element.requiredLogic?.conditions || [];
                    const reqGroups = element.requiredLogic?.groups || [];
                    if (element.requiredLogic && (reqConditions.length > 0 || reqGroups.length > 0)) {
                        rules.push({
                            id: `req_el_${element.id}`,
                            label: `${element.label} Required`,
                            type: 'Rule-Obj-When',
                            context: `Field: ${element.label}`,
                            logicDescription: formatLogicSummary(element.requiredLogic, allElements),
                            technicalName: `When${element.label.replace(/[^a-zA-Z0-9]/g, '')}Required`
                        });
                    }

                    // 7. Validate Rules
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

                    // 8. Calculated Fields (Declare Expressions)
                    if (element.type === 'calculated') {
                        rules.push({
                            id: `calc_${element.id}`,
                            label: `${element.label} Calculation`,
                            type: 'Rule-Declare-Expressions',
                            context: `Target: .${element.label.replace(/[^a-zA-Z0-9]/g, '')}`,
                            logicDescription: `Set to: ${formatCalculation(element.calculation)}`,
                            technicalName: `Exp${element.label.replace(/[^a-zA-Z0-9]/g, '')}`
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

    // --- Helper for Matrix Logic Extraction ---
    const getConditionsForField = (group: LogicGroup | undefined, fieldId: string): Condition[] => {
        if (!group) return [];
        let matches: Condition[] = [];

        // Check direct conditions
        if (group.conditions) {
            matches = matches.concat(group.conditions.filter(c => c.targetElementId === fieldId));
        }

        // Check nested groups
        if (group.groups) {
            group.groups.forEach(g => {
                matches = matches.concat(getConditionsForField(g, fieldId));
            });
        }
        return matches;
    };

    const formatOperator = (op: string) => {
        switch (op) {
            case 'equals': return '=';
            case 'notEquals': return '!=';
            case 'greaterThan': return '>';
            case 'lessThan': return '<';
            case 'contains': return 'contains';
            case 'isEmpty': return 'is empty';
            case 'isNotEmpty': return 'is populated';
            default: return op;
        }
    };

    // Calculate Routing Matrix Data: Identify all Fields involved in any skill rule across all stages
    const routingFieldIds: string[] = Array.from(new Set(
        processDef.stages.flatMap(s =>
            s.skillLogic?.flatMap(rule => {
                // deeply extract field IDs from this rule
                const extractIds = (g: LogicGroup): string[] => {
                    const cIds = g.conditions?.map(c => c.targetElementId) || [];
                    const gIds = g.groups?.flatMap(sub => extractIds(sub)) || [];
                    return [...cIds, ...gIds];
                };
                return extractIds(rule.logic);
            }) || []
        )
    ));

    return (
        <div className="max-w-7xl mx-auto py-8 px-6">
            <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-lg inline-flex mx-auto sticky top-4 z-20 shadow-sm border border-gray-200 flex-wrap">
                <button
                    id="tab-pega-design"
                    onClick={() => setPegaTab('design')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'design' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Layout size={14} /> Case Life Cycle
                </button>
                <button
                    id="tab-pega-blueprint"
                    onClick={() => setPegaTab('blueprint')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'blueprint' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Blueprint Generator
                </button>
                <button
                    id="tab-pega-manual"
                    onClick={() => setPegaTab('manual')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${pegaTab === 'manual' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Implementation Guide
                </button>
                <button
                    id="tab-pega-data"
                    onClick={() => setPegaTab('data')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'data' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Database size={14} /> Data Dictionary
                </button>
                <button
                    id="tab-pega-logic"
                    onClick={() => setPegaTab('logic')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'logic' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <TableIcon size={14} /> Rule Inventory
                </button>
                <button
                    id="tab-pega-routing"
                    onClick={() => setPegaTab('routing')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${pegaTab === 'routing' ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Grid size={14} /> Routing Matrix
                </button>
            </div>

            {pegaTab === 'design' && (
                // ... (Design Content) ...
                <div className="overflow-x-auto pb-8">
                    <div className="flex gap-4 min-w-max">
                        {/* Start Node */}
                        <div className="flex flex-col items-center justify-center pt-10 px-4">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-md border-4 border-green-100">
                                <Play size={16} fill="currentColor" />
                            </div>
                            <span className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">Create</span>
                        </div>

                        {/* Stages */}
                        {processDef.stages.map((stage, idx) => {
                            const skipConditions = stage.skipLogic?.conditions || [];
                            const skipGroups = stage.skipLogic?.groups || [];
                            const hasSkipLogic = stage.skipLogic && (skipConditions.length > 0 || skipGroups.length > 0);

                            return (
                                <div key={stage.id} className="w-80 flex flex-col shrink-0 group">
                                    {/* Stage Header (Chevron Style) */}
                                    <div className="h-10 bg-white border border-gray-200 flex items-center px-4 relative mb-4 shadow-sm group-hover:border-sw-teal/50 transition-colors">
                                        <div className="font-bold text-gray-700 text-sm truncate uppercase tracking-tight flex items-center gap-2">
                                            <div className="w-5 h-5 bg-sw-teal text-white rounded-full flex items-center justify-center text-[10px]">{idx + 1}</div>
                                            {stage.title}
                                        </div>

                                        {/* Chevron Right */}
                                        <div className="absolute top-0 bottom-0 -right-3 w-4 overflow-hidden z-10">
                                            <div className="h-10 bg-white border-t border-r border-gray-200 transform -rotate-45 origin-top-left translate-y-1.5 group-hover:border-sw-teal/50 transition-colors"></div>
                                        </div>
                                        {/* Chevron Left Cutout (Visual Hack) */}
                                        {idx > 0 && <div className="absolute top-0 bottom-0 left-0 w-4 bg-gray-50 transform -skew-x-12 -translate-x-2 border-r border-gray-200"></div>}
                                    </div>

                                    {/* Stage Body - Process Column */}
                                    <div className="bg-gray-100/50 border border-gray-200 border-dashed rounded-lg p-3 min-h-[400px] flex flex-col gap-3 relative">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute top-1 right-2">Primary Stage</span>

                                        {/* Process Container */}
                                        <div className="bg-white border border-gray-200 rounded shadow-sm p-1">
                                            <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                                                <Workflow size={14} className="text-blue-500" />
                                                <span className="text-xs font-bold text-gray-600">Process</span>
                                            </div>
                                            <div className="p-2 flex flex-col gap-2 relative">
                                                {/* Vertical Process Line */}
                                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                                                {/* Sections mapped to Steps */}
                                                {stage.sections.map((section, sIdx) => (
                                                    <div key={section.id} className="relative z-10 flex gap-2 items-start">
                                                        <div className="w-4 h-4 bg-green-500 rounded border-2 border-white shadow-sm mt-2 shrink-0 flex items-center justify-center">
                                                            <CheckSquare size={10} className="text-white" strokeWidth={3} />
                                                        </div>
                                                        <div className="flex-1 bg-white border border-gray-200 hover:border-sw-teal rounded p-2 shadow-sm cursor-default transition-all group/step">
                                                            <div className="text-xs font-bold text-gray-800">{section.title}</div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                                <User size={10} />
                                                                {stage.defaultSkill || 'Case Worker'}
                                                            </div>
                                                            <div className="text-[9px] text-gray-300 mt-1 uppercase tracking-wider">{section.elements.length} Fields</div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Simulated Automation Steps based on Logic */}
                                                {stage.skillLogic && stage.skillLogic.length > 0 && (
                                                    <div className="relative z-10 flex gap-2 items-start">
                                                        <div className="w-4 h-4 bg-orange-400 rounded border-2 border-white shadow-sm mt-2 shrink-0 flex items-center justify-center">
                                                            <GitMerge size={10} className="text-white" />
                                                        </div>
                                                        <div className="flex-1 bg-orange-50 border border-orange-200 rounded p-2 shadow-sm">
                                                            <div className="text-xs font-bold text-orange-800">Route Case</div>
                                                            <div className="text-[10px] text-orange-600 mt-0.5">Decision Table</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Email Step Placeholder */}
                                                <div className="relative z-10 flex gap-2 items-start opacity-60 hover:opacity-100 transition-opacity">
                                                    <div className="w-4 h-4 bg-blue-400 rounded border-2 border-white shadow-sm mt-2 shrink-0 flex items-center justify-center">
                                                        <Mail size={10} className="text-white" />
                                                    </div>
                                                    <div className="flex-1 bg-gray-50 border border-gray-200 border-dashed rounded p-2">
                                                        <div className="text-xs font-bold text-gray-500">Send Notification</div>
                                                        <div className="text-[10px] text-gray-400">Optional Action</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alternate Paths Visual (if Skip Logic exists) */}
                                        {hasSkipLogic && (
                                            <div className="mt-auto border-t-2 border-amber-200 pt-2">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 mb-1">
                                                    <AlertTriangle size={10} /> Conditional Skip
                                                </div>
                                                <div className="bg-amber-50 text-[10px] text-amber-800 p-2 rounded border border-amber-100">
                                                    Skipped if logic met.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* End Node */}
                        <div className="flex flex-col items-center justify-center pt-10 px-4">
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-md border-4 border-gray-200">
                                <div className="w-4 h-4 bg-white rounded-sm"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">Resolve</span>
                        </div>
                    </div>
                </div>
            )}

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



                    {/* Data Object Normalizer Header Card */}
                    <div className="bg-sw-teal rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Database /> Data Object Normalizer</h2>
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

                        {/* Base Class Input Overlay */}
                        <div className="absolute top-6 right-6 z-20 bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20">
                            <label className="block text-[10px] uppercase font-bold text-white/80 mb-1">Base Class Context</label>
                            <input
                                type="text"
                                value={baseClass}
                                onChange={(e) => setBaseClass(e.target.value)}
                                className="bg-black/20 text-white border border-white/30 rounded px-2 py-1 text-xs font-mono w-48 focus:outline-none focus:border-white"
                                placeholder="Org-App-Work"
                            />
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
                                                    <button onClick={() => handleSaveClassName(idx)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
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
                                            {(group.mappings || []).map((mapping, mIdx) => {
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
                                        {(group.mappings || []).length} Fields Mapped
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
                        <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap">
                            {(['ALL', 'Rule-Obj-When', 'Rule-Obj-Validate', 'Rule-HTML-Section', 'Rule-Declare-Decision', 'Rule-Declare-Expressions'] as const).map(f => (
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
                                                <span className={`inline-block text-xs font-medium px-3 py-1.5 rounded-md border shadow-sm ${rule.type === 'Rule-Obj-When' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    rule.type === 'Rule-Obj-Validate' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        rule.type === 'Rule-HTML-Section' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            rule.type === 'Rule-Declare-Expressions' ? 'bg-teal-50 text-teal-700 border-teal-200' :
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

            {pegaTab === 'routing' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Routing Decision Matrix</h2>
                                <p className="text-sm text-gray-500">Mapping stage routing rules to properties (Decision Table Representation).</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px] sticky left-0 bg-gray-100 z-10">
                                            Stage (Assignment)
                                        </th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[150px]">
                                            Default Route
                                        </th>
                                        {routingFieldIds.map((fieldId, idx) => {
                                            const fieldLabel = allElementsList.find(e => e.id === fieldId)?.label || 'Unknown Field';
                                            return (
                                                <th key={idx} className="p-4 text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[200px] bg-sw-teal/5">
                                                    {fieldLabel}
                                                </th>
                                            );
                                        })}
                                        <th className="p-4 text-xs font-bold text-sw-teal uppercase tracking-wider border-l border-gray-200 min-w-[150px] bg-sw-teal/10">
                                            Return (Route To)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processDef.stages.map((stage) => {
                                        const rules = stage.skillLogic && stage.skillLogic.length > 0 ? stage.skillLogic : null;

                                        if (!rules) {
                                            // Render single empty row for stage with no logic
                                            return (
                                                <tr key={stage.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                    <td className="p-4 font-bold text-gray-800 border-r border-gray-100 sticky left-0 bg-white">
                                                        {stage.title}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 border-r border-gray-100 font-medium">
                                                        {stage.defaultSkill || <span className="text-gray-300 italic">Unassigned</span>}
                                                    </td>
                                                    {routingFieldIds.map((_, i) => <td key={i} className="border-r border-gray-100"></td>)}
                                                    <td className="border-l border-gray-100"></td>
                                                </tr>
                                            );
                                        }

                                        // Render row per rule
                                        return rules.map((rule, ruleIdx) => (
                                            <tr key={`${stage.id}_rule_${ruleIdx}`} className="border-b border-gray-50 hover:bg-gray-50">
                                                {ruleIdx === 0 && (
                                                    <>
                                                        <td className="p-4 font-bold text-gray-800 border-r border-gray-100 sticky left-0 bg-white align-top" rowSpan={rules.length}>
                                                            {stage.title}
                                                        </td>
                                                        <td className="p-4 text-sm text-gray-600 border-r border-gray-100 font-medium align-top" rowSpan={rules.length}>
                                                            {stage.defaultSkill || <span className="text-gray-300 italic">Unassigned</span>}
                                                        </td>
                                                    </>
                                                )}
                                                {routingFieldIds.map((fieldId, cIdx) => {
                                                    const conds = getConditionsForField(rule.logic, fieldId);
                                                    return (
                                                        <td key={cIdx} className="p-4 text-sm border-r border-gray-100 bg-white">
                                                            {conds.length > 0 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {conds.map((c, i) => (
                                                                        <div key={i} className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                                            <span className="font-bold text-sw-teal mr-1">{formatOperator(c.operator)}</span>
                                                                            {c.operator !== 'isEmpty' && c.operator !== 'isNotEmpty' && String(c.value)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-200 text-xs">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-sm font-bold text-sw-teal border-l border-gray-100 bg-sw-teal/5">
                                                    {rule.requiredSkill}
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
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