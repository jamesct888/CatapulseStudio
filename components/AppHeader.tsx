import React, { useState, useEffect } from 'react';
import { CatapulseLogo } from './Shared';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code, Network, Table as TableIcon } from 'lucide-react';
import { ProcessDefinition, VisualTheme } from '../types';
import { HeaderCloudControls } from './HeaderCloudControls';
import { HeaderFileMenu } from './HeaderFileMenu';
import { HeaderWorkshopControls } from './HeaderWorkshopControls';

type ViewMode = 'editor' | 'table' | 'flow' | 'preview' | 'spec' | 'qa' | 'pega' | 'onboarding';

interface AppHeaderProps {
    processDef: ProcessDefinition | null;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    visualTheme?: VisualTheme;
    isDirty: boolean;
    onExternalSave: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    processDef, setProcessDef, viewMode, setViewMode, isSettingsOpen, setIsSettingsOpen, visualTheme,
    isDirty, onExternalSave
}) => {

    // Renaming State
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempName, setTempName] = useState(processDef?.name || '');

    useEffect(() => {
        if (processDef) {
            setTempName(processDef.name);
        }
    }, [processDef?.name]);

    const handleRenameSave = () => {
        if (!processDef) return;
        if (tempName.trim() && tempName !== processDef.name) {
            setProcessDef({ ...processDef, name: tempName });
        } else {
            setTempName(processDef.name); // Revert
        }
        setIsRenaming(false);
    };

    if (!processDef) return null;

    // Theme-aware coloring
    const getThemeColorClass = () => {
        switch (visualTheme?.mode) {
            case 'type2': return 'text-sw-red'; // Red Mode
            case 'type3': return 'text-sw-teal'; // Default/Fallback
            default: return 'text-sw-teal'; // Standard Navy
        }
    };
    const themeColor = getThemeColorClass();

    return (
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-50 shrink-0 sticky top-0">
            <div className="flex items-center gap-6">
                <CatapulseLogo scale={0.8} />
                <div className="h-6 w-px bg-gray-200"></div>
                <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        { id: 'editor', icon: Edit3, label: 'Design' },
                        { id: 'table', icon: TableIcon, label: 'Grid' },
                        { id: 'flow', icon: Network, label: 'Flow' },
                        { id: 'preview', icon: Play, label: 'Preview' },
                        { id: 'spec', icon: FileText, label: 'Spec' },
                        { id: 'qa', icon: CheckSquare, label: 'Stories & Test Cases' },
                        { id: 'pega', icon: Code, label: 'Pega' }
                    ].map(mode => (
                        <button
                            key={mode.id}
                            id={`nav-${mode.id}`}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`px-3 py-1.5 rounded-md text-sm font-sans font-medium flex items-center gap-2 transition-all ${viewMode === mode.id ? `bg-white ${themeColor} shadow-sm` : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <mode.icon size={14} />
                            {mode.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <HeaderCloudControls
                    processDef={processDef}
                    setProcessDef={setProcessDef}
                />

                <HeaderWorkshopControls
                    processDef={processDef}
                    setProcessDef={setProcessDef}
                />

                <div className="h-6 w-px bg-gray-200"></div>

                <HeaderFileMenu
                    processDef={processDef}
                    setProcessDef={setProcessDef}
                    setViewMode={setViewMode}
                    onExternalSave={onExternalSave}
                    isDirty={isDirty}
                    visualTheme={visualTheme}
                />

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
                            className={`text-sm font-serif font-bold text-gray-900 text-right border-b-2 bg-transparent focus:outline-none w-56 px-1 ${visualTheme?.mode === 'type2' ? 'border-sw-red' : 'border-sw-teal'}`}
                        />
                    ) : (
                        <button
                            onClick={() => setIsRenaming(true)}
                            className={`text-sm font-serif font-bold text-gray-900 hover:underline decoration-dashed underline-offset-4 transition-all ${visualTheme?.mode === 'type2' ? 'hover:text-sw-red' : 'hover:text-sw-teal'}`}
                            title="Click to rename process"
                        >
                            {processDef.name}
                        </button>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono">{processDef.id}</p>
                </div>

                {viewMode === 'editor' && (
                    <button
                        id="btn-settings"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? `bg-sw-lightGray ${themeColor}` : `text-gray-400 hover:${themeColor}`}`}
                    >
                        <Settings2 size={20} />
                    </button>
                )}
            </div>
        </header>
    );
};
