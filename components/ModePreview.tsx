
import React, { useState, useEffect } from 'react';
import { ProcessDefinition, FormState, VisualTheme } from '../types';
import { isElementVisible, isElementRequired, isSectionVisible, validateValue, evaluateLogicGroup, getLogicExplanation, getCalculationExplanation, doesDependsOn } from '../utils/logic';
import { RenderElement } from './FormElements';
import { generateFormData } from '../services/geminiService';
import { User, Sparkles, PanelBottom, ArrowRight, AlertTriangle, Info, Shield, ChevronRight, ArrowLeft, Check, FastForward, Eye, EyeOff, Map, Link2 } from 'lucide-react';
import { OperationsHUD } from './OperationsHUD';

import { UserStory } from '../types'; // Import UserStory

interface ModePreviewProps {
    processDef: ProcessDefinition;
    formData: FormState;
    setFormData: React.Dispatch<React.SetStateAction<FormState>>;
    formErrors: { [key: string]: string };           // <--- New Prop
    setFormErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>; // <--- New Prop
    visualTheme: VisualTheme;
    personaPrompt: string;
    setPersonaPrompt: (val: string) => void;
    userStories: UserStory[];
}

export const ModePreview: React.FC<ModePreviewProps> = ({
    processDef, formData, setFormData, formErrors, setFormErrors, visualTheme, personaPrompt, setPersonaPrompt, userStories
}) => {
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    // Removed local formErrors state
    const [isGenerating, setIsGenerating] = useState(false);
    const [historyStack, setHistoryStack] = useState<number[]>([0]);

    // HUD State
    const [isHudEnabled, setIsHudEnabled] = useState(true);
    const [hudVisible, setHudVisible] = useState(false);
    const [storyOverlayVisible, setStoryOverlayVisible] = useState(false); // Story Overlay Toggle
    const [activeSkill, setActiveSkill] = useState<string>('');
    const [skillReason, setSkillReason] = useState<string>('');

    const currentStage = processDef.stages[currentStageIdx];
    const visibleSections = currentStage.sections.filter(sec => isSectionVisible(sec, formData));

    const isType2 = visualTheme.mode === 'type2';
    const isType3 = visualTheme.mode === 'type3';

    // Logic Debug State
    const [isLogicDebugEnabled, setIsLogicDebugEnabled] = useState(false);
    const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);

    // 1. Calculate Active Skill (Runs on Data or Stage Change)
    useEffect(() => {
        if (!currentStage) return;

        let foundSkill = currentStage.defaultSkill || '';
        let foundReason = '';

        if (currentStage.skillLogic && currentStage.skillLogic.length > 0) {
            for (const rule of currentStage.skillLogic) {
                if (evaluateLogicGroup(rule.logic, formData)) {
                    foundSkill = rule.requiredSkill;
                    foundReason = "Logic match found";
                    break;
                }
            }
        }

        // Default state if no match found
        if (!foundSkill) {
            foundSkill = "No routing defined";
            foundReason = "Standard processing";
        }

        setActiveSkill(foundSkill);
        setSkillReason(foundReason);
    }, [currentStage, formData, processDef]);

    // 2. Trigger HUD Visibility (Runs ONLY on Stage Change or Toggle)
    useEffect(() => {
        if (isHudEnabled) {
            setHudVisible(true);
        } else {
            setHudVisible(false);
        }
    }, [currentStageIdx, isHudEnabled]);

    // --- STAGE NAVIGATION LOGIC (Recursive Skip Check) ---

    const getNextValidStageIndex = (startIndex: number): number | null => {
        if (startIndex >= processDef.stages.length) return null; // End of process

        const stage = processDef.stages[startIndex];
        // Skip logic: If skipLogic evaluates to TRUE, we skip this stage
        const shouldSkip = stage.skipLogic && evaluateLogicGroup(stage.skipLogic, formData);

        if (shouldSkip) {
            console.log(`Skipping Stage: ${stage.title}`);
            return getNextValidStageIndex(startIndex + 1);
        }
        return startIndex;
    };

    const handleNext = () => {
        const errors: { [key: string]: string } = {};
        let isValid = true;

        visibleSections.forEach(sec => {
            // Skip validation for read-only sections
            if (sec.variant === 'warning' || sec.variant === 'info' || sec.variant === 'summary') return;

            sec.elements.forEach(el => {
                if (isElementVisible(el, formData)) {
                    if (isElementRequired(el, formData) && (formData[el.id] === undefined || formData[el.id] === '')) {
                        errors[el.id] = "This field is required";
                        isValid = false;
                    }
                    if (el.validation && el.validation.type !== 'none') {
                        const valMsg = validateValue(el, formData[el.id]);
                        if (valMsg) {
                            errors[el.id] = valMsg;
                            isValid = false;
                        }
                    }
                }
            });
        });

        setFormErrors(errors);

        if (isValid) {
            const nextIndex = getNextValidStageIndex(currentStageIdx + 1);

            if (nextIndex !== null) {
                setHistoryStack(prev => [...prev, nextIndex]);
                setCurrentStageIdx(nextIndex);
                window.scrollTo(0, 0);
            } else {
                alert("Process Completed!");
            }
        }
    };

    const handleBack = () => {
        if (historyStack.length > 1) {
            const newStack = [...historyStack];
            newStack.pop(); // Remove current
            const prevIndex = newStack[newStack.length - 1]; // Peek previous
            setHistoryStack(newStack);
            setCurrentStageIdx(prevIndex);
        } else {
            // Fallback if stack is empty (shouldn't happen)
            setCurrentStageIdx(0);
        }
    };

    const handleAutoFill = async () => {
        setIsGenerating(true);
        try {
            const data = await generateFormData(processDef, personaPrompt || "Standard user");
            if (data) {
                setFormData(prev => ({ ...prev, ...data }));
                setFormErrors({});
            } else {
                alert("Failed to generate data.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating persona data.");
        } finally {
            setIsGenerating(false);
        }
    }

    // --- Theme Classes ---

    const stageHeaderBg = isType2
        ? 'bg-[#e61126]'
        : isType3
            ? 'bg-[#006a4d]'
            : 'bg-sw-teal';

    const sectionTitleColor = isType2
        ? 'text-[#e61126]'
        : isType3
            ? 'text-[#006a4d]'
            : 'text-gray-800';

    const pageBg = isType2
        ? 'bg-[#e0e0e0]'
        : isType3
            ? 'bg-[#f1f1f1]'
            : 'bg-sw-lighterGray';

    // Text Colors
    const headerTextColor = isType2
        ? 'text-[#0b3239]'
        : isType3
            ? 'text-[#006a4d]'
            : 'text-sw-teal';

    const primaryButtonClass = isType2
        ? 'bg-[#0b3239] hover:bg-[#062126] text-white'
        : isType3
            ? 'bg-[#006a4d] hover:bg-[#00482f] text-white'
            : 'bg-sw-red hover:bg-sw-redHover text-white';

    const backButtonClass = isType2
        ? 'text-gray-500 hover:text-[#e61126]'
        : isType3
            ? 'text-gray-500 hover:text-[#006a4d]'
            : 'text-gray-500 hover:text-sw-teal';

    const cardClass = isType2
        ? 'bg-white border border-[#e0e0e0] shadow-sm rounded-xl'
        : isType3
            ? 'bg-white border border-gray-200 shadow-sm rounded-xl'
            : 'bg-white border border-gray-100 shadow-sm rounded-xl';

    return (
        <div className={`h-full overflow-y-auto ${pageBg}`}>
            <div className="w-[80%] max-w-[1000px] mx-auto py-12 px-6 relative flex flex-col gap-8 pb-32">
                <OperationsHUD
                    key={`${currentStageIdx}-${isHudEnabled}`}
                    isVisible={hudVisible}
                    requiredSkill={activeSkill}
                    reason={skillReason}
                    onDismiss={() => setHudVisible(false)}
                />

                {/* Top Navigation Bar */}
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h2 className={`text-3xl font-serif ${headerTextColor}`}>{processDef.name}</h2>

                        <div className={`flex gap-2 items-center p-2 rounded-xl border shadow-sm ${isType2 ? 'bg-white border-white' : 'bg-white border-gray-200'}`}>
                            <button
                                onClick={() => setIsLogicDebugEnabled(!isLogicDebugEnabled)}
                                className={`p-2 rounded-lg transition-all flex items-center justify-center ${isLogicDebugEnabled ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={isLogicDebugEnabled ? "Logic Debug: ON" : "Logic Debug: OFF"}
                            >
                                {isLogicDebugEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button
                                onClick={() => setIsHudEnabled(!isHudEnabled)}
                                className={`p-2 rounded-lg transition-all flex items-center justify-center ${isHudEnabled ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={isHudEnabled ? "Operations HUD: ON" : "Operations HUD: OFF"}
                            >
                                <Shield size={16} />
                            </button>
                            <button
                                onClick={() => setStoryOverlayVisible(!storyOverlayVisible)}
                                className={`p-2 rounded-lg transition-all flex items-center justify-center ${storyOverlayVisible ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={storyOverlayVisible ? "Story Coverage: ON" : "Story Coverage: OFF"}
                            >
                                <PanelBottom size={16} />
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>

                            <User size={16} className={'text-gray-400 ml-1'} />
                            <input
                                type="text"
                                value={personaPrompt}
                                onChange={(e) => setPersonaPrompt(e.target.value)}
                                placeholder="Persona (e.g. Married, High Value)..."
                                className={`text-sm border-none focus:ring-0 w-48 bg-transparent placeholder-gray-400 text-sw-text`}
                            />
                            <button
                                onClick={handleAutoFill}
                                disabled={isGenerating}
                                className="text-xs bg-sw-purpleLight text-sw-teal font-bold px-3 py-1.5 rounded-lg hover:bg-sw-teal hover:text-white transition-colors flex items-center gap-1"
                            >
                                <Sparkles size={12} /> Auto-Fill
                            </button>
                        </div>
                    </div>

                    {/* Breadcrumb Trail */}
                    <nav className="flex items-center space-x-2 text-sm overflow-x-auto pb-2 scrollbar-none">
                        {processDef.stages.map((s, i) => {
                            const isPast = historyStack.includes(i) && i !== currentStageIdx;
                            const isCurrent = i === currentStageIdx;
                            const isSkipped = s.skipLogic && evaluateLogicGroup(s.skipLogic, formData);

                            const activeText = isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal';
                            const activeBg = isType2 ? 'bg-[#e61126]' : isType3 ? 'bg-[#006a4d]' : 'bg-sw-teal';
                            const activeBorder = isType2 ? 'border-[#e61126]' : isType3 ? 'border-[#006a4d]' : 'border-sw-teal';

                            if (isSkipped && !isCurrent) {
                                return (
                                    <React.Fragment key={s.id}>
                                        <div className="flex items-center gap-2 opacity-30 grayscale cursor-not-allowed text-gray-400">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-gray-300 bg-gray-100">
                                                <FastForward size={10} />
                                            </div>
                                            <span className="line-through decoration-gray-400">{s.title}</span>
                                        </div>
                                        {i < processDef.stages.length - 1 && <ChevronRight size={14} className="text-gray-200 shrink-0" />}
                                    </React.Fragment>
                                );
                            }

                            return (
                                <React.Fragment key={s.id}>
                                    <button
                                        onClick={() => {
                                            if (isPast) {
                                                // Find index in history to slice stack
                                                const histIdx = historyStack.indexOf(i);
                                                if (histIdx !== -1) {
                                                    setHistoryStack(historyStack.slice(0, histIdx + 1));
                                                    setCurrentStageIdx(i);
                                                }
                                            }
                                        }}
                                        disabled={!isPast}
                                        className={`flex items-center gap-2 whitespace-nowrap transition-colors ${isPast ? 'cursor-pointer hover:opacity-70' : 'cursor-default'} ${isCurrent ? `font-bold ${activeText}` : isPast ? 'text-gray-500' : 'text-gray-300'}`}
                                    >
                                        <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all
                                    ${isPast
                                                ? `${activeBg} text-white border-transparent`
                                                : isCurrent
                                                    ? `bg-white ${activeText} ${activeBorder} ring-2 ring-offset-1 ${isType2 ? 'ring-[#e61126]/20' : isType3 ? 'ring-[#006a4d]/20' : 'ring-sw-teal/20'}`
                                                    : 'bg-transparent border-gray-300'
                                            }
                                `}>
                                            {isPast ? <Check size={12} strokeWidth={3} /> : i + 1}
                                        </div>
                                        <span>{s.title}</span>
                                    </button>
                                    {i < processDef.stages.length - 1 && (
                                        <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </nav>
                </div>

                {/* Stage Title Banner */}
                <div className={`p-6 rounded-xl shadow-md ${stageHeaderBg} text-white flex justify-between items-center`}>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80 block mb-1">Current Stage</span>
                        <h3 className="text-2xl font-bold">{currentStage.title}</h3>
                    </div>
                    <div className="text-4xl font-serif opacity-20">{currentStageIdx + 1}</div>
                </div>

                {/* Sections List - Separated Cards */}
                <div className="flex flex-col gap-8">
                    {visibleSections.map(section => (
                        <MemoizedSection
                            key={section.id}
                            section={section}
                            formData={formData}
                            setFormData={setFormData}
                            formErrors={formErrors}
                            setFormErrors={setFormErrors}
                            visualTheme={visualTheme}
                            sectionTitleColor={sectionTitleColor}
                            cardClass={cardClass}
                            isLogicDebugEnabled={isLogicDebugEnabled}
                            allElements={processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements)}
                        />
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-4 mt-8 flex justify-between items-center bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl z-20">
                    <button
                        onClick={handleBack}
                        disabled={currentStageIdx === 0}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${backButtonClass}`}
                    >
                        <ArrowLeft size={18} /> Back
                    </button>

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:block">
                        Stage {currentStageIdx + 1}
                    </div>

                    {/* Routing Forecast */}
                    {isLogicDebugEnabled && (
                        <div className="absolute -top-12 right-0 bg-white border border-gray-200 shadow-lg p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 z-30">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Map size={16} />
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Routing Forecast</div>
                                {(() => {
                                    const nextIdx = getNextValidStageIndex(currentStageIdx + 1);
                                    if (nextIdx === null) return <div className="text-sm font-bold text-gray-800">Finish Application</div>;

                                    const skippedCount = nextIdx - (currentStageIdx + 1);
                                    const nextStage = processDef.stages[nextIdx];

                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">Next: {nextStage.title}</span>
                                            {skippedCount > 0 && (
                                                <span className="text-[10px] text-orange-600 font-bold flex items-center justify-end gap-1">
                                                    <FastForward size={8} /> Skips {skippedCount} Stage{skippedCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 ${primaryButtonClass}`}
                    >
                        {getNextValidStageIndex(currentStageIdx + 1) === null ? 'Submit Application' : 'Next Step'}
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Summary Footer Sections */}
                {processDef.stages
                    .filter((_, idx) => idx <= currentStageIdx)
                    .flatMap(s => s.sections)
                    .filter(s => s.variant === 'summary' && isSectionVisible(s, formData))
                    .length > 0 && (
                        <div className="mt-8 space-y-4 pt-8 border-t border-gray-200/50">
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Application Summary</h5>
                            {processDef.stages
                                .filter((_, idx) => idx <= currentStageIdx)
                                .flatMap(s => s.sections)
                                .filter(s => s.variant === 'summary' && isSectionVisible(s, formData))
                                .map(summarySec => (
                                    <div key={summarySec.id} className={`${isType2 ? 'bg-white border-[#ffe2e8]' : isType3 ? 'bg-white border-gray-200' : 'bg-sw-teal/5 border-sw-teal/20'} border rounded-xl p-6`}>
                                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isType2 ? 'text-[#e61126]' : isType3 ? 'text-[#006a4d]' : 'text-sw-teal'}`}>
                                            <PanelBottom size={14} /> {summarySec.title}
                                        </h4>
                                        <div className={`grid gap-4 ${summarySec.layout === '2col' ? 'grid-cols-2' : summarySec.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                                            {summarySec.elements.filter(el => isElementVisible(el, formData)).map(el => {
                                                // Ensure data is pulled for reflection fields in summary
                                                let elementValue = formData[el.id];
                                                if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                                                    elementValue = formData[el.sourceFieldId];
                                                }
                                                return (
                                                    <RenderElement key={el.id} element={el} value={elementValue} onChange={() => { }} disabled theme={{ ...visualTheme, density: 'compact', radius: 'small' }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
            </div>

            {/* Story Coverage Overlay */}
            {storyOverlayVisible && (
                <div className="fixed top-24 right-6 w-80 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-blue-200 p-4 z-50 animate-in fade-in slide-in-from-right-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                        <PanelBottom size={14} /> Story Coverage
                    </h4>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                        {userStories.filter(s => s.relatedStageIds?.includes(currentStage.id)).length === 0 ? (
                            <div className="text-sm text-gray-400 italic text-center py-4">No stories linked to this stage.</div>
                        ) : (
                            userStories
                                .filter(s => s.relatedStageIds?.includes(currentStage.id))
                                .map(story => (
                                    <div key={story.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 rounded">{story.jiraId || story.id}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${story.status === 'Done' ? 'bg-green-100 text-green-700' :
                                                story.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                {story.status || 'To Do'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-gray-800 line-clamp-2" title={story.title}>{story.title}</p>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
// --- Memoized Components ---

interface SectionProps {
    section: any;
    formData: FormState;
    setFormData: React.Dispatch<React.SetStateAction<FormState>>;
    formErrors: { [key: string]: string };
    setFormErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    visualTheme: VisualTheme;
    sectionTitleColor: string;
    cardClass: string;
    isLogicDebugEnabled: boolean;
    allElements: any[];
    hoveredFieldId: string | null;
    setHoveredFieldId: (id: string | null) => void;
}

const SectionComponent: React.FC<SectionProps> = ({
    section, formData, setFormData, formErrors, setFormErrors, visualTheme, sectionTitleColor, cardClass, isLogicDebugEnabled, allElements, hoveredFieldId, setHoveredFieldId
}) => {
    // Filter out 'Summary' sections from main flow
    if (section.variant === 'summary') return null;

    // Check if this is a 'Warning' or 'Info' section
    const isWarning = section.variant === 'warning';
    const isInfo = section.variant === 'info';

    // Logic Debug for SECTIONS
    const sectionVisible = isSectionVisible(section, formData);
    if (!sectionVisible && !isLogicDebugEnabled) return null; // Hidden and not debugging

    const isHiddenDebug = !sectionVisible && isLogicDebugEnabled;
    const hasLogic = section.visibility && (section.visibility.conditions?.length > 0 || section.visibility.groups?.length > 0);
    const isVisibleDebug = sectionVisible && isLogicDebugEnabled && hasLogic;

    // Check Section Dependency
    const isSectionDependent = isLogicDebugEnabled && hoveredFieldId && section.visibility && doesDependsOn(section.visibility, hoveredFieldId);

    const debugTrace = (isHiddenDebug || isVisibleDebug) ? getLogicExplanation(section.visibility, formData, allElements) : null;


    // ... Existing Warning/Info Block Logic ...
    if (section.variant === 'warning' || section.variant === 'info') {
        return (
            <div className={`p-6 rounded-xl border shadow-sm relative ${isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} ${isSectionDependent ? 'ring-4 ring-purple-400 ring-offset-2 transition-all' : ''} ${isHiddenDebug ? 'opacity-50 grayscale border-2 border-dashed border-gray-300' : ''}`}>
                {isSectionDependent && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-purple-600 text-white p-1 rounded-full shadow-lg z-20 animate-in zoom-in">
                        <Link2 size={16} />
                    </div>
                )}
                {isHiddenDebug && (
                    <div className="absolute -top-3 left-4 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                        <EyeOff size={10} /> HIDDEN
                    </div>
                )}
                {isVisibleDebug && (
                    <div className="absolute -top-3 right-4 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                        <Eye size={10} /> Logic Match
                    </div>
                )}
                {(isVisibleDebug || isHiddenDebug) && debugTrace && (
                    <div className={`mb-3 p-2 border rounded text-[10px] font-mono ${isVisibleDebug ? 'bg-green-50 border-green-100 text-gray-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        {debugTrace.breakdown.map((b, i) => (
                            <div key={i} className="flex gap-1 items-center">
                                <span className="font-bold flex-1 truncate">{b.label}</span>
                                <span>{b.op}</span>
                                <span className="font-bold">{String(b.target)}</span>
                                <span className={b.passed ? "text-green-600 font-bold" : "text-red-600 font-bold ml-1"}>
                                    {b.passed ? '✅' : `❌ (Act: ${String(b.actual)})`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                    {isWarning ? <AlertTriangle size={20} className="text-amber-600" /> : <Info size={20} className="text-blue-600" />}
                    <h4 className={`font-bold uppercase text-sm tracking-wide ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>{section.title}</h4>
                </div>
                <div className={`grid gap-x-8 gap-y-4 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                    {section.elements.filter((el: any) => isElementVisible(el, formData) || isLogicDebugEnabled).map((el: any) => {
                        let elementValue = formData[el.id];
                        if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                            elementValue = formData[el.sourceFieldId];
                        }
                        return (
                            <RenderElement
                                key={el.id}
                                element={{ ...el, required: false }}
                                value={elementValue}
                                onChange={() => { }}
                                disabled={true}
                                theme={{ ...visualTheme, density: 'compact' }}
                                formData={formData}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Standard Rendering - Card Style
    return (
        <div className={`${cardClass} relative ${isSectionDependent ? 'ring-4 ring-purple-400 ring-offset-2 transition-all' : ''} ${isHiddenDebug ? 'opacity-50 grayscale border-2 border-dashed border-gray-300' : ''}`}>
            {isSectionDependent && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-purple-600 text-white p-1 rounded-full shadow-lg z-20 animate-in zoom-in">
                    <Link2 size={16} />
                </div>
            )}
            {isHiddenDebug && (
                <div className="absolute -top-3 left-4 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                    <EyeOff size={10} /> HIDDEN
                </div>
            )}
            {isVisibleDebug && (
                <div className="absolute -top-3 right-4 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                    <Eye size={10} /> Logic Match
                </div>
            )}
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 rounded-t-xl">
                <h4 className={`font-bold uppercase text-sm tracking-wide ${sectionTitleColor}`}>{section.title}</h4>
                {section.description && <span className="text-xs text-gray-400">{section.description}</span>}
            </div>
            {(isVisibleDebug || isHiddenDebug) && debugTrace && (
                <div className="px-8 pt-2 pb-0">
                    <div className={`p-2 border rounded text-[10px] font-mono ${isVisibleDebug ? 'bg-green-50 border-green-100 text-gray-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        {debugTrace.breakdown.map((b, i) => (
                            <div key={i} className="flex gap-1 items-center">
                                <span className="font-bold flex-1 truncate">{b.label}</span>
                                <span>{b.op}</span>
                                <span className="font-bold">{String(b.target)}</span>
                                <span className={b.passed ? "text-green-600 font-bold" : "text-red-600 font-bold ml-1"}>
                                    {b.passed ? '✅' : `❌ (Act: ${String(b.actual)})`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className={`p-8 grid gap-x-8 gap-y-6 ${section.layout === '2col' ? 'grid-cols-2' : section.layout === '3col' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {section.elements
                    .filter((el: any) => isElementVisible(el, formData) || isLogicDebugEnabled) // SHOW ALL if debug
                    .map((el: any) => {

                        const isVisible = isElementVisible(el, formData);
                        const hasElementLogic = el.visibility && (el.visibility.conditions?.length > 0 || el.visibility.groups?.length > 0);

                        const isDebugHidden = !isVisible && isLogicDebugEnabled;
                        const isDebugVisible = isVisible && hasElementLogic && isLogicDebugEnabled;
                        const isDebugCalc = isVisible && el.type === 'calculated' && isLogicDebugEnabled;

                        const debugTrace = (isDebugHidden || isDebugVisible) ? getLogicExplanation(el.visibility, formData, allElements) : null;
                        const calcTrace = isDebugCalc ? getCalculationExplanation(el.calculation, formData, allElements) : null;

                        // Dependency Highlight
                        const isDependencyMatch = isLogicDebugEnabled && hoveredFieldId && el.visibility && doesDependsOn(el.visibility, hoveredFieldId);

                        // Reflection Logic
                        let elementValue = formData[el.id];
                        if (el.type === 'static' && el.staticDataSource === 'field' && el.sourceFieldId) {
                            elementValue = formData[el.sourceFieldId];
                        }

                        return (
                            <div
                                key={el.id}
                                onMouseEnter={() => isLogicDebugEnabled && setHoveredFieldId(el.id)}
                                onMouseLeave={() => isLogicDebugEnabled && setHoveredFieldId(null)}
                                className={`relative transition-all duration-300 ${isDebugHidden ? 'opacity-50 grayscale p-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50' : ''} ${isDependencyMatch ? 'ring-4 ring-purple-400 ring-offset-2 rounded-lg bg-purple-50/50' : ''}`}
                            >
                                {isDependencyMatch && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-in zoom-in slide-in-from-bottom-2">
                                        <Link2 size={10} /> Linked Logic
                                    </div>
                                )}
                                {isDebugHidden && (
                                    <div className="absolute -top-2 -right-2 z-10 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow">
                                        HIDDEN
                                    </div>
                                )}
                                {isDebugVisible && (
                                    <div className="absolute -top-2 -right-2 z-10 bg-green-100 text-green-700 border border-green-300 text-[10px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                                        <Check size={8} /> Logic
                                    </div>
                                )}
                                {isDebugCalc && (
                                    <div className="absolute -top-2 -right-12 z-10 bg-blue-100 text-blue-700 border border-blue-300 text-[10px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                                        <Sparkles size={8} /> Formula
                                    </div>
                                )}
                                <RenderElement
                                    element={{ ...el, required: isElementRequired(el, formData) }}
                                    value={elementValue}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, [el.id]: val }));
                                        if (formErrors[el.id]) {
                                            setFormErrors(prev => { const n = { ...prev }; delete n[el.id]; return n; });
                                        }
                                    }}
                                    onBlur={() => {
                                        const msg = validateValue(el, formData[el.id]);
                                        if (msg) setFormErrors(prev => ({ ...prev, [el.id]: msg }));
                                    }}
                                    error={formErrors[el.id]}
                                    theme={visualTheme}
                                    formData={formData}
                                />
                                {(isDebugHidden || isDebugVisible) && debugTrace && (
                                    <div className={`mt-1 p-2 border rounded text-[10px] font-mono ${isDebugVisible ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-gray-600'}`}>
                                        {debugTrace.breakdown.map((b, i) => (
                                            <div key={i} className="flex gap-1 items-center">
                                                <span className="font-bold flex-1 truncate">{b.label}</span>
                                                <span>{b.op}</span>
                                                <span className="font-bold">{String(b.target)}</span>
                                                <span className={b.passed ? "text-green-600 font-bold" : "text-red-600 font-bold ml-1"}>
                                                    {b.passed ? '✅' : `❌ (Act: ${String(b.actual)})`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isDebugCalc && calcTrace && (
                                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800 font-mono">
                                        <div className="font-bold mb-1 border-b border-blue-200 pb-1">
                                            Result: {calcTrace.result}
                                        </div>
                                        <div className="text-gray-500">
                                            {calcTrace.formula}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

const MemoizedSection = React.memo(SectionComponent);
