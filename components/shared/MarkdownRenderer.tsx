import React from 'react';

// Simple Markdown Renderer specifically for GWT stories and Tables
export const MarkdownRenderer: React.FC<{ content: string | undefined }> = ({ content }) => {
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
