
import React, { useRef } from 'react';
import { CatapulseLogo } from './Shared';
import { Sparkles, Zap, FileText, ScanLine } from 'lucide-react';

interface OnboardingProps {
  startPrompt: string;
  setStartPrompt: (val: string) => void;
  handleStart: (useDemo?: boolean) => void;
  handleLegacyFormUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showDemoDrop: boolean;
}

export const Onboarding: React.FC<OnboardingProps> = ({ 
  startPrompt, 
  setStartPrompt, 
  handleStart, 
  handleLegacyFormUpload, 
  showDemoDrop 
}) => {
  const legacyInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-sw-lighterGray flex flex-col justify-center items-center p-8 relative overflow-hidden">
      {/* Background Decoration - Concentric Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
         <div className="w-[40rem] h-[40rem] border border-sw-teal rounded-full absolute"></div>
         <div className="w-[55rem] h-[55rem] border border-sw-teal rounded-full absolute"></div>
         <div className="w-[70rem] h-[70rem] border border-sw-teal rounded-full absolute"></div>
      </div>
      
      {/* Demo Overlay Drop Animation */}
      {showDemoDrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="animate-bounce-in flex flex-col items-center">
                <FileText size={64} className="text-sw-red drop-shadow-2xl mb-2" />
                <span className="bg-white px-3 py-1 rounded shadow text-xs font-bold">claim_form.pdf</span>
            </div>
            <style>{`
                @keyframes dropIn {
                    0% { transform: translateY(-500px) scale(0.5); opacity: 0; }
                    60% { transform: translateY(20px) scale(1.1); opacity: 1; }
                    80% { transform: translateY(-10px) scale(0.95); }
                    100% { transform: translateY(0) scale(1); }
                }
                .animate-bounce-in { animation: dropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>
        </div>
      )}

      <div className="max-w-3xl w-full z-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-2">
            <CatapulseLogo scale={1.5} theme="dark" align="center" />
        </div>
        
        <h1 className="text-6xl font-serif text-sw-teal mb-2 tracking-tight">
          What do you want to build?
        </h1>
        
        <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
          Describe your business process, and let AI structure the stages, fields, and logic for you.
        </p>

        {/* Input Area - Floating Card Style */}
        <div className="relative max-w-2xl mx-auto w-full mt-8 group">
            <div className="relative bg-white p-2 rounded-2xl shadow-card hover:shadow-xl transition-all border border-gray-100 flex items-center">
              <input 
                type="text" 
                className="flex-1 bg-transparent border-none focus:ring-0 text-xl px-4 py-3 text-sw-teal placeholder-gray-300 font-serif"
                placeholder="e.g. Pension Transfer In, Health Claim..."
                value={startPrompt}
                onChange={(e) => setStartPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
              <button 
                onClick={() => handleStart()}
                className="bg-sw-teal hover:bg-sw-tealHover text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center"
              >
                <Sparkles size={24} />
              </button>
            </div>
        </div>

        {/* Capsule Suggestions */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
            {['Transfer In Request', 'Transfer Away', 'Make a Health Claim', 'Change Policy Details', 'Beneficiary Nomination'].map(s => (
                <button 
                    key={s} 
                    onClick={() => setStartPrompt(s)}
                    className="px-5 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-500 hover:border-sw-teal hover:text-sw-teal hover:shadow-md transition-all"
                >
                    {s}
                </button>
            ))}
        </div>

        {/* Footer Links & Actions */}
        <div className="pt-12 flex flex-col items-center gap-4">
            <button 
                id="card-digitize"
                onClick={() => legacyInputRef.current?.click()}
                className="flex items-center gap-2 text-sw-teal bg-white border border-gray-200 px-6 py-2 rounded-full font-bold text-sm hover:shadow-md hover:border-sw-teal transition-all group"
            >
                <ScanLine size={16} className="text-gray-400 group-hover:text-sw-teal transition-colors"/>
                Import from Document / Legacy Form
            </button>

            <div className="flex items-center justify-center gap-6 text-sm font-bold text-gray-400">
                <button onClick={() => { setStartPrompt(''); handleStart(); }} className="hover:text-sw-teal transition-colors">
                    Skip & Start from Scratch
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={() => handleStart(true)} className="flex items-center gap-1.5 text-sw-red hover:text-sw-redHover transition-colors">
                    <Zap size={16} fill="currentColor" /> Demo Mode
                </button>
            </div>
        </div>

        <p className="text-[10px] text-gray-300 pt-8 font-mono">
            Powered by Gemini 1.5 Flash • Enterprise Grade Security
        </p>
      </div>

      {/* Hidden input for legacy functionality */}
      <input type="file" ref={legacyInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleLegacyFormUpload}/>
    </div>
  );
};
