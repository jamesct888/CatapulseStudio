
import React from 'react';
import { StageDefinition, SkillRule, LogicGroup, ElementDefinition } from '../../types';
import { ModalWrapper } from '../ModalWrapper';
import { LogicBuilder } from '../LogicBuilder';
import { Briefcase, GitMerge, ShieldCheck } from 'lucide-react';

interface SkillLogicModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: StageDefinition | null;
    onUpdateStage: (updated: StageDefinition) => void;
    activeRuleIndex: number | null;
    modalSize: { width: number, height: number };
    onResizeStart: () => void;
    availableTargets: ElementDefinition[];
}

const COMMON_SKILLS = [
    "Customer Service",
    "Senior Underwriter",
    "Compliance Officer",
    "Claims Handler",
    "Finance Manager",
    "System Admin"
];

export const SkillLogicModal: React.FC<SkillLogicModalProps> = ({
    isOpen, onClose, stage, onUpdateStage, activeRuleIndex, modalSize, onResizeStart, availableTargets
}) => {
    if (!isOpen || activeRuleIndex === null || !stage) return null;
    const rule = stage.skillLogic?.[activeRuleIndex];
    if (!rule) return null;

    const handleModalUpdate = (updatedRule: SkillRule) => {
        const newList = [...stage.skillLogic!];
        newList[activeRuleIndex] = updatedRule;
        onUpdateStage({ ...stage, skillLogic: newList });
    };

    return (
        <ModalWrapper
            title={`Configure Routing Rule #${activeRuleIndex + 1}`}
            icon={Briefcase}
            onClose={onClose}
            modalSize={modalSize}
            onResizeStart={onResizeStart}
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
                            onChange={(g: LogicGroup) => handleModalUpdate({ ...rule, logic: g })}
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
