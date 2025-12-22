
import React from 'react';
import { ElementDefinition, ValidationType } from '../../types';
import { ModalWrapper } from '../ModalWrapper';
import { ShieldCheck, Info } from 'lucide-react';

interface ValidationRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: ElementDefinition | null;
    onUpdateElement: (updated: ElementDefinition) => void;
    modalSize: { width: number, height: number };
    onResizeStart: () => void;
}

export const ValidationRulesModal: React.FC<ValidationRulesModalProps> = ({
    isOpen, onClose, element, onUpdateElement, modalSize, onResizeStart
}) => {
    if (!isOpen || !element) return null;

    const labelClass = "block text-xs font-bold text-sw-teal uppercase mb-2 tracking-wide";
    const inputClass = "w-full p-3 bg-white text-sw-text border border-gray-300 rounded-lg focus:outline-none focus:border-sw-teal focus:ring-1 focus:ring-sw-teal transition-all text-sm";

    const handleValidationChange = (field: string, value: any) => {
        const currentValidation = element.validation || { type: 'none' as ValidationType };
        const updatedValidation = { ...currentValidation, [field]: value };
        onUpdateElement({ ...element, validation: updatedValidation });
    };

    return (
        <ModalWrapper
            title="Field Validation Rules"
            icon={ShieldCheck}
            onClose={onClose}
            modalSize={modalSize}
            onResizeStart={onResizeStart}
        >
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
                    <div>
                        <label className={labelClass}>Validation Type</label>
                        <select
                            value={element.validation?.type || 'none'}
                            onChange={(e) => handleValidationChange('type', e.target.value)}
                            className={inputClass}
                        >
                            <option value="none">No Validation</option>
                            <option value="email">Email Format</option>
                            <option value="phone_uk">UK Mobile/Phone Number</option>
                            <option value="nino_uk">UK National Insurance Number</option>
                            <option value="date_future">Date must be in Future</option>
                            <option value="date_past">Date must be in Past</option>
                            <option value="custom">Custom Description</option>
                        </select>
                    </div>

                    {element.validation?.type === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className={labelClass}>Custom Rule Description</label>
                            <textarea
                                value={element.validation?.customDescription || ''}
                                onChange={(e) => handleValidationChange('customDescription', e.target.value)}
                                className={inputClass}
                                rows={4}
                                placeholder="Describe the validation rule (e.g., 'Must start with 3 letters...')"
                            />
                            <p className="text-xs text-gray-400 mt-2">This description will be included in the generated user stories for developers.</p>
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <div className="text-sm text-blue-700">
                            <p className="font-bold mb-1">Note:</p>
                            <p>Standard validations (Email, Phone, NI) are automatically enforced in the Preview mode. Custom validations are documentation-only.</p>
                        </div>
                    </div>
                </div>
            </div>
        </ModalWrapper>
    );
};
