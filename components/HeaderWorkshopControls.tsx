import React, { useState } from 'react';
import { MessageSquare, UploadCloud, Plus, RefreshCw, Wand2, CheckCircle, Clock, Trash2, Edit2 } from 'lucide-react';
import { ProcessDefinition, WorkshopSuggestion } from '../types';
import { ModalWrapper } from './ModalWrapper';
import { analyzeTranscript } from '../services/geminiService';
import { demoTranscript } from '../services/demoData';

interface HeaderWorkshopControlsProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition | null>>;
}

export const HeaderWorkshopControls: React.FC<HeaderWorkshopControlsProps> = ({
    processDef, setProcessDef
}) => {
    // Workshop Review Mode State
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [discoverySuggestions, setDiscoverySuggestions] = useState<WorkshopSuggestion[]>([]);
    const [isAnalyzingDiscovery, setIsAnalyzingDiscovery] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const activeSuggestions = discoverySuggestions.filter(s => !dismissedIds.includes(s.id) && !s.applied);

    const handleAnalyzeDiscovery = async () => {
        if (!transcript.trim()) return;
        setIsAnalyzingDiscovery(true);
        setDiscoverySuggestions([]);
        setAppliedCount(0);
        setDismissedIds([]);

        try {
            const suggestions = await analyzeTranscript(processDef, transcript);
            setDiscoverySuggestions(suggestions);
        } catch (error) {
            console.error(error);
            alert("Failed to analyze transcript.");
        } finally {
            setIsAnalyzingDiscovery(false);
        }
    };

    const handleApplySuggestion = (suggestion: WorkshopSuggestion) => {
        if (!processDef) return;

        let newDef = { ...processDef };
        let updated = false;

        if (suggestion.type === 'add' && suggestion.newElement) {
            // Find section to add to
            const targetRef = suggestion.newElement.sectionTitle;
            let added = false;

            for (const stage of newDef.stages) {
                if (added) break;
                // If specific section requested
                if (targetRef) {
                    const sectionIdx = stage.sections.findIndex(s => s.title === targetRef);
                    if (sectionIdx !== -1) {
                        stage.sections[sectionIdx].elements.push({
                            id: `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                            ...suggestion.newElement,
                            type: suggestion.newElement.type
                        });
                        added = true;
                    }
                }
            }

            // Fallback: Add to first section of first stage if not found
            if (!added && newDef.stages.length > 0 && newDef.stages[0].sections.length > 0) {
                newDef.stages[0].sections[0].elements.push({
                    id: `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    ...suggestion.newElement,
                    type: suggestion.newElement.type
                });
                added = true;
            }
            updated = added;

        } else if (suggestion.type === 'remove' && suggestion.targetLabel) {
            for (const stage of newDef.stages) {
                for (const section of stage.sections) {
                    const idx = section.elements.findIndex(e => e.label === suggestion.targetLabel);
                    if (idx !== -1) {
                        section.elements.splice(idx, 1);
                        updated = true;
                    }
                }
            }
        } else if (suggestion.type === 'modify' && suggestion.targetLabel && suggestion.updateData) {
            for (const stage of newDef.stages) {
                for (const section of stage.sections) {
                    const idx = section.elements.findIndex(e => e.label === suggestion.targetLabel);
                    if (idx !== -1) {
                        section.elements[idx] = { ...section.elements[idx], ...suggestion.updateData };
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            setProcessDef(newDef);

            // Mark applied
            const newSuggestions = discoverySuggestions.map(s =>
                s.id === suggestion.id ? { ...s, applied: true } : s
            );
            setDiscoverySuggestions(newSuggestions);
            setAppliedCount(prev => prev + 1);
        } else {
            alert("Could not apply change automatically. Target label not found.");
        }
    };

    return (
        <>
            <button
                onClick={() => setShowDiscovery(true)}
                className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-100 rounded-lg transition-colors"
                title="Workshop Review Mode"
            >
                <MessageSquare size={18} />
            </button>

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
                                    className={`absolute inset-0 w-full h-full p-6 text-xs text-gray-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-sw-teal rounded-xl transition-all ${transcript ? 'opacity-100 bg-white z-10' : 'opacity-0 cursor-pointer z-20'}`}
                                    placeholder="Paste transcript here..."
                                    title="Paste transcript here or drag file"
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
