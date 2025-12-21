import React, { useState, useEffect } from 'react';
import {
    Plug, Link2, CloudUpload, CloudDownload, History, Loader2, Database, Copy, RotateCcw, Cloud
} from 'lucide-react';
import { ProcessDefinition } from '../types';
import { ModalWrapper } from './ModalWrapper';
import {
    configureSupabase, disconnectSupabase, isSupabaseConfigured,
    saveProcessToCloud, fetchProcessList, loadProcessFromCloud, fetchProcessHistory,
    SavedProcessMeta, ProcessHistoryEntry
} from '../services/supabaseService';

interface HeaderCloudControlsProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;
}

export const HeaderCloudControls: React.FC<HeaderCloudControlsProps> = ({
    processDef, setProcessDef
}) => {
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

    // Supabase Connection Logic
    const handleConnectSupabase = async () => {
        if (sbUrl && sbKey) {
            const success = configureSupabase(sbUrl, sbKey);
            if (success) {
                setIsSupabaseReady(true);
                setShowConnectionModal(false);
            } else {
                alert("Failed to initialize Supabase client.");
            }
        }
    };

    const handleDisconnectSupabase = () => {
        disconnectSupabase();
        setIsSupabaseReady(false);
        setSbUrl('');
        setSbKey('');
        setShowConnectionModal(false);
    };

    // Cloud Save Logic
    const handleCloudSaveClick = () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
            return;
        }
        setShowSaveModal(true);
    };

    const performCloudSave = async () => {
        if (!processDef) return;
        setIsSaving(true);
        try {
            await saveProcessToCloud(processDef, saveComment || "Manual save");
            setShowSaveModal(false);
            setSaveComment('');
            alert("Saved to Cloud successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to save to cloud.");
        } finally {
            setIsSaving(false);
        }
    };

    // Cloud Load Logic
    const handleCloudLoadList = async () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
            return;
        }
        setShowLoadModal(true);
        setIsLoadingList(true);
        try {
            const { data } = await fetchProcessList();
            if (data) setSavedProcesses(data);
        } catch (error) {
            console.error(error);
            // alert("Failed to fetch process list.");
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleLoadProcess = async (id: string) => {
        try {
            const def = await loadProcessFromCloud(id);
            if (def) {
                setProcessDef(def);
                setShowLoadModal(false);
                // Also reset Time Machine if active
                if (isTimeMachineActive) setIsTimeMachineActive(false);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to load process.");
        }
    };

    // History / Time Machine Logic
    const handleHistoryClick = async () => {
        if (!isSupabaseReady) {
            setShowConnectionModal(true);
            return;
        }

        if (isTimeMachineActive) {
            // Toggle off
            handleExitTimeMachine(false);
            return;
        }

        if (!processDef.id) {
            alert("This process has not been saved to the cloud yet.");
            return;
        }

        setIsLoadingHistory(true);
        try {
            const { data: history } = await fetchProcessHistory(processDef.id);
            if (history && history.length > 0) {
                setHistoryEntries(history);
                setOriginalDef(processDef); // Cache current state
                setIsTimeMachineActive(true);
                // Set scrub to latest (0)
                setScrubIndex(0);
            } else {
                alert("No history found for this process.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to fetch history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleTimeScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        // Map slider (0=Oldest) to Array (0=Newest)
        // Slider max = length - 1
        // scrubIndex (Array Index) = (length - 1) - val
        const arrayIndex = (historyEntries.length - 1) - val;
        setScrubIndex(arrayIndex);

        // Instant Preview
        const entry = historyEntries[arrayIndex];
        if (entry) {
            // We assume entry.process_data is compatible
            setProcessDef(entry.definition as ProcessDefinition);
        }
    };

    const handleExitTimeMachine = (restore: boolean) => {
        if (!restore && originalDef) {
            setProcessDef(originalDef);
        }
        setIsTimeMachineActive(false);
        setOriginalDef(null);
    };

    const sqlSnippet = `
-- Enable Row Level Security (RLS) is recommended but optional for prototype
-- Run this in Supabase SQL Editor to create tables:

create table processes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table process_versions (
  id uuid default gen_random_uuid() primary key,
  process_id uuid references processes(id) on delete cascade not null,
  version_num integer,
  process_data jsonb not null,
  comment text,
  created_at timestamp with time zone default now()
);
`;

    return (
        <>
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

            {/* --- TIME MACHINE UI --- */}
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
                                <div className="mt-2 text-left relative group">
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
        </>
    );
};
