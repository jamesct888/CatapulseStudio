import React, { useState } from 'react';
import { UserStory } from '../types';
import { RefreshCw, Copy, FileText } from 'lucide-react';
import { MarkdownRenderer } from './shared/MarkdownRenderer';

interface StoryCardProps {
    story: UserStory;
    onUpdate: (s: UserStory) => void;
    onRefresh: (s: UserStory) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onUpdate, onRefresh }) => {
    const [isEditingId, setIsEditingId] = useState(false);
    const [tempId, setTempId] = useState(story.jiraId || '');

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

                    {story.jiraId && (window as any).CATAPULSE_APP_CONFIG?.aiEnabled === true && (
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
