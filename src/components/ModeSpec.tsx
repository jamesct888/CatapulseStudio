
import React from 'react';
import { ProcessDefinition, LogicGroup, Condition, ElementDefinition } from '../types';
import { CatapulseLogo } from './Shared';
import { getValidationRegexString } from '../utils/logic';
import { generateFigmaSVG } from '../services/figmaExporter';
import { Figma, Users, Briefcase } from 'lucide-react';

export const ModeSpec: React.FC<{ processDef: ProcessDefinition, allElements: ElementDefinition[] }> = ({ processDef, allElements }) => {
    
    const handleFigmaExport = () => {
        const svgContent = generateFigmaSVG(processDef);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${processDef.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_wireframes.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // --- Logic Formatter for Matrix Headers ---
    const formatCondition = (c: Condition): string => {
        const el = allElements.find(e => e.id === c.targetElementId);
        const label = el ? el.label : 'Unknown Field';
        
        switch (c.operator) {
            case 'equals': return `${label} = '${c.value}'`;
            case 'notEquals': return `${label} != '${c.value}'`;
            case 'greaterThan': return `${label} > ${c.value}`;
            case 'lessThan': return `${label} < ${c.value}`;
            case 'contains': return `${label} contains '${c.value}'`;
            case 'isEmpty': return `${label} is empty`;
            case 'isNotEmpty': return `${label} is populated`;
            default: return `${label} ${c.operator} ${c.value}`;
        }
    };

    const formatLogicGroup = (g: LogicGroup): string => {
        if (!g.conditions.length && (!g.groups || !g.groups.length)) return 'Always';
        
        const conds = g.conditions.map(formatCondition);
        const subGroups = g.groups ? g.groups.map(sg => `(${formatLogicGroup(sg)})`) : [];
        const all = [...conds, ...subGroups];
        
        return all.join(` ${g.operator} `);
    };

    // 1. Gather all unique logic signatures (Criteria) to form the X-Axis columns
    const distinctCriteria: string[] = Array.from(new Set(
        processDef.stages.flatMap(s => 
            s.skillLogic?.map(rule => formatLogicGroup(rule.logic)) || []
        )
    )).filter((c): c is string => !!c);

    return (
        <div className="max-w-5xl mx-auto py-12 px-8 bg-white shadow-2xl min-h-screen my-8 rounded-xl print:shadow-none print:m-0">
            <div className="border-b-2 border-sw-teal pb-8 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-serif text-sw-teal mb-2">{processDef.name}</h1>
                    <p className="text-gray-500 text-lg">{processDef.description}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="inline-block bg-sw-lightGray px-4 py-2 rounded-lg">
                        <p className="text-xs font-bold text-gray-400 uppercase">Version</p>
                        <p className="font-mono text-sw-teal">1.0.0-draft</p>
                    </div>
                    <button 
                        onClick={handleFigmaExport}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-all text-sm shadow-md"
                        title="Download as SVG to import into Figma"
                    >
                        <Figma size={16} /> Export to Figma
                    </button>
                </div>
            </div>

            {/* --- OPERATIONAL SKILLS MATRIX --- */}
            <div className="mb-16 break-inside-avoid">
                <h2 className="text-2xl font-bold text-sw-teal mb-6 flex items-center gap-3">
                    <span className="bg-sw-teal text-white w-8 h-8 rounded-full flex items-center justify-center">
                        <Users size={18} />
                    </span>
                    Operational Skills Matrix
                </h2>
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sw-lightGray border-b border-gray-200">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px] sticky left-0 bg-sw-lightGray z-10">
                                    Stage Name
                                </th>
                                <th className="p-4 text-xs font-bold text-sw-teal uppercase tracking-wider border-r border-gray-200 min-w-[150px] bg-sw-teal/5">
                                    Default Skill
                                </th>
                                {distinctCriteria.map((criteria, idx) => (
                                    <th key={idx} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px]">
                                        {criteria}
                                    </th>
                                ))}
                                {distinctCriteria.length === 0 && (
                                    <th className="p-4 text-xs font-bold text-gray-400 italic font-normal">No conditional logic defined</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {processDef.stages.map((stage, idx) => (
                                <tr key={stage.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50">
                                        {idx + 1}. {stage.title}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 border-r border-gray-100 bg-sw-teal/5 font-medium">
                                        {stage.defaultSkill ? (
                                            <span className="flex items-center gap-2">
                                                <Briefcase size={14} className="text-sw-teal/50" />
                                                {stage.defaultSkill}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 italic">Unassigned</span>
                                        )}
                                    </td>
                                    {distinctCriteria.map((criteria, cIdx) => {
                                        // Find if this stage has a rule that matches this criteria string
                                        const matchingRule = stage.skillLogic?.find(r => formatLogicGroup(r.logic) === criteria);
                                        
                                        return (
                                            <td key={cIdx} className="p-4 text-sm border-r border-gray-100">
                                                {matchingRule ? (
                                                    <span className="bg-sw-teal text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                                                        <Briefcase size={10} />
                                                        {matchingRule.requiredSkill}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-200 text-xs">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {distinctCriteria.length === 0 && <td></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- SCREEN SPECIFICATIONS --- */}
            <div className="space-y-12">
                {processDef.stages.map((stage, sIdx) => (
                    <div key={stage.id} className="break-inside-avoid">
                        <h2 className="text-2xl font-bold text-sw-teal mb-6 flex items-center gap-3">
                            <span className="bg-sw-teal text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">{sIdx + 1}</span>
                            {stage.title}
                        </h2>
                        
                        {stage.sections.map(section => (
                            <div key={section.id} className="mb-8 ml-11">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-100 pb-2">{section.title}</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-gray-100">
                                            <th className="py-2 text-xs font-bold text-gray-400 uppercase w-1/4">Field Label</th>
                                            <th className="py-2 text-xs font-bold text-gray-400 uppercase w-1/6">Type</th>
                                            <th className="py-2 text-xs font-bold text-gray-400 uppercase w-1/6">Mandatory</th>
                                            <th className="py-2 text-xs font-bold text-gray-400 uppercase w-1/4">Logic / Visibility</th>
                                            <th className="py-2 text-xs font-bold text-gray-400 uppercase w-1/6">Validation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.elements.map(el => {
                                            const validationRegex = el.validation?.type && el.validation.type !== 'none' ? getValidationRegexString(el.validation.type) : null;
                                            return (
                                                <tr key={el.id} className="border-b border-gray-50">
                                                    <td className="py-3 font-medium text-gray-800">{el.label}</td>
                                                    <td className="py-3 text-sm text-gray-500 capitalize">{el.type}</td>
                                                    <td className="py-3 text-sm">
                                                        {el.required ? <span className="text-sw-red font-bold">Yes</span> : 'No'}
                                                        {el.requiredLogic && el.requiredLogic.conditions.length > 0 && <span className="text-xs text-sw-red block">(Conditional)</span>}
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-500 font-mono text-xs">
                                                        {el.visibility?.conditions.map((c, i) => (
                                                            <div key={i}>Show if {allElements.find(e => e.id === c.targetElementId)?.label} {c.operator} {String(c.value)}</div>
                                                        ))}
                                                        {(!el.visibility || el.visibility.conditions.length === 0) && '-'}
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-500">
                                                        {el.validation?.type !== 'none' && el.validation ? (
                                                            <div>
                                                                <span className="font-bold text-xs bg-gray-100 px-1 rounded">{el.validation.type}</span>
                                                                {validationRegex && (
                                                                    <div className="mt-1 text-[10px] font-mono bg-gray-50 p-1 border rounded break-all">
                                                                        {validationRegex}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            
            <div className="mt-20 pt-8 border-t border-gray-200 flex justify-between items-center text-gray-400">
                <CatapulseLogo theme="light" scale={0.8} />
                <p className="text-xs">Generated by Catapulse Process Engine • Confidential</p>
            </div>
        </div>
    );
};
