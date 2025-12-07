
import React, { useState, useRef, useEffect } from 'react';
import { ProcessDefinition, TestCase, UserStory, StoryStrategy, ChatMessage } from '../types';
import { BookOpen, ClipboardList, RefreshCw, Sparkles, Split, BrainCircuit, ThumbsUp, ThumbsDown, Send, FileText, Bot, User, LayoutGrid, Network } from 'lucide-react';
import { generateUserStories, generateTestCases, consultStrategyAdvisor } from '../services/geminiService';
import { StoryDependencyGraph } from './StoryDependencyGraph';

interface ModeQAProps {
    processDef: ProcessDefinition;
    qaTab: 'stories' | 'cases';
    setQaTab: (val: 'stories' | 'cases') => void;
    storyStrategy: StoryStrategy;
    setStoryStrategy: (val: StoryStrategy) => void;
    userStories: UserStory[];
    setUserStories: React.Dispatch<React.SetStateAction<UserStory[]>>;
    testCases: TestCase[];
    setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
    isGenerating: boolean;
    setIsGenerating: (val: boolean) => void;
}

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
        setIsGenerating(true);
        const stories = await generateUserStories(processDef, storyStrategy);
        setUserStories(stories);
        setIsGenerating(false);
        setShowAdvisor(false);
    };

    const handleGenerateTests = async () => {
        setIsGenerating(true);
        const cases = await generateTestCases(processDef);
        setTestCases(cases);
        setIsGenerating(false);
    }

    const handleInitialAdvisor = async () => {
        if (chatHistory.length > 0) {
            setShowAdvisor(true);
            return;
        }
        setShowAdvisor(true);
        setIsThinking(true);
        const initialPrompt = "Review this process and suggest 3 effective user story splitting strategies. Include specific pros and cons based on the data fields and logic used.";
        const response = await consultStrategyAdvisor(processDef, [], initialPrompt);
        
        setChatHistory([
            { id: '1', role: 'model', text: response.reply, recommendations: response.recommendations }
        ]);
        setIsThinking(false);
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;
        const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage };
        setChatHistory(prev => [...prev, newUserMsg]);
        setInputMessage("");
        setIsThinking(true);

        const response = await consultStrategyAdvisor(processDef, [...chatHistory, newUserMsg], inputMessage);
        
        setChatHistory(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.reply,
            recommendations: response.recommendations
        }]);
        setIsThinking(false);
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-8">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif text-sw-teal">Quality Assurance</h2>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button 
                        onClick={() => setQaTab('stories')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${qaTab === 'stories' ? 'bg-sw-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BookOpen size={16} /> User Stories
                    </button>
                    <button 
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
                                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-sw-teal focus:border-sw-teal w-full"
                                >
                                    <option value="screen">By Screen / Component</option>
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
                                <BrainCircuit size={16}/> Strategy Advisor
                            </button>

                            <button 
                                onClick={handleGenerateStories}
                                disabled={isGenerating}
                                className="ml-auto bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
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
                                                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-sw-teal/10 flex items-center justify-center shrink-0"><Bot size={16} className="text-sw-teal"/></div>}
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
                                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                                            rec.recommendationLevel === 'High' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                                        }`}>
                                                                            {rec.recommendationLevel} Rec
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-2 mb-3">
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><ThumbsUp size={10} /> PROS</span>
                                                                            <ul className="text-[10px] text-gray-600 list-disc ml-3">{rec.pros.slice(0,2).map((p,i)=><li key={i}>{p}</li>)}</ul>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><ThumbsDown size={10} /> CONS</span>
                                                                            <ul className="text-[10px] text-gray-600 list-disc ml-3">{rec.cons.slice(0,2).map((c,i)=><li key={i}>{c}</li>)}</ul>
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
                                                {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><User size={16} className="text-gray-500"/></div>}
                                            </div>
                                        ))}
                                        {isThinking && (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-sw-teal/10 flex items-center justify-center shrink-0"><Bot size={16} className="text-sw-teal"/></div>
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
                                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sw-teal focus:border-transparent"
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
                        <div className="flex justify-end mb-4">
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
                        <StoryDependencyGraph stories={userStories} />
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {userStories.map(story => (
                                <div key={story.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-sw-teal text-white text-xs font-mono px-2 py-1 rounded">{story.id}</span>
                                            <h3 className="font-bold text-gray-800">{story.title}</h3>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ready for Dev</span>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Narrative</h4>
                                            <p className="text-gray-700 italic border-l-4 border-sw-teal pl-4 py-1">{story.narrative}</p>
                                        </div>
                                        {story.dependencies && story.dependencies.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dependencies</h4>
                                                <div className="flex gap-2">
                                                    {story.dependencies.map(dep => (
                                                        <span key={dep} className="text-[10px] bg-sw-purpleLight text-sw-teal px-2 py-1 rounded font-mono font-bold">
                                                            Blocks {dep}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Acceptance Criteria</h4>
                                            <div className="prose prose-sm max-w-none text-gray-700 font-mono text-xs bg-gray-50 p-4 rounded-lg">
                                                <pre className="whitespace-pre-wrap font-sans">{story.acceptanceCriteria}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {userStories.length === 0 && !isGenerating && (
                                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    No stories generated yet. Select a strategy or ask the Advisor for help.
                                </div>
                            )}
                        </div>
                    )}
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
                            {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
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
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                                tc.priority === 'High' ? 'bg-red-100 text-red-600' :
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