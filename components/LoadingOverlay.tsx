
import React, { useState, useEffect } from 'react';
import { ScrambleText } from './Shared';

const MAGIC_LOGS = [
    "Gathering inspiration...",
    "Sorry about the wait - at least you don't have to sit in silence...",
    "Convincing the AI that this is a good idea...",
    "Reticulating splines...",
    "Still faster than a steering committee meeting...",
    "Aligning the synergy crystals...",
    "Consulting the design oracle...",
    "Wait, did I leave the stove on? No, focused...",
    "Generating business value...",
    "Doing the fiddly bits...",
    "Almost there..."
];

export const LoadingOverlay: React.FC = () => {
  const [currentMagicLog, setCurrentMagicLog] = useState(MAGIC_LOGS[0]);

  useEffect(() => {
      let index = 0;
      const interval = setInterval(() => {
          index = (index + 1) % MAGIC_LOGS.length;
          if (index === 0) index = 2; 
          setCurrentMagicLog(MAGIC_LOGS[index]);
      }, 4000); 
      return () => clearInterval(interval);
  }, []);

  return (
      <div className="fixed inset-0 z-[100] bg-sw-teal/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500 overflow-hidden">
          
          {/* Dynamic Rotating Background Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              {/* Outer Circle - Slower */}
              <div className="absolute w-[50rem] h-[50rem] border border-dotted border-white/20 rounded-full animate-[spin_20s_linear_infinite]">
                  <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-sw-red rounded-full shadow-[0_0_40px_15px_rgba(230,17,38,0.6)]"></div>
              </div>
              
              {/* Middle Circle - Medium (No Dot) */}
              <div className="absolute w-[40rem] h-[40rem] border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
              
              {/* Inner Circle - Faster */}
              <div className="absolute w-[30rem] h-[30rem] border border-dashed border-white/30 rounded-full animate-[spin_8s_linear_infinite]">
                   <div className="absolute -top-1.5 left-1/2 w-3 h-3 bg-sw-red rounded-full shadow-[0_0_40px_15px_rgba(230,17,38,0.6)]"></div>
              </div>
          </div>

          {/* Impact Pulse Container */}
          <div className="flex flex-col items-center mb-16 relative z-10 animate-heartbeat-impact">
              <h1 className="text-8xl font-serif font-bold text-white mb-8 tracking-tighter relative z-10">
                  <ScrambleText text="Catapulse" />
              </h1>
              
              {/* Monitor Line Container */}
              <div className="w-96 h-24 relative flex items-center justify-center overflow-hidden">
                {/* The Line */}
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-0.5 bg-white/10"></div>
                </div>
                
                {/* The Pulse - Smooth Sine Wave */}
                <svg viewBox="0 0 500 150" className="w-full h-full drop-shadow-[0_0_15px_rgba(230,17,38,0.8)]">
                      <path 
                        d="M0 75 L150 75 C 180 10, 200 140, 230 75 L500 75"
                        fill="none"
                        stroke="#e61126"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1000"
                        strokeDashoffset="1000"
                        className="animate-ecg"
                      />
                </svg>
                
                {/* Inline Styles to guarantee animation execution */}
                <style>{`
                    @keyframes ecgDraw {
                        0% { stroke-dashoffset: 1000; opacity: 0; }
                        10% { opacity: 1; }
                        40% { stroke-dashoffset: 0; }
                        100% { stroke-dashoffset: -1000; opacity: 0; }
                    }
                    .animate-ecg {
                        animation: ecgDraw 4.5s ease-in-out infinite;
                    }
                    @keyframes impactPulse {
                        0%, 20% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(230,17,38,0)); }
                        30% { transform: scale(1.02); filter: drop-shadow(0 0 30px rgba(230,17,38,0.5)); }
                        40% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(230,17,38,0)); }
                        100% { transform: scale(1); }
                    }
                    .animate-heartbeat-impact {
                        animation: impactPulse 4.5s ease-in-out infinite;
                    }
                `}</style>
              </div>
          </div>

          <h2 className="text-3xl font-serif font-bold mb-4 text-center animate-pulse text-white relative z-10">{currentMagicLog}</h2>
          <p className="text-sw-purpleLight/70 font-mono text-sm animate-pulse relative z-10">Initializing Catapulse Engine...</p>
      </div>
  );
};
