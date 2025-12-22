
import React from 'react';
import { ElementDefinition, CalculationPart } from '../../types';
import { Calculator, Type, Hash, X, Plus } from 'lucide-react';

interface CalculationBuilderProps {
    element: ElementDefinition;
    allElements: ElementDefinition[];
    onUpdateElement: (updated: ElementDefinition) => void;
}

export const CalculationBuilder: React.FC<CalculationBuilderProps> = ({
    element,
    allElements,
    onUpdateElement
}) => {
    if (element.type !== 'calculated') return null;

    const calcParts = element.calculation || [];
    const availableTargets = allElements.filter(e => e.id !== element.id);
    const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";

    const updateParts = (newParts: CalculationPart[]) => {
        onUpdateElement({ ...element, calculation: newParts });
    };

    const addPart = (type: 'field' | 'constant' | 'operator', value: string) => {
        const newPart: CalculationPart = { id: Date.now().toString(), type, value };
        updateParts([...calcParts, newPart]);
    };

    const removePart = (index: number) => {
        const newParts = [...calcParts];
        newParts.splice(index, 1);
        updateParts(newParts);
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
                <Calculator size={16} className="text-sw-teal" />
                <span className={labelClass.replace('mb-2', 'mb-0')}>Formula Builder</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-300 min-h-[50px] mb-3 flex flex-wrap gap-2 items-center">
                {calcParts.length === 0 && <span className="text-gray-400 text-xs italic">Empty formula...</span>}
                {calcParts.map((part, idx) => {
                    let display = part.value;
                    let bg = 'bg-gray-100';
                    let icon = null;

                    if (part.type === 'field') {
                        const field = allElements.find(e => e.id === part.value);
                        display = field ? `[${field.label}]` : '[Unknown Field]';
                        bg = 'bg-blue-100 text-blue-700 border-blue-200';
                        icon = <Type size={10} />;
                    } else if (part.type === 'operator') {
                        bg = 'bg-orange-100 text-orange-700 border-orange-200 font-bold';
                    } else {
                        bg = 'bg-green-100 text-green-700 border-green-200 font-mono';
                        icon = <Hash size={10} />;
                    }

                    return (
                        <div key={idx} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${bg} group relative cursor-pointer`}>
                            {icon}
                            <span>{display}</span>
                            <button
                                onClick={() => removePart(idx)}
                                className="ml-1 p-0.5 rounded-full hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                    <select
                        className="w-full text-xs p-2 border rounded bg-white"
                        onChange={(e) => {
                            if (e.target.value) {
                                addPart('field', e.target.value);
                                e.target.value = '';
                            }
                        }}
                    >
                        <option value="">+ Add Field...</option>
                        {availableTargets.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div className="col-span-2">
                    <select
                        className="w-full text-xs p-2 border border-green-200 bg-green-50 rounded text-green-700 font-bold"
                        onChange={(e) => {
                            if (e.target.value) {
                                addPart('constant', e.target.value);
                                e.target.value = '';
                            }
                        }}
                    >
                        <option value="">+ Quick Add System Value...</option>
                        <option value="TODAY">TODAY (Current Date)</option>
                        <option value="NOW">NOW (Date & Time)</option>
                    </select>
                </div>
                <div className="flex gap-1">
                    {['+', '-', '*', '/'].map(op => (
                        <button
                            key={op}
                            onClick={() => addPart('operator', op)}
                            className="flex-1 bg-white border border-gray-300 rounded hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 font-bold py-1"
                        >
                            {op}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1">
                    <input
                        type="text"
                        placeholder="Value"
                        className="w-20 text-xs p-1 border rounded"
                        id="calc-const-input"
                    />
                    <button
                        onClick={() => {
                            const el = document.getElementById('calc-const-input') as HTMLInputElement;
                            if (el.value) {
                                addPart('constant', el.value);
                                el.value = '';
                            }
                        }}
                        className="flex-1 bg-white border border-gray-300 rounded hover:bg-green-50 hover:border-green-200 hover:text-green-600 text-xs font-bold"
                    >
                        Add Const
                    </button>
                </div>
            </div>
        </div>
    );
};
