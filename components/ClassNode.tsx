
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, ChevronDown, ChevronRight, Box, Code } from 'lucide-react';

export interface ClassNodeData extends Record<string, unknown> {
    label: string;
    fullClassName: string;
    layer: string;
    properties: Array<{ name: string; type: string }>;
    isRoot: boolean;
}

const ClassNode = ({ data }: { data: ClassNodeData }) => {
    const [expanded, setExpanded] = useState(false);

    // Color coding based on layer
    const getHeaderColor = () => {
        if (data.layer.includes('Case')) return 'bg-blue-600 border-blue-700 text-white';
        if (data.layer.includes('Data')) return 'bg-teal-600 border-teal-700 text-white';
        if (data.layer.includes('Int')) return 'bg-purple-600 border-purple-700 text-white';
        return 'bg-gray-600 border-gray-700 text-white';
    };

    return (
        <div className="shadow-lg rounded-lg bg-white border border-gray-300 w-64 text-xs font-sans overflow-hidden transition-all hover:shadow-xl">
            <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-1 !rounded-sm" />

            {/* Header */}
            <div
                className={`p-2 border-b flex justify-between items-center cursor-pointer ${getHeaderColor()}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Database size={14} className="shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold truncate">{data.label}</span>
                        <span className="text-[9px] opacity-80 truncate">{data.fullClassName}</span>
                    </div>
                </div>
                {data.properties.length > 0 && (
                    <div className="shrink-0">
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                )}
            </div>

            {/* Properties List */}
            {expanded && (
                <div className="bg-gray-50 max-h-48 overflow-y-auto divide-y divide-gray-100 animate-in slide-in-from-top-2 duration-200">
                    {data.properties.map((prop, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${prop.name.startsWith('py') || prop.name.startsWith('px') ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                                <span className="text-gray-700 font-medium truncate max-w-[120px]" title={prop.name}>{prop.name}</span>
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono bg-gray-200 px-1 rounded">{prop.type}</span>
                        </div>
                    ))}
                    {data.properties.length === 0 && (
                        <div className="p-3 text-center text-gray-400 italic">No properties mapped</div>
                    )}
                </div>
            )}

            {/* Footer / Summary if collapsed */}
            {!expanded && data.properties.length > 0 && (
                <div className="px-2 py-1 bg-white flex justify-between items-center text-[9px] text-gray-500">
                    <span>{data.properties.length} properties</span>
                    <Box size={10} />
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-1 !rounded-sm" />
        </div>
    );
};

export default ClassNode;
