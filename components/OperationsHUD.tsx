
import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, X } from 'lucide-react';

interface OperationsHUDProps {
  requiredSkill: string;
  reason?: string;
  isVisible: boolean;
  onDismiss: () => void;
}

export const OperationsHUD: React.FC<OperationsHUDProps> = ({ requiredSkill, reason, isVisible, onDismiss }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 6000); // Auto hide after 6s
      return () => clearTimeout(timer);
    }
  }, [isVisible, requiredSkill]); // Re-trigger if skill changes

  if (!show) return null;

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-sw-teal text-white rounded-xl shadow-2xl p-4 max-w-md border border-sw-teal/50 flex flex-col gap-2 relative">
        <button 
            onClick={() => { setShow(false); onDismiss(); }}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
            <X size={14} />
        </button>
        
        <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
                <Shield size={16} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-sw-purpleLight">Operational Context</span>
        </div>
        
        <div>
            <p className="text-sm font-light opacity-90">
                This stage requires specific authority. In production, this work would route to:
            </p>
            <div className="mt-2 flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                <div className="text-sm font-bold text-white">{requiredSkill}</div>
                {reason && (
                    <>
                        <ArrowRight size={14} className="opacity-50" />
                        <div className="text-xs italic opacity-80">{reason}</div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
