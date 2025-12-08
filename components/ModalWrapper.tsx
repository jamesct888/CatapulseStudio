import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalWrapperProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  onClose: () => void;
  modalSize: { width: number; height: number };
  onResizeStart: () => void;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, icon: Icon, children, onClose, modalSize, onResizeStart }) => {
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative border border-gray-200"
              style={{ width: modalSize.width, height: modalSize.height, maxWidth: '95vw', maxHeight: '95vh' }}
            >
                {/* Modal Header */}
                <div className="bg-sw-teal p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                            <Icon size={24} /> {title}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    {children}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 relative">
                    <div className="text-xs text-gray-400 italic">Changes apply immediately</div>
                    <button onClick={onClose} className="px-6 py-2 bg-sw-teal text-white rounded-lg font-bold hover:bg-sw-tealHover shadow-sm">
                        Done
                    </button>
                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 text-gray-300 hover:text-sw-teal"
                      onMouseDown={onResizeStart}
                    >
                        <svg viewBox="0 0 10 10" className="w-3 h-3 fill-current">
                            <path d="M10 10 L10 0 L0 10 Z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};