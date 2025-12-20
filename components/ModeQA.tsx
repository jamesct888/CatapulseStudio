
import React, { useState, useRef, useEffect } from 'react';
import { ProcessDefinition, TestCase, UserStory, StoryStrategy, ChatMessage } from '../types';
import { BookOpen, ClipboardList, RefreshCw, Sparkles, Split, BrainCircuit, ThumbsUp, ThumbsDown, Send, FileText, Bot, User, LayoutGrid, Network, Copy, TableProperties, Download, Upload } from 'lucide-react';
import { generateUserStories, generateTestCases, consultStrategyAdvisor } from '../services/geminiService';
import { downloadJiraCsv, parseJiraCsv } from '../utils/jiraExport';
import { StoryDependencyGraph } from './StoryDependencyGraph';
import StoryMapFlow from './StoryMapFlow'; // NEW

// --- Story Card Component ---
// Extracted to handle local state for editing without re-rendering the whole list or using window.prompt
const StoryCard = ({ story, onUpdate, onRefresh }: { story: UserStory, onUpdate: (s: UserStory) => void, onRefresh: (s: UserStory) => void }) => {
    const [isEditingId, setIsEditingId] = React.useState(false);
    const [tempId, setTempId] = React.useState(story.jiraId || '');

    const handleIdSave = () => {
        if (tempId !== story.jiraId) {
            onUpdate({ ...story, jiraId: tempId || undefined });
        }
        setIsEditingId(false);
    };
    const isMerged = story.id === story.jiraId;

    const handleCopy = () => {
        const text = `Title: ${story.title}\nID: ${story.jiraId || story.id}\n\nNarrative:\n${story.narrative}\n\nAcceptance Criteria:\n${Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria.join('\n') : story.acceptanceCriteria}`;
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                    {!isMerged && (
                        <span className="bg-sw-teal text-white text-xs font-mono px-2 py-1 rounded shrink-0">{story.id}</span>
                    )}

                    {/* Jira ID Badge / Editor */}
                    <div className="relative group shrink-0">
                        {isEditingId ? (
                            <input
                                autoFocus
                                type="text"
                                value={tempId}
                                onChange={(e) => setTempId(e.target.value)}
                                onBlur={handleIdSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleIdSave()}
                                className="w-24 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="JIRA-123"
                            />
                        ) : (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTempId(story.jiraId || '');
                                    setIsEditingId(true);
                                }}
                                className="cursor-pointer"
                                title="Click to edit Jira ID"
                            >
                                {story.jiraId ? (
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                                        {story.jiraId}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-50 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                        + Link Jira
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <h3 className="font-bold text-gray-800 text-sm truncate" title={story.title}>{story.title}</h3>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                    <select
                        value={story.status || 'To Do'}
                        onChange={(e) => onUpdate({ ...story, status: e.target.value as any })}
                        className={`text-[10px] font-bold px-2 py-1 rounded border-none focus:ring-1 cursor-pointer transition-colors ${story.status === 'Done' ? 'bg-green-100 text-green-700' :
                            story.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-500'
                            }`}
                    >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>

                    {story.jiraId && (
                        <button
                            onClick={() => onRefresh(story)}
                            className="text-gray-400 hover:text-sw-teal transition-colors p-1 rounded hover:bg-gray-100"
                            title="Refresh Content"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        className="text-gray-400 hover:text-sw-teal transition-colors p-1 rounded hover:bg-gray-100"
                        title="Copy to Clipboard"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[400px]">
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Narrative</h4>
                    <div className="border-l-4 border-sw-teal pl-4 py-1">
                        <MarkdownRenderer content={story.narrative} />
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                        <FileText size={12} /> Acceptance Criteria
                    </h4>
                    <div className="bg-white p-3 rounded border border-gray-100">
                        <MarkdownRenderer content={
                            Array.isArray(story.acceptanceCriteria)
                                ? story.acceptanceCriteria.join('\n')
                                : story.acceptanceCriteria
                        } />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ModeQAProps {
    processDef: ProcessDefinition;
    qaTab: 'stories' | 'cases' | 'dictionary';
    setQaTab: (val: 'stories' | 'cases' | 'dictionary') => void;
    storyStrategy: StoryStrategy;
    setStoryStrategy: (val: StoryStrategy) => void;
    userStories: UserStory[];
    setUserStories: (stories: UserStory[]) => void;
    testCases: TestCase[];
    setTestCases: (cases: TestCase[]) => void;
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;
}

// Simple Markdown Renderer specifically for GWT stories and Tables
const MarkdownRenderer: React.FC<{ content: string | undefined }> = ({ content }) => {
    if (!content) return <span className="text-gray-400 italic">No content available.</span>;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = () => {
        if (tableBuffer.length === 0) return;
        const headers = tableBuffer[0].split('|').map(c => c.trim()).filter(c => c);
        const dataRows = tableBuffer.slice(2).map(line => line.split('|').map(c => c.trim()).filter(c => c));
        elements.push(
            <div key={`tbl-${elements.length}`} className="my-4 overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                        <tr>{headers.map((h, i) => <th key={i} className="px-4 py-2 border-b border-gray-200 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dataRows.map((row, rI) => (
                            <tr key={rI} className="hover:bg-gray-50/50">
                                {row.map((cell, cI) => <td key={cI} className="px-4 py-2 text-gray-600 align-top">{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
        tableBuffer = [];
    };

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('|')) {
            tableBuffer.push(trimmed);
        } else {
            flushTable();
            if (trimmed.startsWith('###')) {
                elements.push(<h4 key={idx} className="font-bold text-gray-800 mt-4 mb-2 border-b border-gray-100 pb-1">{trimmed.replace(/#/g, '').trim()}</h4>);
            } else if (trimmed === '') {
                elements.push(<div key={idx} className="h-2"></div>);
            } else {
                // Improved Bold Parsing
                const parts = line.split(/(\*\*.*?\*\*)/g);
                const renderedLine = parts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pIdx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                });

                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    const content = Array.isArray(renderedLine) && typeof renderedLine[0] === 'string' ?
                        [renderedLine[0].replace(/^[\*\-]\s+/, ''), ...renderedLine.slice(1)] : renderedLine;

                    elements.push(
                        <div key={idx} className="flex gap-2 ml-4">
                            <span className="text-sw-teal">•</span>
                            <span>{content}</span>
                        </div>
                    );
                } else {
                    elements.push(<div key={idx} className="min-h-[1.4em]">{renderedLine}</div>);
                }
            }
        }
    });
    flushTable();
    return <div className="text-sm font-sans text-gray-600 leading-relaxed space-y-1">{elements}</div>;
};

export const ModeQA: React.FC<ModeQAProps> = ({
    processDef, qaTab, setQaTab,
    storyStrategy, setStoryStrategy,
    userStories, setUserStories,
    testCases, setTestCases,
    isGenerating, setIsGenerating
}) => {
    const [showAdvisor, setShowAdvisor] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [storyViewMode, setStoryViewMode] = useState<'list' | 'map'>('list');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleGenerateStories = async () => {
        console.log("--- PROMPT V3 ACTIVE ---");
        setIsGenerating(true);
        try {
            // 1. Identify Locked Stories (those with Jira IDs)
            const lockedStories = userStories.filter(s => s.jiraId);
            const lockedTitles = new Set(lockedStories.map(s => s.title));

            // 2. Generate New Stories
            const newStories = await generateUserStories(processDef, storyStrategy);

            if (newStories && newStories.length > 0) {
                // 3. Filter out new stories that duplicate locked stories (by ID or Title)
                const lockedIds = new Set(lockedStories.map(s => s.id));
                const uniqueNewStories = newStories.filter(s =>
                    !lockedTitles.has(s.title) &&
                    !lockedIds.has(s.id)
                );

                // 4. Merge: Locked + Unique New
                const finalStories = [...lockedStories, ...uniqueNewStories];

                setUserStories(finalStories);
                setShowAdvisor(false);

                if (lockedStories.length > 0) {
                    alert(`Sync Complete:\n- Kept ${lockedStories.length} locked stories (Jira Linked)\n- Added ${uniqueNewStories.length} new generated stories\n- Skipped ${newStories.length - uniqueNewStories.length} duplicates`);
                }
            } else {
                alert("No stories generated. Please try a different strategy.");
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error generating user stories: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefreshStory = async (storyToRefresh: UserStory) => {
        // Change Request Logic
        if (storyToRefresh.status === 'In Progress' || storyToRefresh.status === 'Done') {
            if (!confirm(`Create Change Request for "${storyToRefresh.title}"?\n\nThis story is "${storyToRefresh.status}". We will NOT overwrite it.\nInstead, we will create a NEW "Delta" story for the updates.`)) return;
        } else {
            if (!confirm(`Refresh "${storyToRefresh.title}"?\n\nThis will re-generate the Description, Criteria, and Data Elements based on the current design.\nYour Jira ID (${storyToRefresh.jiraId}) will be preserved.`)) return;
        }

        setIsGenerating(true);
        try {
            // Generate full set (can't target single story easily with current API, so we filter)
            const freshStories = await generateUserStories(processDef, storyStrategy);

            // Find match by Title
            const match = freshStories.find(s => s.title === storyToRefresh.title);

            if (match) {
                if (storyToRefresh.status === 'In Progress' || storyToRefresh.status === 'Done') {
                    // DELTA STORY (Change Request)
                    const deltaStory: UserStory = {
                        ...match,
                        id: `CR-${Math.floor(Math.random() * 1000)}`, // Temp ID
                        title: `Update: ${match.title}`,
                        narrative: `**CHANGE REQUEST**\nThis is an update to locked story ${storyToRefresh.jiraId || storyToRefresh.id}.\n\n${match.narrative}`,
                        status: 'To Do',
                        jiraId: undefined // New story needs new Jira ID
                    };
                    setUserStories([...userStories, deltaStory]);
                    alert(`Change Request Created: "${deltaStory.title}"`);
                } else {
                    // IN-PLACE UPDATE (Safe for To Do)
                    const updatedStories = userStories.map(s => {
                        if (s.id === storyToRefresh.id) {
                            return {
                                ...s,
                                narrative: match.narrative,
                                acceptanceCriteria: match.acceptanceCriteria,
                                dataElements: match.dataElements,
                                // PRESERVE ID and JIRA ID
                            };
                        }
                        return s;
                    });
                    setUserStories(updatedStories);
                    alert(`Story "${storyToRefresh.title}" refreshed successfully!`);
                }
            } else {
                alert(`Could not find a matching story for "${storyToRefresh.title}" in the new generation.\n\nDid you rename the stage? If so, please update the story title matches manually or regenerate all.`);
            }
        } catch (e: any) {
            alert(`Error refreshing story: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Data Dictionary Logic ---
    const dataDictionary = React.useMemo(() => {
        const dict: Record<string, { element: any, stories: string[] }> = {};
        userStories.forEach(story => {
            if (story.dataElements) {
                story.dataElements.forEach(el => {
                    // Unique Key: Label + Type
                    const key = `${el.label}::${el.type}`;
                    if (!dict[key]) {
                        dict[key] = { element: el, stories: [] };
                    }
                    // Add reference if not already present
                    if (!dict[key].stories.includes(story.id)) {
                        dict[key].stories.push(story.id);
                    }
                });
            }
        });
        return Object.values(dict).sort((a, b) => a.element.label.localeCompare(b.element.label));
    }, [userStories]);

    // Jira Import Handler
    const handleJiraImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const map = parseJiraCsv(text);

                if (map.size === 0) {
                    alert("No valid mappings found. Ensure CSV has 'Summary' and 'Key' columns.");
                    return;
                }

                // Update Stories
                const updatedStories = userStories.map(story => {
                    const jiraKey = map.get(story.title); // Match by Title
                    if (jiraKey) {
                        return { ...story, jiraId: jiraKey };
                    }
                    return story;
                });

                setUserStories(updatedStories);
                alert(`Successfully mapped ${map.size} Jira IDs!`);
            } catch (err: any) {
                alert("Error parsing CSV: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleCopyStory = (story: UserStory) => {
        const content = `ID: ${story.id}\nSUMMARY: ${story.title}\n\nNARRATIVE:\n${story.narrative}\n\nACCEPTANCE CRITERIA:\n${Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria.join('\n') : story.acceptanceCriteria}`;
        navigator.clipboard.writeText(content);
        // Could show a toast here, but for now just copy
    };

    const handleGenerateTests = async () => {
        setIsGenerating(true);
        try {
            const cases = await generateTestCases(processDef);
            if (cases && cases.length > 0) {
                setTestCases(cases);
            } else {
                alert("No test cases generated.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating test cases.");
        } finally {
            setIsGenerating(false);
        }
    }

    const handleInitialAdvisor = async () => {
        if (chatHistory.length > 0) {
            setShowAdvisor(true);
            return;
        }
        setShowAdvisor(true);
        setIsThinking(true);
        try {
            const initialPrompt = "Review this process and suggest 3 effective user story splitting strategies. Include specific pros and cons based on the data fields and logic used.";
            const response = await consultStrategyAdvisor(processDef, [], initialPrompt);

            setChatHistory([
                { id: '1', role: 'model', text: response.reply, recommendations: response.recommendations }
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;
        const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage };
        setChatHistory(prev => [...prev, newUserMsg]);
        setInputMessage("");
        setIsThinking(true);

        try {
            const response = await consultStrategyAdvisor(processDef, [...chatHistory, newUserMsg], inputMessage);

            setChatHistory(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.reply,
                recommendations: response.recommendations
            }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="w-full px-8 py-12">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif text-sw-teal">Stories & Test Cases</h2>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        id="tab-qa-stories"
                        onClick={() => setQaTab('stories')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${qaTab === 'stories' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BookOpen size={16} /> User Stories
                    </button>
                    <button
                        id="tab-qa-dictionary"
                        onClick={() => setQaTab('dictionary')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${qaTab === 'dictionary' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <TableProperties size={16} /> Data Dictionary
                    </button>
                    <button
                        id="tab-qa-cases"
                        onClick={() => setQaTab('cases')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${qaTab === 'cases' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <ClipboardList size={16} /> Manual Test Cases
                    </button>
                </div>
            </div>

            {qaTab === 'stories' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                <Split size={18} />
                                Strategy:
                            </div>
                            <div className="relative min-w-[200px]">
                                <select
                                    value={['screen', 'journey', 'persona'].includes(storyStrategy) ? storyStrategy : 'custom'}
                                    onChange={(e) => setStoryStrategy(e.target.value as StoryStrategy)}
                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-sw-teal focus:border-sw-teal w-full text-sw-text"
                                >
                                    <option value="screen">By Screen / Section</option>
                                    <option value="journey">By User Journey</option>
                                    <option value="persona">By Persona</option>
                                    <option value="custom">Custom / AI Selected</option>
                                </select>
                                {!['screen', 'journey', 'persona'].includes(storyStrategy) && (
                                    <div className="text-[10px] text-sw-teal mt-1 font-bold truncate max-w-[300px]">
                                        Active: {storyStrategy.substring(0, 40)}...
                                    </div>
                                )}
                            </div>

                            <div className="h-6 w-px bg-gray-200 mx-2"></div>

                            <button
                                onClick={handleInitialAdvisor}
                                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm ${showAdvisor ? 'bg-sw-teal text-white' : 'bg-sw-purpleLight text-sw-teal hover:bg-sw-teal/10'}`}
                            >
                                <BrainCircuit size={16} /> Strategy Advisor
                            </button>

                            <button
                                onClick={handleGenerateStories}
                                disabled={isGenerating}
                                className="ml-auto bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                Generate Stories
                            </button>
                        </div>

                        {/* Conversational Advisor Panel */}
                        {showAdvisor && (
                            <div className="mt-6 border-t border-gray-100 pt-6 animate-in slide-in-from-top-4 fade-in">
                                <div className="bg-gray-50 rounded-xl border border-gray-200 h-[500px] flex flex-col">
                                    <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sw-teal font-bold">
                                            <Bot size={20} /> AI Strategy Consultant
                                        </div>
                                        <button onClick={() => setShowAdvisor(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                                        {chatHistory.map((msg) => (
                                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-sw-teal/10 flex items-center justify-center shrink-0"><Bot size={16} className="text-sw-teal" /></div>}
                                                <div className={`max-w-[80%] space-y-3`}>
                                                    <div className={`p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sw-teal text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                                        {msg.text}
                                                    </div>

                                                    {/* Render Recommendations if present */}
                                                    {msg.recommendations && msg.recommendations.length > 0 && (
                                                        <div className="grid gap-3">
                                                            {msg.recommendations.map(rec => (
                                                                <div
                                                                    key={rec.id}
                                                                    onClick={() => setStoryStrategy(rec.strategyDescription)}
                                                                    className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md text-left
                                                                        ${storyStrategy === rec.strategyDescription ? 'border-sw-teal ring-1 ring-sw-teal bg-sw-teal/5' : 'border-gray-200 hover:border-sw-teal/30'}
                                                                    `}
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h4 className="font-bold text-gray-800 text-sm">{rec.strategyName}</h4>
                                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${rec.recommendationLevel === 'High' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                                            }`}>
                                                                            {rec.recommendationLevel} Rec
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-2 mb-3">
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><ThumbsUp size={10} /> PROS</span>
                                                                            <ul className="text-[10px] text-gray-600 list-disc ml-3">{rec.pros.slice(0, 2).map((p, i) => <li key={i}>{p}</li>)}</ul>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><ThumbsDown size={10} /> CONS</span>
                                                                            <ul className="text-[10px] text-gray-600 list-disc ml-3">{rec.cons.slice(0, 2).map((c, i) => <li key={i}>{c}</li>)}</ul>
                                                                        </div>
                                                                    </div>
                                                                    <button className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${storyStrategy === rec.strategyDescription ? 'bg-sw-teal text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                                                        {storyStrategy === rec.strategyDescription ? 'Selected Strategy' : 'Select'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><User size={16} className="text-gray-500" /></div>}
                                            </div>
                                        ))}
                                        {isThinking && (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-sw-teal/10 flex items-center justify-center shrink-0"><Bot size={16} className="text-sw-teal" /></div>
                                                <div className="bg-white border border-gray-200 p-4 rounded-xl">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl flex gap-2">
                                        <input
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ask a follow-up question or suggest a hybrid approach..."
                                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sw-teal focus:border-transparent text-sw-text"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!inputMessage.trim() || isThinking}
                                            className="bg-sw-teal text-white p-2 rounded-lg hover:bg-sw-tealHover disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {userStories.length > 0 && (
                        <div className="flex justify-end mb-4 gap-2">
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                id="jira-import-input"
                                accept=".csv"
                                className="hidden"
                                onChange={handleJiraImport}
                            />

                            <button
                                onClick={() => downloadJiraCsv(userStories, storyStrategy)}
                                className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all bg-white border border-gray-200 text-gray-600 hover:text-sw-teal hover:border-sw-teal shadow-sm"
                            >
                                <Download size={14} /> Export to Jira CSV
                            </button>
                            <button
                                onClick={() => document.getElementById('jira-import-input')?.click()}
                                className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all bg-white border border-gray-200 text-gray-600 hover:text-sw-teal hover:border-sw-teal shadow-sm"
                            >
                                <Upload size={14} /> Import Jira IDs
                            </button>
                            <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex">
                                <button
                                    onClick={() => setStoryViewMode('list')}
                                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${storyViewMode === 'list' ? 'bg-sw-teal text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <LayoutGrid size={14} /> List
                                </button>
                                <button
                                    onClick={() => setStoryViewMode('map')}
                                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${storyViewMode === 'map' ? 'bg-sw-teal text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <Network size={14} /> Map
                                </button>
                            </div>
                        </div>
                    )}

                    {storyViewMode === 'map' && userStories.length > 0 ? (
                        <StoryMapFlow stories={userStories} processDef={processDef} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userStories.map(story => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    onUpdate={(updated) => {
                                        // Deep Replace Logic for Jira ID Change
                                        if (updated.jiraId && updated.jiraId !== story.jiraId) {
                                            const oldId = story.id;
                                            const newId = updated.jiraId;

                                            // Auto-confirm if migrating from internal "us_" ID
                                            const isMigration = oldId.startsWith('us_');
                                            const shouldUpdate = isMigration || confirm(`Update Story ID from "${oldId}" to "${newId}" and update all references?`);

                                            if (shouldUpdate) {
                                                // Check for collision (excluding self)
                                                if (userStories.some(s => s.id === newId && s.id !== oldId)) {
                                                    alert(`ID "${newId}" already exists! Please choose a unique Jira ID.`);
                                                    return;
                                                }

                                                const newStories = userStories.map(s => {
                                                    // 1. Update the target story
                                                    if (s.id === oldId) {
                                                        return { ...updated, id: newId };
                                                    }
                                                    // 2. Update dependencies in other stories
                                                    let newDeps = s.dependencies;
                                                    if (s.dependencies && s.dependencies.includes(oldId)) {
                                                        newDeps = s.dependencies.map(d => d === oldId ? newId : d);
                                                    }
                                                    return { ...s, dependencies: newDeps };
                                                });
                                                setUserStories(newStories);
                                            } else {
                                                // Just update the property check
                                                const newStories = userStories.map(s => s.id === updated.id ? updated : s);
                                                setUserStories(newStories);
                                            }
                                        } else {
                                            // Standard Update (Status change, etc)
                                            const newStories = userStories.map(s => s.id === updated.id ? updated : s);
                                            setUserStories(newStories);
                                        }
                                    }}
                                    onRefresh={handleRefreshStory}
                                />
                            ))}
                            {userStories.length === 0 && !isGenerating && (
                                <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    No stories generated yet. Select a strategy or ask the Advisor for help.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {qaTab === 'dictionary' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TableProperties className="text-sw-teal" />
                            <h3 className="text-xl font-bold text-gray-800">Global Data Dictionary</h3>
                        </div>
                        <p className="text-gray-500 text-sm mb-6">Aggregate view of all data elements defined across all user stories.</p>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-gray-200">Label</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Type</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Required</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Visibility Logic</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Validation</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Options</th>
                                        <th className="px-6 py-3 border-b border-gray-200 bg-sw-purpleLight text-sw-teal">Referenced By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {dataDictionary.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-bold text-gray-800">{item.element.label}</td>
                                            <td className="px-6 py-3 font-mono text-sw-teal">{item.element.type}</td>
                                            <td className="px-6 py-3">
                                                {item.element.required ?
                                                    <span className="text-red-600 font-bold uppercase text-xs">Yes</span> :
                                                    <span className="text-gray-400 text-xs">Optional</span>
                                                }
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{item.element.visibility}</td>
                                            <td className="px-6 py-3 font-mono text-xs text-gray-500">{item.element.validation}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={item.element.options}>{item.element.options}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.stories.map(sid => (
                                                        <span key={sid} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono border border-gray-200">
                                                            {sid}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {dataDictionary.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                                                No data elements found. Generate stories first.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {qaTab === 'cases' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-end">
                        <button
                            onClick={handleGenerateTests}
                            disabled={isGenerating}
                            className="bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            Generate Test Cases
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Scenario</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Pre-Conditions</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Expected Result</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Priority</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {testCases.map(tc => (
                                    <tr key={tc.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-sw-teal">{tc.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 text-sm">{tc.title}</div>
                                            <div className="text-xs text-gray-500 mt-1">{tc.description}</div>
                                            <div className="mt-2 text-[10px] bg-gray-100 px-2 py-1 rounded inline-block font-mono text-gray-600">
                                                STEPS: {tc.steps.join(' > ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-600">{tc.preConditions}</td>
                                        <td className="px-6 py-4 text-xs text-gray-600">{tc.expectedResult}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${tc.priority === 'High' ? 'bg-red-100 text-red-600' :
                                                tc.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-green-100 text-green-600'
                                                }`}>
                                                {tc.priority.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {testCases.length === 0 && !isGenerating && (
                            <div className="text-center py-12 text-gray-400">
                                No test cases generated yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
