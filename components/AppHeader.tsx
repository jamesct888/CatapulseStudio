
import React, { useRef, useState, useEffect } from 'react';
import { CatapulseLogo } from './Shared';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code, Network, Download, Upload, Share, FileJson, MessageSquare, Plus, Trash2, Edit2, ArrowRight, RefreshCw, Wand2, UploadCloud, CheckCircle, Clock, X, Table as TableIcon, CloudUpload, CloudDownload, Cloud, Loader2, Link2, Plug, History, RotateCcw, Database, Copy, Check } from 'lucide-react';
import { ProcessDefinition, VisualTheme, WorkshopSuggestion, ElementDefinition } from '../types';
import { generateStandaloneHTML } from '../services/htmlExporter';
import { ModalWrapper } from './ModalWrapper';
import { importLegacyContent, analyzeTranscript } from '../services/geminiService';
import { demoTranscript } from '../services/demoData';
import {
    saveProcessToCloud,
    fetchProcessList,
    loadProcessFromCloud,
    fetchProcessHistory,
    configureSupabase,
    disconnectSupabase,
    isSupabaseConfigured,
    SavedProcessMeta,
    ProcessHistoryEntry
} from '../services/supabaseService';

interface AppHeaderProps {
    processDef: ProcessDefinition;
    setProcessDef: (val: ProcessDefinition) => void;
    viewMode: string;
    setViewMode: (mode: any) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    visualTheme?: VisualTheme;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    processDef, setProcessDef, viewMode, setViewMode, isSettingsOpen, setIsSettingsOpen, visualTheme
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Renaming State
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempName, setTempName] = useState(processDef.name);

    // Legacy Import State
    const [showLegacyImport, setShowLegacyImport] = useState(false);
    const [legacyText, setLegacyText] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Workshop Review Mode State
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [discoverySuggestions, setDiscoverySuggestions] = useState<WorkshopSuggestion[]>([]);
    const [isAnalyzingDiscovery, setIsAnalyzingDiscovery] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    // DB Connectivity State
    const [isSupabaseReady, setIsSupabaseReady] = useState(isSupabaseConfigured());
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [showSql, setShowSql] = useState(false);
    const [sbUrl, setSbUrl] = useState(localStorage.getItem('sb_url') || '');
    const [sbKey, setSbKey] = useState(localStorage.getItem('sb_key') || '');

    // DB Save/Load State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveComment, setSaveComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [showLoadModal, setShowLoadModal] = useState(false);
    const [savedProcesses, setSavedProcesses] = useState<SavedProcessMeta[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // Time Machine State (Bottom Dock)
    const [isTimeMachineActive, setIsTimeMachineActive] = useState(false);
    const [originalDef, setOriginalDef] = useState<ProcessDefinition | null>(null);
    const [historyEntries, setHistoryEntries] = useState<ProcessHistoryEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [scrubIndex, setScrubIndex] = useState(0); // 0 is latest in the array (DESC), but we map visually L->R

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

    const handleExportHTML = () => {
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

    const handleLegacyConvert = async () => {
        if (!legacyText.trim()) return;
        setIsImporting(true);
        try {
            const result = await importLegacyContent(legacyText);
            if (result) {
                setProcessDef(result);
                setShowLegacyImport(false);
                setLegacyText('');
            } else {
                console.error("Import failed: AI returned null");
                alert("Failed to convert legacy content. Please check the console or ensure the format is correct.");
            }
        } catch (e) {
            console.error("Import Exception:", e);
            alert("An error occurred during import.");
        }
        setIsImporting(false);
    };

    const handleAnalyzeDiscovery = async () => {
        if (!transcript.trim()) return;
        setIsAnalyzingDiscovery(true);
        setAppliedCount(0);
        setDismissedIds([]);
        try {
            const results = await analyzeTranscript(processDef, transcript);
            // Ensure IDs are unique to prevent React key collision issues which can break list rendering
            const uniqueResults = results.map((r, i) => ({
                ...r,
                id: `sugg_${Date.now()}_${i}`
            }));
            setDiscoverySuggestions(uniqueResults);
        } catch (e) {
            console.error("Discovery Error:", e);
            alert("Failed to analyze transcript.");
        }
        setIsAnalyzingDiscovery(false);
    };

    const handleApplySuggestion = (suggestion: WorkshopSuggestion) => {
        try {
            const newDef = JSON.parse(JSON.stringify(processDef)) as ProcessDefinition;
            let applied = false;
            let errorMsg = '';
            const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';

            if (suggestion.type === 'add' && suggestion.newElement) {
                let targetSection = null;
                if (suggestion.newElement.sectionTitle) {
                    const searchTitle = normalize(suggestion.newElement.sectionTitle);
                    for (const stage of newDef.stages) {
                        const found = stage.sections.find((s: any) => normalize(s.title) === searchTitle);
                        if (found) { targetSection = found; break; }
                    }
                }
                if (!targetSection && newDef.stages.length > 0) {
                    targetSection = newDef.stages[0].sections[0];
                }
                if (targetSection) {
                    const newEl: ElementDefinition = {
                        id: `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        label: suggestion.newElement.label,
                        type: suggestion.newElement.type,
                        required: false
                    };
                    targetSection.elements.push(newEl);
                    applied = true;
                } else {
                    errorMsg = "No valid section found to add element.";
                }
            }
            else if ((suggestion.type === 'remove' || suggestion.type === 'modify') && suggestion.targetLabel) {
                const target = normalize(suggestion.targetLabel);
                let foundCount = 0;
                for (const stage of newDef.stages) {
                    for (const section of stage.sections) {
                        for (let i = section.elements.length - 1; i >= 0; i--) {
                            const el = section.elements[i];
                            if (normalize(el.label) === target) {
                                if (suggestion.type === 'remove') {
                                    section.elements.splice(i, 1);
                                    foundCount++;
                                } else if (suggestion.type === 'modify' && suggestion.updateData) {
                                    const { id, ...safeUpdates } = suggestion.updateData as any;
                                    section.elements[i] = { ...el, ...safeUpdates };
                                    foundCount++;
                                }
                            }
                        }
                    }
                }
                if (foundCount > 0) {
                    applied = true;
                } else {
                    errorMsg = `Field '${suggestion.targetLabel}' not found in current process.`;
                }
            }

            if (applied) {
                setProcessDef(newDef);
                setAppliedCount(prev => prev + 1);
                setDismissedIds(prev => [...prev, suggestion.id]);
            } else {
                alert(`Could not apply change: ${errorMsg}`);
            }
        } catch (e) {
            console.error("Apply Error:", e);
            alert("An unexpected error occurred while applying the change.");
        }
    };

    // --- DB Handlers ---

    const handleConnectSupabase = () => {
        configureSupabase(sbUrl, sbKey);
        setIsSupabaseReady(true);
        setShowConnectionModal(false);
    };

    const handleDisconnectSupabase = () => {
        disconnectSupabase();
        setIsSupabaseReady(false);
        setShowConnectionModal(false);
    };

    const handleCloudSaveClick = () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
        } else {
            setSaveComment('');
            setShowSaveModal(true);
        }
    };

    const performCloudSave = async () => {
        setIsSaving(true);
        const res = await saveProcessToCloud(processDef, saveComment);
        setIsSaving(false);

        if (res.success) {
            alert("Process saved successfully!");
            setShowSaveModal(false);
            if (res.newId && res.newId !== processDef.id) {
                setProcessDef({ ...processDef, id: res.newId });
            }
        } else {
            alert(`Save failed: ${res.error}`);
        }
    };

    const handleCloudLoadList = async () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
            return;
        }
        setShowLoadModal(true);
        setIsLoadingList(true);
        const res = await fetchProcessList();
        setIsLoadingList(false);
        if (res.error) {
            alert(`Failed to fetch list: ${res.error}`);
        } else {
            setSavedProcesses(res.data);
        }
    };

    const handleLoadProcess = async (id: string) => {
        console.log("[AppHeader] handleLoadProcess called with ID:", id);
        if (!confirm("Loading a process will overwrite your current work. Continue?")) {
            console.log("[AppHeader] Load cancelled by user");
            return;
        }
        console.log("[AppHeader] Starting cloud load...");
        setIsLoadingList(true);
        const res = await loadProcessFromCloud(id);
        console.log("[AppHeader] Cloud load result:", res);
        setIsLoadingList(false);
        if (res.data) {
            console.log("[AppHeader] Setting process definition...");
            setProcessDef(res.data);
            setShowLoadModal(false);
            console.log("[AppHeader] Load complete and modal closed.");
        } else {
            console.error("[AppHeader] Load failed:", res.error);
            alert(`Failed to load process: ${res.error || "Unknown error"}`);
        }
    };

    // --- Time Machine Logic ---

    const handleHistoryClick = async () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
            return;
        }
        setIsLoadingHistory(true);
        // Removed the history modal here to toggle the bottom panel instead
        const res = await fetchProcessHistory(processDef.id);
        setIsLoadingHistory(false);

        if (res.error || res.data.length === 0) {
            alert(res.error || "No history found for this process.");
            return;
        }

        setHistoryEntries(res.data); // Descending: 0 is latest
        setOriginalDef(processDef); // Backup current state
        setIsTimeMachineActive(true);
        setScrubIndex(0); // Start at latest
    };

    const handleTimeScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const visualIndex = parseInt(e.target.value);
        // visualIndex goes 0 (Oldest) -> Length-1 (Newest)
        // historyEntries goes [Newest, ..., Oldest]

        const maxIndex = historyEntries.length - 1;
        const dataIndex = maxIndex - visualIndex; // Invert to get array index

        setScrubIndex(dataIndex);
        if (historyEntries[dataIndex]) {
            setProcessDef(historyEntries[dataIndex].definition);
        }
    };

    const handleExitTimeMachine = (save: boolean) => {
        if (!save && originalDef) {
            setProcessDef(originalDef);
        }
        setIsTimeMachineActive(false);
        setOriginalDef(null);
    };

    const activeSuggestions = discoverySuggestions.filter(s => !dismissedIds.includes(s.id));

    // Helper for History Scrub Display
    const currentHistoryEntry = historyEntries[scrubIndex];

    const sqlSnippet = `
create table public.processes (
  id uuid not null default gen_random_uuid (),
  name text not null,
  definition jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint processes_pkey primary key (id),
  constraint processes_name_key unique (name)
) TABLESPACE pg_default;

create table public.process_versions (
  id uuid not null default gen_random_uuid (),
  process_id uuid not null,
  definition jsonb not null,
  created_at timestamp with time zone null default now(),
  constraint process_versions_pkey primary key (id),
  constraint process_versions_process_id_fkey foreign KEY (process_id) references processes (id) on delete CASCADE
) TABLESPACE pg_default;
`;

    return (
        <>
            <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 z-50 shrink-0 relative">
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
                                className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === mode.id ? 'bg-white text-sw-teal shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <mode.icon size={14} />
                                {mode.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {/* DB Controls */}
                    <div className="flex gap-2 items-center bg-blue-50/50 p-1 rounded-lg border border-blue-100/50">
                        <button
                            onClick={() => setShowConnectionModal(true)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${isSupabaseReady ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            title="Connection Status"
                        >
                            {isSupabaseReady ? <Plug size={12} /> : <Link2 size={12} />}
                            {isSupabaseReady ? 'Connected' : 'Offline'}
                        </button>
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        <button
                            onClick={handleCloudSaveClick}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors relative"
                            title="Save to Cloud (DB)"
                        >
                            <CloudUpload size={18} />
                        </button>
                        <button
                            onClick={handleCloudLoadList}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Load from Cloud (DB)"
                        >
                            <CloudDownload size={18} />
                        </button>
                        <button
                            onClick={handleHistoryClick}
                            className={`p-2 rounded-lg transition-colors relative ${isTimeMachineActive ? 'bg-amber-100 text-amber-700' : 'text-blue-600 hover:bg-blue-100'}`}
                            title="Time Machine (History)"
                        >
                            {isLoadingHistory ? <Loader2 size={18} className="animate-spin" /> : <History size={18} />}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDiscovery(true)}
                            className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                            title="Workshop Review Mode"
                        >
                            <MessageSquare size={18} />
                        </button>
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
                            className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                            title="Save Local File (JSON)"
                        >
                            <Download size={18} />
                        </button>
                        <div className="w-px h-8 bg-gray-200 mx-1"></div>
                        <button
                            onClick={handleExportHTML}
                            className="p-2 text-white bg-sw-teal hover:bg-sw-tealHover rounded-lg transition-colors flex items-center gap-2 text-xs font-bold px-3 shadow-md"
                            title="Export Standalone HTML Prototype"
                        >
                            <Share size={14} /> Share Prototype
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
                            id="btn-settings"
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

            {/* --- TIME MACHINE BOTTOM BAR --- */}
            {isTimeMachineActive && historyEntries.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 h-40 bg-white border-t border-gray-300 shadow-2xl z-[100] animate-in slide-in-from-bottom-full flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-transparent via-sw-teal to-transparent opacity-30"></div>
                    <div className="flex-1 flex flex-col px-12 py-4 relative">

                        {/* Header / Controls */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                        Time Machine Active
                                        <span className="text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Preview Mode</span>
                                    </h3>
                                    <p className="text-xs text-gray-500">Scrub timeline to preview previous versions. Click 'Restore' to revert.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExitTimeMachine(false)}
                                    className="px-6 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleExitTimeMachine(true)}
                                    className="px-6 py-2 rounded-lg text-sm font-bold bg-sw-teal text-white hover:bg-sw-tealHover shadow-md flex items-center gap-2"
                                >
                                    <RotateCcw size={16} /> Restore This Version
                                </button>
                            </div>
                        </div>

                        {/* Timeline Visualization */}
                        <div className="relative h-12 flex items-center group">
                            {/* Horizontal Line */}
                            <div className="absolute left-0 right-0 h-1 bg-gray-200 rounded-full"></div>

                            {/* Ticks */}
                            <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-1">
                                {historyEntries.slice().reverse().map((entry, idx) => {
                                    // Map visual index (0 = Oldest) to real index
                                    const realIdx = historyEntries.length - 1 - idx;
                                    const isSelected = realIdx === scrubIndex;
                                    return (
                                        <div key={entry.id} className="relative flex flex-col items-center group/tick">
                                            {/* The Tick */}
                                            <div className={`w-3 h-3 rounded-full transition-all duration-300 z-10 ${isSelected ? 'bg-sw-teal scale-150 ring-4 ring-sw-teal/20' : 'bg-gray-300 group-hover/tick:bg-gray-400'}`}></div>

                                            {/* Tooltip / Label */}
                                            <div className={`absolute bottom-6 flex flex-col items-center w-48 text-center transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover/tick:opacity-100'}`}>
                                                <div className="bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg">
                                                    <div className="font-bold mb-1 truncate w-full">{entry.comment || "Auto-save"}</div>
                                                    <div className="opacity-60">{new Date(entry.created_at).toLocaleTimeString()}</div>
                                                </div>
                                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actual Slider Input */}
                            <input
                                type="range"
                                min="0"
                                max={historyEntries.length - 1}
                                step="1"
                                value={(historyEntries.length - 1) - scrubIndex} // Invert: 0 is Oldest (Left), Max is Newest (Right)
                                onChange={handleTimeScrub}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Connection Modal */}
            {showConnectionModal && (
                <ModalWrapper
                    title="System Connection"
                    icon={Plug}
                    onClose={() => { setShowConnectionModal(false); setShowSql(false); }}
                    modalSize={{ width: 600, height: 500 }}
                    onResizeStart={() => { }}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Connect to your organization's Supabase instance to enable Cloud Save, History Tracking, and Collaboration.</p>

                        <div className="grid gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Supabase URL</label>
                                <input
                                    type="text"
                                    value={sbUrl}
                                    onChange={(e) => setSbUrl(e.target.value)}
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="https://xyz.supabase.co"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Anon / Service Key</label>
                                <input
                                    type="password"
                                    value={sbKey}
                                    onChange={(e) => setSbKey(e.target.value)}
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="ey..."
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => setShowSql(!showSql)}
                                className="text-xs font-bold text-sw-teal hover:underline flex items-center gap-1"
                            >
                                <Database size={12} /> {showSql ? 'Hide' : 'View'} Required SQL Schema
                            </button>
                            {showSql && (
                                <div className="mt-2 relative group">
                                    <pre className="text-[10px] bg-gray-900 text-gray-300 p-4 rounded-lg overflow-auto max-h-40 font-mono">
                                        {sqlSnippet}
                                    </pre>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(sqlSnippet)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy SQL"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
                            {isSupabaseReady && (
                                <button onClick={handleDisconnectSupabase} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-bold">Disconnect</button>
                            )}
                            <button onClick={handleConnectSupabase} className="px-6 py-2 bg-sw-teal text-white rounded font-bold text-sm hover:bg-sw-tealHover">
                                {isSupabaseReady ? 'Update Connection' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {/* Save with Comment Modal */}
            {showSaveModal && (
                <ModalWrapper
                    title="Commit to Cloud"
                    icon={CloudUpload}
                    onClose={() => setShowSaveModal(false)}
                    modalSize={{ width: 500, height: 400 }}
                    onResizeStart={() => { }}
                >
                    <div className="space-y-4 h-full flex flex-col">
                        <p className="text-sm text-gray-500">Add a note about this version to help track changes in the Time Machine.</p>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commit Message</label>
                            <textarea
                                value={saveComment}
                                onChange={(e) => setSaveComment(e.target.value)}
                                className="w-full p-3 border rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-sw-teal focus:border-transparent"
                                placeholder="e.g. Added validation to email field..."
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={performCloudSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-sw-teal text-white rounded-lg font-bold hover:bg-sw-tealHover flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CloudUpload size={16} />}
                                Save Version
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {showLoadModal && (
                <ModalWrapper
                    title="Load Process from Cloud"
                    icon={Cloud}
                    onClose={() => setShowLoadModal(false)}
                    modalSize={{ width: 600, height: 500 }}
                    onResizeStart={() => { }}
                >
                    <div className="h-full flex flex-col">
                        {isLoadingList ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
                                <Loader2 size={32} className="animate-spin text-sw-teal" />
                                <p className="text-sm">Fetching cloud processes...</p>
                            </div>
                        ) : savedProcesses.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                                No saved processes found.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {savedProcesses.map(proc => (
                                    <div key={proc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{proc.name}</h4>
                                            <div className="text-xs text-gray-400 flex gap-2">
                                                <span className="font-mono">{proc.id}</span>
                                                <span>•</span>
                                                <span>{new Date(proc.updated_at).toLocaleString()}</span>
                                            </div>
                                            {proc.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{proc.description}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleLoadProcess(proc.id)}
                                            className="bg-sw-teal text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sw-tealHover opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Load
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ModalWrapper>
            )}

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

            {showDiscovery && (
                <ModalWrapper
                    title="Workshop Review Mode"
                    icon={MessageSquare}
                    onClose={() => setShowDiscovery(false)}
                    modalSize={{ width: 1000, height: 700 }}
                    onResizeStart={() => { }}
                >
                    <div className="mb-4">
                        <p className="text-gray-500 text-sm">Upload meeting transcripts to analyze discrepancies and improvements.</p>
                    </div>
                    <div className="grid grid-cols-12 gap-8 h-[calc(100%-40px)]">
                        {/* LEFT COLUMN: Controls & Status */}
                        <div className="col-span-4 flex flex-col gap-6 border-r border-gray-200 pr-6">

                            {/* Upload / Input Area */}
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors group relative">
                                <UploadCloud size={40} className="text-gray-300 group-hover:text-sw-teal mb-3" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Upload Transcript</span>
                                <span className="text-[10px] text-gray-400">txt, docx, pdf supported</span>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    title="Paste text here"
                                />
                            </div>

                            <button
                                onClick={() => setTranscript(demoTranscript)}
                                className="text-xs font-bold text-sw-teal hover:underline flex items-center justify-center gap-1"
                            >
                                <Plus size={10} /> Load Sample Transcript
                            </button>

                            {/* Controls */}
                            <button
                                onClick={handleAnalyzeDiscovery}
                                disabled={isAnalyzingDiscovery || !transcript.trim()}
                                className="w-full bg-sw-teal text-white py-3 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
                            >
                                {isAnalyzingDiscovery ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                Analyze
                            </button>

                            {/* Stats / Log */}
                            <div className="mt-4 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Activity Log</h4>
                                    <div className="space-y-2">
                                        {discoverySuggestions.length > 0 ? (
                                            <div className="flex items-center gap-2 text-sm text-green-700">
                                                <CheckCircle size={16} /> Analysis Complete
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Clock size={16} /> Waiting for input...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {discoverySuggestions.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Review Progress</h4>
                                        <div className="flex justify-between items-center text-sm mb-2 font-bold text-gray-700">
                                            <span>Changes Applied</span>
                                            <span>{appliedCount} / {discoverySuggestions.length}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sw-teal transition-all duration-500"
                                                style={{ width: `${(appliedCount / discoverySuggestions.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Feed */}
                        <div className="col-span-8 flex flex-col h-full overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-800">Change Request Feed</h3>
                                {activeSuggestions.length > 0 && (
                                    <span className="bg-sw-red text-white text-xs font-bold px-2 py-1 rounded-full">{activeSuggestions.length} Pending</span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {isAnalyzingDiscovery && (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                                        ))}
                                    </div>
                                )}

                                {!isAnalyzingDiscovery && activeSuggestions.length === 0 && appliedCount === 0 && (
                                    <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                        <p>No suggestions available.</p>
                                    </div>
                                )}

                                {!isAnalyzingDiscovery && activeSuggestions.length === 0 && appliedCount > 0 && (
                                    <div className="text-center py-20 text-gray-400 bg-green-50 rounded-xl border border-green-100">
                                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                                        <p className="text-green-800 font-bold">All caught up!</p>
                                        <p className="text-xs text-green-600">Review completed successfully.</p>
                                    </div>
                                )}

                                {activeSuggestions.map((sugg) => (
                                    <div key={sugg.id} className="bg-white p-5 rounded-xl shadow-card border border-gray-200 hover:shadow-lg transition-all group flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                {sugg.type === 'remove' ? (
                                                    <div className="p-2 bg-red-100 text-sw-red rounded-lg"><Trash2 size={18} /></div>
                                                ) : sugg.type === 'add' ? (
                                                    <div className="p-2 bg-green-100 text-green-700 rounded-lg"><Plus size={18} /></div>
                                                ) : (
                                                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Edit2 size={18} /></div>
                                                )}

                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-base">
                                                        {sugg.type === 'remove' && "Remove"}
                                                        {sugg.type === 'add' && "Add"}
                                                        {sugg.type === 'modify' && "Update"}
                                                        <span className="ml-1">'{sugg.targetLabel || sugg.newElement?.label}'</span>
                                                    </h4>
                                                    {sugg.type === 'remove' && <span className="text-xs font-bold text-sw-red uppercase tracking-wide">Remove Field</span>}
                                                    {sugg.type === 'add' && <span className="text-xs font-bold text-green-600 uppercase tracking-wide">New Field</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setDismissedIds(prev => [...prev, sugg.id])}
                                                className="text-xs font-bold text-gray-400 hover:text-gray-600"
                                            >
                                                REMOVE
                                            </button>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-300 italic text-gray-600 text-sm">
                                            "{sugg.reasoning}"
                                        </div>

                                        <div className="flex gap-3 mt-1">
                                            <button
                                                onClick={() => handleApplySuggestion(sugg)}
                                                className="flex-1 bg-sw-teal text-white py-2.5 rounded-lg font-bold text-sm hover:bg-sw-tealHover flex items-center justify-center gap-2 transition-colors shadow-sm"
                                            >
                                                <CheckCircle size={16} /> Apply Change
                                            </button>
                                            <button
                                                onClick={() => setDismissedIds(prev => [...prev, sugg.id])}
                                                className="px-4 py-2.5 rounded-lg font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </>
    );
};
