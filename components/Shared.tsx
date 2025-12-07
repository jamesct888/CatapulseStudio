
import React, { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';

export const CatapulseLogo = ({ theme = 'dark', scale = 1, align = 'left' }: { theme?: 'dark' | 'light', scale?: number, align?: 'left' | 'center' }) => {
  const color = theme === 'dark' ? 'text-sw-teal' : 'text-gray-300';
  return (
    <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : ''}`} style={{ transform: `scale(${scale})`, transformOrigin: align === 'center' ? 'center' : 'left' }}>
      <div className="w-8 h-8 bg-sw-teal rounded-lg flex items-center justify-center transform rotate-3 shadow-sm">
        <Rocket className="text-white w-5 h-5" />
      </div>
      <span className={`font-serif font-bold text-xl tracking-tight ${color}`}>Catapulse</span>
    </div>
  );
};

export const ScrambleText = ({ text, className }: { text: string, className?: string }) => {
    const [display, setDisplay] = useState(text);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    
    useEffect(() => {
        let iterations = 0;
        const interval = setInterval(() => {
            setDisplay(
                text.split("")
                    .map((letter, index) => {
                        if (index < iterations) {
                            return text[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("")
            );
            
            if (iterations >= text.length) clearInterval(interval);
            iterations += 1/5; 
        }, 60);
        return () => clearInterval(interval);
    }, [text]);

    return <span className={className}>{display}</span>;
};
