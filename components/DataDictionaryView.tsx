import React from 'react';
import { TableProperties, Download } from 'lucide-react';
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

    const handleExportCsv = () => {
        if (dataDictionary.length === 0) {
            alert("No data to export.");
            return;
        }

        // 1. Headers
        const headers = ["Label", "Type", "Required", "Visibility Logic", "Validation", "Options", "Referenced By Stories"];

        // 2. Rows
        const rows = dataDictionary.map(item => {
            const el = item.element;
            return [
                `"${el.label.replace(/"/g, '""')}"`, // Escape quotes
                el.type,
                el.required ? "Yes" : "No",
                `"${(el.visibility || "").replace(/"/g, '""')}"`,
                `"${(el.validation || "").replace(/"/g, '""')}"`,
                `"${(Array.isArray(el.options) ? el.options.join(', ') : (el.options || "")).replace(/"/g, '""')}"`,
                `"${item.stories.join(', ')}"`
            ].join(",");
        });

        // 3. Combine
        const csvContent = [headers.join(","), ...rows].join("\n");

        // 4. Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `data_dictionary_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <TableProperties className="text-sw-teal" />
                        <h3 className="text-xl font-bold text-gray-800">Global Data Dictionary</h3>
                    </div>
                    <button
                        onClick={handleExportCsv}
                        disabled={dataDictionary.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-sw-teal text-white rounded-lg font-bold text-sm hover:bg-sw-tealHover disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Download size={16} />
                        Export to Excel (CSV)
                    </button>
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
