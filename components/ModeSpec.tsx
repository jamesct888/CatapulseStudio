
import React from 'react';
import { ProcessDefinition } from '../types';
import { CatapulseLogo } from '../App';
import { getValidationRegexString } from '../utils/logic';

export const ModeSpec: React.FC<{ processDef: ProcessDefinition, allElements: any[] }> = ({ processDef, allElements }) => {
    return (
        <div className="max-w-5xl mx-auto py-12 px-8 bg-white shadow-2xl min-h-screen my-8 rounded-xl print:shadow-none print:m-0">
            <div className="border-b-2 border-sw-teal pb-8 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-serif text-sw-teal mb-2">{processDef.name}</h1>
                    <p className="text-gray-500 text-lg">{processDef.description}</p>
                </div>
                <div className="text-right">
                    <div className="inline-block bg-sw-lightGray px-4 py-2 rounded-lg">
                        <p className="text-xs font-bold text-gray-400 uppercase">Version</p>
                        <p className="font-mono text-sw-teal">1.0.0-draft</p>
                    </div>
                </div>
            </div>

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
                                                        {el.requiredConditions && el.requiredConditions.length > 0 && <span className="text-xs text-sw-red block">(Conditional)</span>}
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-500 font-mono text-xs">
                                                        {el.visibilityConditions?.map((c, i) => (
                                                            <div key={i}>Show if {allElements.find(e => e.id === c.targetElementId)?.label} {c.operator} {String(c.value)}</div>
                                                        ))}
                                                        {!el.visibilityConditions?.length && '-'}
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
