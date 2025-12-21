import React from 'react';
import { TableProperties } from 'lucide-react';
import { UserStory } from '../types';

interface DataDictionaryViewProps {
    userStories: UserStory[];
}

export const DataDictionaryView: React.FC<DataDictionaryViewProps> = ({ userStories }) => {

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

    return (
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
    );
};
