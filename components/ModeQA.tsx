
import React from 'react';
import { ProcessDefinition, TestCase, UserStory, StoryStrategy } from '../types';
import { BookOpen, ClipboardList, RefreshCw, Sparkles, Split } from 'lucide-react';
import { generateUserStories, generateTestCases } from '../services/geminiService';

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

    const handleGenerateStories = async () => {
        setIsGenerating(true);
        const stories = await generateUserStories(processDef, storyStrategy);
        setUserStories(stories);
        setIsGenerating(false);
    };

    const handleGenerateTests = async () => {
        setIsGenerating(true);
        const cases = await generateTestCases(processDef);
        setTestCases(cases);
        setIsGenerating(false);
    }

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
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <Split size={18} />
                            Strategy:
                        </div>
                        <select 
                            value={storyStrategy} 
                            onChange={(e) => setStoryStrategy(e.target.value as StoryStrategy)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-sw-teal focus:border-sw-teal"
                        >
                            <option value="screen">By Screen / Component</option>
                            <option value="journey">By User Journey (End-to-End)</option>
                            <option value="persona">By Persona / Role</option>
                        </select>
                        <button 
                            onClick={handleGenerateStories}
                            disabled={isGenerating}
                            className="ml-auto bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                            Generate Stories
                        </button>
                    </div>

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
                                No stories generated yet. Select a strategy and click Generate.
                            </div>
                        )}
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
