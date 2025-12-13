
import React, { useRef, useState, useEffect } from 'react';
import { CatapulseLogo } from './Shared';
import { Edit3, Play, FileText, CheckSquare, Settings2, Code, Network, Download, Upload, Share, FileJson, MessageSquare, Plus, Trash2, Edit2, ArrowRight, RefreshCw, Wand2, UploadCloud, CheckCircle, Clock, X } from 'lucide-react';
import { ProcessDefinition, VisualTheme, WorkshopSuggestion, ElementDefinition } from '../types';
import { generateStandaloneHTML } from '../services/htmlExporter';
import { ModalWrapper } from './ModalWrapper';
import { importLegacyContent, analyzeTranscript } from '../services/geminiService';
import { demoTranscript } from '../services/demoData';

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
          // 1. Deep clone current process definition to avoid mutation issues
          const newDef = JSON.parse(JSON.stringify(processDef)) as ProcessDefinition;
          let applied = false;
          let errorMsg = '';

          // Helper for robust comparison
          const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';

          if (suggestion.type === 'add' && suggestion.newElement) {
              let targetSection = null;
              
              // Try to find matched section by name
              if (suggestion.newElement.sectionTitle) {
                  const searchTitle = normalize(suggestion.newElement.sectionTitle);
                  for (const stage of newDef.stages) {
                      const found = stage.sections.find((s: any) => normalize(s.title) === searchTitle);
                      if (found) { targetSection = found; break; }
                  }
              }
              
              // Fallback: First section of current stage or first stage
              if (!targetSection && newDef.stages.length > 0) {
                  targetSection = newDef.stages[0].sections[0];
              }

              if (targetSection) {
                  const newEl: ElementDefinition = {
                      id: `el_${Date.now()}_${Math.floor(Math.random()*1000)}`,
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

              // Iterate all sections to find the field (handling duplicates if any)
              for (const stage of newDef.stages) {
                  for (const section of stage.sections) {
                      // Iterate backwards to support splicing safely
                      for (let i = section.elements.length - 1; i >= 0; i--) {
                          const el = section.elements[i];
                          if (normalize(el.label) === target) {
                              if (suggestion.type === 'remove') {
                                  section.elements.splice(i, 1);
                                  foundCount++;
                              } else if (suggestion.type === 'modify' && suggestion.updateData) {
                                  // Sanitize update data - NEVER allow ID overwrite from suggestion
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

  const activeSuggestions = discoverySuggestions.filter(s => !dismissedIds.includes(s.id));

  return (
    <>
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

    {showLegacyImport && (
        <ModalWrapper 
            title="Import Legacy Schema" 
            icon={FileJson} 
            onClose={() => setShowLegacyImport(false)}
            modalSize={{ width: 800, height: 600 }}
            onResizeStart={() => {}}
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
            onResizeStart={() => {}}
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
                        {isAnalyzingDiscovery ? <RefreshCw className="animate-spin" size={18}/> : <Wand2 size={18}/>}
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
                                {[1,2,3].map(i => (
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
                                            <div className="p-2 bg-red-100 text-sw-red rounded-lg"><Trash2 size={18}/></div>
                                        ) : sugg.type === 'add' ? (
                                            <div className="p-2 bg-green-100 text-green-700 rounded-lg"><Plus size={18}/></div>
                                        ) : (
                                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Edit2 size={18}/></div>
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
                                        <CheckCircle size={16}/> Apply Change
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
