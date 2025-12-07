
import React from 'react';
import { CatapulseLogo } from './Shared';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code } from 'lucide-react';
import { ProcessDefinition } from '../types';

interface AppHeaderProps {
  processDef: ProcessDefinition;
  viewMode: string;
  setViewMode: (mode: any) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  processDef, viewMode, setViewMode, isSettingsOpen, setIsSettingsOpen 
}) => {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-6">
            <CatapulseLogo scale={0.8} />
            <div className="h-6 w-px bg-gray-200"></div>
            <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                    { id: 'editor', icon: Edit3, label: 'Design' },
                    { id: 'preview', icon: Play, label: 'Preview' },
                    { id: 'spec', icon: FileText, label: 'Spec' },
                    { id: 'qa', icon: CheckSquare, label: 'QA' },
                    { id: 'pega', icon: Code, label: 'Pega' }
                ].map(mode => (
                    <button 
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === mode.id ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <mode.icon size={14} />
                        {mode.label}
                    </button>
                ))}
            </nav>
        </div>
        
        <div className="flex items-center gap-4">
                <div className="text-right">
                <p className="text-xs font-bold text-gray-900">{processDef.name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{processDef.id}</p>
                </div>
                {viewMode === 'editor' && (
                    <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'bg-sw-lightGray text-sw-teal' : 'text-gray-400 hover:text-sw-teal'}`}
                    >
                        <Settings2 size={20} />
                    </button>
                )}
        </div>
    </header>
  );
};
