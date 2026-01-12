
import React, { useRef } from 'react';
import { CatapulseLogo } from './Shared';
import { Sparkles, Zap, FileText, ScanLine, BrainCircuit } from 'lucide-react';

import { GALLERY_TEMPLATES } from '../templates';

interface OnboardingProps {
  startPrompt: string;
  setStartPrompt: (val: string) => void;
  handleStart: (useDemo?: boolean) => void;
  handleLegacyFormUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLoadTemplate: (def: any) => void; // New Prop
  showDemoDrop: boolean;
  isDetailedMode: boolean;
  setIsDetailedMode: (val: boolean) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  startPrompt,
  setStartPrompt,
  handleStart,
  handleLegacyFormUpload,
  handleLoadTemplate,
  showDemoDrop,
  isDetailedMode,
  setIsDetailedMode
}) => {
  const legacyInputRef = useRef<HTMLInputElement>(null);
  // UI-only state for now, as requested
  const [targetTech, setTargetTech] = React.useState<'pega' | 'other'>('pega');

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

      {/* --- Tech Stack Toggle (Visual Only) --- */}
      <div className="absolute top-8 right-8 z-50">
        <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-white/40 shadow-sm">
          <button
            onClick={() => setTargetTech('pega')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${targetTech === 'pega' ? 'bg-sw-teal text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
          >
            <div className={`w-2 h-2 rounded-full ${targetTech === 'pega' ? 'bg-white' : 'bg-sw-teal'}`}></div>
            Pega Infinity™
          </button>
          <button
            onClick={() => setTargetTech('other')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${targetTech === 'other' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
          >
            Other
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full z-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-2">
          <CatapulseLogo scale={1.5} theme="dark" align="center" />
        </div>

        <h1 className="text-6xl font-serif text-sw-teal mb-2 tracking-tight">
          What do you want to build?
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
          Describe your business process, or start from a Golden Template.
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
              aria-label="Generate Process"
            >
              <Sparkles size={24} />
            </button>
          </div>
        </div>

        {/* --- Template Gallery --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12">
          {GALLERY_TEMPLATES.filter(t => {
            // MAGIC URL LOGIC: Only show Innovation Day Workshop if ?workshop=true
            if (t.id === 'tmpl-innovation-day') {
              const params = new URLSearchParams(window.location.search);
              return params.get('workshop') === 'true';
            }
            return true;
          }).map(t => (
            <button
              key={t.id}
              onClick={() => handleLoadTemplate(t.processDef)}
              className="group relative bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left overflow-hidden flex flex-col gap-2"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${t.color}`}></div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-800 group-hover:text-sw-teal transition-colors">{t.title}</h3>
                <div className={`w-2 h-2 rounded-full ${t.color}`}></div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
              <div className="flex gap-2 mt-2">
                {t.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-50 text-[10px] uppercase font-bold text-gray-400 rounded-md tracking-wider">{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>


        {/* Footer Links & Actions */}
        <div className="pt-8 flex flex-col items-center gap-4">
          <button
            id="card-digitize"
            onClick={() => legacyInputRef.current?.click()}
            className="flex items-center gap-2 text-sw-teal bg-white border border-gray-200 px-6 py-2 rounded-full font-bold text-sm hover:shadow-md hover:border-sw-teal transition-all group"
          >
            <ScanLine size={16} className="text-gray-400 group-hover:text-sw-teal transition-colors" />
            Import from Document / Legacy Form
          </button>

          <div className="flex flex-col items-center gap-2">
            <button onClick={() => { setStartPrompt(''); handleStart(); }} className="text-sm font-bold text-gray-400 hover:text-sw-teal transition-colors">
              Skip & Start from Scratch
            </button>
          </div>

        </div>

        <div className="text-center pt-8 space-y-1">
          <p className="text-[10px] text-gray-300 font-mono">
            Powered by Gemini 2.5 Flash • Enterprise Grade Security
          </p>
          <p className="text-[10px] text-gray-300 font-mono opacity-60">
            Catapulse Studio v1.3.3 • Build {new Date().toISOString().split('T')[0]}
          </p>
        </div>
      </div>

      {/* Hidden input for legacy functionality */}
      <input type="file" ref={legacyInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleLegacyFormUpload} />
    </div>
  );
};
