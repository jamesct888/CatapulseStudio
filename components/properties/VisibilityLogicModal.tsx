
import React from 'react';
import { ElementDefinition, SectionDefinition, LogicGroup } from '../../types';
import { ModalWrapper } from '../ModalWrapper';
import { LogicBuilder } from '../LogicBuilder';
import { Eye, CheckCircle2, Info } from 'lucide-react';

// Shared for Visibility and Required Logic as they are identical structure
interface CommonLogicModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ElementDefinition | SectionDefinition | null;
    type: 'visibility' | 'required';
    onUpdate: (updated: any) => void;
    modalSize: { width: number, height: number };
    onResizeStart: () => void;
    availableTargets: ElementDefinition[];
}

export const VisibilityLogicModal: React.FC<CommonLogicModalProps> = ({
    isOpen, onClose, data, type, onUpdate, modalSize, onResizeStart, availableTargets
}) => {
    if (!isOpen || !data) return null;

    const logicGroup = type === 'visibility' ? (data as any).visibility : (data as any).requiredLogic;
    const title = type === 'visibility' ? "Configure Visibility Logic" : "Configure Mandatory Logic";
    const icon = type === 'visibility' ? Eye : CheckCircle2;
    const isElement = 'type' in data;

    // Safety check: Ensure logic group exists, parent should handle initialization but double check
    if (!logicGroup) return null;

    return (
        <ModalWrapper
            title={title}
            icon={icon}
            onClose={onClose}
            modalSize={modalSize}
            onResizeStart={onResizeStart}
        >
            <div className="max-w-4xl mx-auto">
                {type === 'required' && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 text-sm text-amber-800 flex gap-2">
                        <Info size={20} className="shrink-0" />
                        <div>
                            <p className="font-bold">Conditional Requirement</p>
                            <p>Define rules for when this field becomes mandatory. If rules are met, the user cannot proceed without filling it.</p>
                        </div>
                    </div>
                )}
                {type === 'visibility' && (
                    <p className="text-gray-500 mb-6">Define the rules that determine when this {isElement ? 'field' : 'section'} should be visible.</p>
                )}

                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <LogicBuilder
                        group={logicGroup}
                        onChange={(g: LogicGroup) => {
                            const field = type === 'visibility' ? 'visibility' : 'requiredLogic';
                            onUpdate({ ...data, [field]: g });
                        }}
                        availableTargets={availableTargets}
                    />
                </div>
            </div>
        </ModalWrapper>
    );
};
