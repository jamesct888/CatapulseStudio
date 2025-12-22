
import React from 'react';
import { StageDefinition, LogicGroup, ElementDefinition } from '../../types';
import { ModalWrapper } from '../ModalWrapper';
import { LogicBuilder } from '../LogicBuilder';
import { FastForward, Info } from 'lucide-react';

interface SkipLogicModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: StageDefinition | null;
    onUpdateStage: (updated: StageDefinition) => void;
    modalSize: { width: number, height: number };
    onResizeStart: () => void;
    availableTargets: ElementDefinition[];
}

export const SkipLogicModal: React.FC<SkipLogicModalProps> = ({
    isOpen, onClose, stage, onUpdateStage, modalSize, onResizeStart, availableTargets
}) => {
    if (!isOpen || !stage) return null;

    // Ensure logic group exists
    const logicGroup = stage.skipLogic;
    if (!logicGroup) return null;

    return (
        <ModalWrapper
            title="Configure Skip Conditions"
            icon={FastForward}
            onClose={onClose}
            modalSize={modalSize}
            onResizeStart={onResizeStart}
        >
            <div className="max-w-4xl mx-auto">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 text-sm text-amber-800 flex gap-2">
                    <Info size={20} className="shrink-0" />
                    <div>
                        <p className="font-bold">Negative Logic Mode</p>
                        <p>By default, all stages run in sequence. Define conditions below to <strong>SKIP</strong> this stage.</p>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <LogicBuilder
                        group={logicGroup}
                        onChange={(g: LogicGroup) => onUpdateStage({ ...stage, skipLogic: g })}
                        availableTargets={availableTargets}
                    />
                </div>
            </div>
        </ModalWrapper>
    );
};
