import React, { useRef, useState, useEffect } from 'react';
import { CatapulseLogo } from './Shared';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code, Network, Download, Upload } from 'lucide-react';
import { ProcessDefinition } from '../types';

interface AppHeaderProps {
  processDef: ProcessDefinition;
  setProcessDef: (val: ProcessDefinition) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  processDef, setProcessDef, viewMode, setViewMode, isSettingsOpen, setIsSettingsOpen 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Renaming State
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(processDef.name);

  useEffect(() => {
    setTempName(processDef.name);
  }, [processDef.name]);

  const handleRenameSave = () => {
      if (tempName.trim() && tempName !== processDef.name) {
          setProcessDef({ ...processDef, name: tempName });
      } else {
          setTempName(processDef.name); // Revert
      }
      setIsRenaming(false);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processDef, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${processDef.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            // Basic validation
            if (json.stages && Array.isArray(json.stages)) {
                setProcessDef(json);
            } else {
                alert("Invalid Catapulse Process Definition file.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to parse JSON.");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-6">
            <CatapulseLogo scale={0.8} />
            <div className="h-6 w-px bg-gray-200"></div>
            <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                    { id: 'editor', icon: Edit3, label: 'Design' },
                    { id: 'flow', icon: Network, label: 'Flow' },
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
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                        title="Load Process (JSON)"
                    >
                        <Upload size={18} />
                    </button>
                    <button 
                        onClick={handleExport}
                        className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                        title="Save Process (JSON)"
                    >
                        <Download size={18} />
                    </button>
                </div>
                <div className="h-6 w-px bg-gray-200"></div>

                <div className="text-right flex flex-col items-end">
                    {isRenaming ? (
                        <input 
                            autoFocus
                            type="text" 
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleRenameSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSave();
                                if (e.key === 'Escape') {
                                    setTempName(processDef.name);
                                    setIsRenaming(false);
                                }
                            }}
                            className="text-xs font-bold text-gray-900 text-right border-b-2 border-sw-teal bg-transparent focus:outline-none w-48 px-1"
                        />
                    ) : (
                        <button 
                            onClick={() => setIsRenaming(true)}
                            className="text-xs font-bold text-gray-900 hover:text-sw-teal hover:underline decoration-dashed underline-offset-4 transition-all"
                            title="Click to rename process"
                        >
                            {processDef.name}
                        </button>
                    )}
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
        
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".json" 
            className="hidden" 
        />
    </header>
  );
};