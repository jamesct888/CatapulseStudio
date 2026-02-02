
import React, { useMemo, useEffect, useState } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, BackgroundVariant, Node, Edge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ToggleLeft, ToggleRight, Layers } from 'lucide-react';

import ClassNode from './ClassNode';
import { getLayoutedElements } from './diagramLayout';
import { DataObjectSuggestion, DictionaryEntry } from '../types';

interface ClassDiagramProps {
    dataSuggestions: DataObjectSuggestion[];
    dictionary: DictionaryEntry[];
    baseClass: string;
}

const nodeTypes = {
    classNode: ClassNode,
};

const ClassDiagram: React.FC<ClassDiagramProps> = ({ dataSuggestions, dictionary, baseClass }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [showAllClasses, setShowAllClasses] = useState(false);

    useEffect(() => {
        const layout = getLayoutedElements(dataSuggestions, dictionary, baseClass, showAllClasses);
        setNodes(layout.nodes);
        setEdges(layout.edges);
    }, [dataSuggestions, dictionary, baseClass, showAllClasses, setNodes, setEdges]);

    return (
        <div className="h-full w-full bg-gray-50 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gray-50"
                minZoom={0.1}
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
                <Panel position="top-right" className="bg-white p-2 rounded shadow border border-gray-200 flex items-center gap-2">
                    <button
                        onClick={() => setShowAllClasses(!showAllClasses)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showAllClasses ? 'bg-sw-teal text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Layers size={14} />
                        Show Full Dictionary
                        {showAllClasses ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <div className="text-[10px] text-gray-400 border-l pl-2 ml-1">
                        {nodes.length} Classes
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export default ClassDiagram;
