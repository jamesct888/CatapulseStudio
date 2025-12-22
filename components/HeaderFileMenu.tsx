import React, { useRef, useState } from 'react';
import { FilePlus, FileJson, Upload, Download, Share, Trash2 } from 'lucide-react';
import { ProcessDefinition, VisualTheme } from '../types';
import { generateStandaloneHTML } from '../services/htmlExporter';
import { importLegacyContent } from '../services/geminiService';
import { ModalWrapper } from './ModalWrapper';

interface HeaderFileMenuProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;
    setViewMode: (mode: any) => void;
    onExternalSave: () => void;
    isDirty: boolean;
    visualTheme?: VisualTheme;
}

export const HeaderFileMenu: React.FC<HeaderFileMenuProps> = ({
    processDef, setProcessDef, setViewMode, onExternalSave, isDirty, visualTheme
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Legacy Import State
    const [showLegacyImport, setShowLegacyImport] = useState(false);
    const [legacyText, setLegacyText] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // New Project State
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleNewProject = () => {
        if (isDirty) {
            setShowResetConfirm(true);
        } else {
            performReset();
        }
    };

    const performReset = () => {
        localStorage.removeItem('catapulse_autosave');
        setProcessDef(null);
        setViewMode('onboarding');
        onExternalSave();
        setShowResetConfirm(false);
    };

    const handleExport = () => {
        if (!processDef) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processDef, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${processDef.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        onExternalSave();
    };

    const handleExportHTML = () => {
        if (!processDef) return;
        const themeToUse = visualTheme || { mode: 'type1', density: 'default', radius: 'medium' };
        const htmlContent = generateStandaloneHTML(processDef, themeToUse);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${processDef.name.replace(/\s+/g, '_')}_prototype.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
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
        e.target.value = '';
    };

    const handleLegacyConvert = async () => {
        if (!legacyText.trim()) return;
        setIsImporting(true);
        try {
            const result = await importLegacyContent(legacyText);
            if (result) {
                setProcessDef(result);
                setShowLegacyImport(false);
                setLegacyText('');
            }
        } catch (error) {
            alert("Failed to convert legacy content.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={handleNewProject}
                className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                title="New Project (Reset)"
            >
                <FilePlus size={18} />
            </button>
            <div className="w-px h-8 bg-gray-200 mx-1"></div>
            <button
                onClick={() => setShowLegacyImport(true)}
                className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                title="Import Legacy Schema (Text/JSON)"
            >
                <FileJson size={18} />
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                title="Load Local File (JSON)"
            >
                <Upload size={18} />
            </button>
            <button
                onClick={handleExport}
                className={`p-2 rounded-lg transition-colors relative ${isDirty ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 animate-pulse' : 'text-gray-400 hover:text-sw-teal hover:bg-gray-100'}`}
                title={isDirty ? "Unified File has Unsaved Changes (Click to Download)" : "Save Local File (JSON)"}
            >
                <Download size={18} />
                {isDirty && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
                )}
            </button>
            <div className="w-px h-8 bg-gray-200 mx-1"></div>
            <button
                onClick={handleExportHTML}
                className="p-2 text-white bg-sw-teal hover:bg-sw-tealHover rounded-lg transition-colors flex items-center gap-2 text-xs font-bold px-3 shadow-md"
                title="Export Standalone HTML Prototype"
            >
                <Share size={14} /> Share Prototype
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
            />

            {/* --- MODALS --- */}

            {showLegacyImport && (
                <ModalWrapper
                    title="Import Legacy Schema"
                    icon={FileJson}
                    onClose={() => setShowLegacyImport(false)}
                    modalSize={{ width: 800, height: 600 }}
                    onResizeStart={() => { }}
                >
                    <div className="h-full flex flex-col">
                        <p className="text-sm text-gray-500 mb-4">
                            Paste your legacy schema text (e.g. from FACTS.JSON or a text dump of your old system).
                            The AI will attempt to reconstruct the process, including logic and options.
                        </p>
                        <textarea
                            value={legacyText}
                            onChange={(e) => setLegacyText(e.target.value)}
                            className="flex-1 w-full p-4 border border-gray-200 rounded-xl font-mono text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sw-teal"
                            placeholder={`Example format:\n{\n  "stage": "1",\n  "label": "Field Name",\n  "type": "StaticText",\n  "visibleWhen": "FieldA == 'Value'"\n}...`}
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleLegacyConvert}
                                disabled={isImporting || !legacyText.trim()}
                                className="bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center gap-2"
                            >
                                {isImporting ? 'Converting...' : 'Convert to Prototype'}
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {showResetConfirm && (
                <ModalWrapper
                    title="Discard Changes?"
                    icon={Trash2}
                    modalSize={{ width: 500, height: 'auto' }}
                    onResizeStart={() => { }}
                    onClose={() => setShowResetConfirm(false)}
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            You have unsaved changes in your current project. Starting a new project will <strong>discard all current work</strong>.
                        </p>
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800">
                            Are you sure you want to proceed?
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={performReset}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Discard & Start New
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
};
