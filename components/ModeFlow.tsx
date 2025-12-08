
import React, { useMemo, useState } from 'react';
import { ProcessDefinition, LogicGroup } from '../types';
import { ArrowRight, Eye, GitCommit, Layers, EyeOff } from 'lucide-react';

interface ModeFlowProps {
    processDef: ProcessDefinition;
}

// Layout Configuration
const CFG = {
    stageWidth: 320,
    stageGap: 100,
    stageHeaderHeight: 60,
    sectionPadding: 16,
    sectionHeaderHeight: 40,
    elementHeight: 48,
    elementGap: 12,
    baseX: 60,
    baseY: 60
};

export const ModeFlow: React.FC<ModeFlowProps> = ({ processDef }) => {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [showLogic, setShowLogic] = useState(true);

    // --- 1. Layout Calculation ---
    // We flatten the hierarchy into renderable nodes with absolute coordinates
    const { nodes, edges, mapElIdToNode } = useMemo(() => {
        const nodes: any[] = [];
        const mapElIdToNode: {[id: string]: any} = {};
        
        let currentStageX = CFG.baseX;

        processDef.stages.forEach((stage, sIdx) => {
            let currentY = CFG.baseY + CFG.stageHeaderHeight;
            
            // Render Stage Node (Container)
            const stageNode = {
                id: stage.id,
                type: 'stage',
                data: stage,
                x: currentStageX,
                y: CFG.baseY,
                width: CFG.stageWidth,
                height: 0, // Calculated later
                label: stage.title,
                index: sIdx + 1
            };
            nodes.push(stageNode);

            stage.sections.forEach(section => {
                const sectionY = currentY;
                let currentElY = sectionY + CFG.sectionHeaderHeight + CFG.sectionPadding;

                // Render Section Node (Container)
                const sectionNode = {
                    id: section.id,
                    type: 'section',
                    data: section,
                    x: currentStageX + CFG.sectionPadding,
                    y: sectionY,
                    width: CFG.stageWidth - (CFG.sectionPadding * 2),
                    height: 0, // Calculated later
                    label: section.title,
                    parentId: stage.id
                };
                nodes.push(sectionNode);

                section.elements.forEach(element => {
                    const elNode = {
                        id: element.id,
                        type: 'element',
                        data: element,
                        x: currentStageX + CFG.sectionPadding * 2,
                        y: currentElY,
                        width: CFG.stageWidth - (CFG.sectionPadding * 4),
                        height: CFG.elementHeight,
                        label: element.label,
                        parentId: section.id
                    };
                    nodes.push(elNode);
                    mapElIdToNode[element.id] = elNode;
                    currentElY += CFG.elementHeight + CFG.elementGap;
                });

                // Finalize Section Height
                sectionNode.height = (currentElY - sectionY) + CFG.sectionPadding;
                currentY = sectionY + sectionNode.height + CFG.sectionPadding;
            });

            // Finalize Stage Height
            stageNode.height = currentY - CFG.baseY;
            currentStageX += CFG.stageWidth + CFG.stageGap;
        });

        // --- 2. Edge Calculation ---
        const edges: any[] = [];

        // 2a. Sequence Flow (Stage to Stage)
        for (let i = 0; i < processDef.stages.length - 1; i++) {
            const current = processDef.stages[i];
            const next = processDef.stages[i+1];
            // Find the visual center-right of current and center-left of next
            // Just use the stage nodes we created
            const s1 = nodes.find(n => n.id === current.id);
            const s2 = nodes.find(n => n.id === next.id);
            if(s1 && s2) {
                edges.push({
                    id: `flow_${s1.id}_${s2.id}`,
                    type: 'sequence',
                    startX: s1.x + s1.width,
                    startY: s1.y + (s1.height / 2),
                    endX: s2.x,
                    endY: s2.y + (s2.height / 2)
                });
            }
        }

        // 2b. Logic Flow (Dependency Lines)
        // Iterate all elements, check visibility logic
        const collectDependencies = (logic: LogicGroup | undefined, targetId: string) => {
            if (!logic) return;
            logic.conditions?.forEach(cond => {
                if (cond.targetElementId && mapElIdToNode[cond.targetElementId]) {
                    const sourceNode = mapElIdToNode[cond.targetElementId];
                    const targetNode = mapElIdToNode[targetId];
                    
                    edges.push({
                        id: `logic_${sourceNode.id}_${targetNode.id}`,
                        type: 'logic',
                        sourceId: sourceNode.id,
                        targetId: targetNode.id,
                        startX: sourceNode.x + sourceNode.width,
                        startY: sourceNode.y + (sourceNode.height / 2),
                        endX: targetNode.x, // Connect to left side
                        endY: targetNode.y + (targetNode.height / 2),
                        operator: cond.operator
                    });
                }
            });
            logic.groups?.forEach(g => collectDependencies(g, targetId));
        };

        processDef.stages.forEach(s => s.sections.forEach(sec => sec.elements.forEach(el => {
            collectDependencies(el.visibility, el.id);
        })));

        return { nodes, edges, mapElIdToNode };

    }, [processDef]);

    // --- Helper for Bezier Curves ---
    const getBezierPath = (startX: number, startY: number, endX: number, endY: number) => {
        const dist = Math.abs(endX - startX);
        const controlX1 = startX + dist * 0.5;
        const controlX2 = endX - dist * 0.5;
        return `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
    };

    // Calculate canvas size
    const canvasWidth = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + n.width)) + 100 : 800;
    const canvasHeight = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + n.height)) + 100 : 600;

    return (
        <div className="h-full flex flex-col">
            <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shrink-0">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Layers size={18} className="text-sw-teal" />
                    Process Visualizer
                </h3>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <div className="w-4 h-0.5 bg-sw-teal/30"></div> Sequence
                        <div className="w-4 h-0.5 bg-sw-purpleLight border-b border-dashed border-sw-purpleLight"></div> Logic
                     </div>
                    <button 
                        onClick={() => setShowLogic(!showLogic)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${showLogic ? 'bg-sw-purpleLight text-sw-teal border-sw-purpleLight' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                        {showLogic ? <Eye size={14} /> : <EyeOff size={14} />} 
                        {showLogic ? 'Logic Visible' : 'Logic Hidden'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 relative cursor-grab active:cursor-grabbing p-8">
                <div style={{ width: canvasWidth, height: canvasHeight }} className="relative">
                    
                    {/* SVG Layer for Edges */}
                    <svg className="absolute inset-0 pointer-events-none z-10" width={canvasWidth} height={canvasHeight}>
                        <defs>
                            <marker id="arrowhead-seq" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                            </marker>
                            <marker id="arrowhead-logic" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L6,3 z" fill="#8b5cf6" />
                            </marker>
                        </defs>

                        {/* Sequence Edges */}
                        {edges.filter(e => e.type === 'sequence').map(e => (
                            <path
                                key={e.id}
                                d={getBezierPath(e.startX, e.startY, e.endX, e.endY)}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="3"
                                markerEnd="url(#arrowhead-seq)"
                                className="opacity-50"
                            />
                        ))}

                        {/* Logic Edges */}
                        {showLogic && edges.filter(e => e.type === 'logic').map(e => {
                            const isHighlighted = hoveredNodeId === e.sourceId || hoveredNodeId === e.targetId;
                            const isDimmed = hoveredNodeId && !isHighlighted;
                            
                            return (
                                <g key={e.id} className={`transition-opacity duration-300 ${isDimmed ? 'opacity-10' : 'opacity-100'}`}>
                                    <path
                                        d={getBezierPath(e.startX, e.startY, e.endX, e.endY)}
                                        fill="none"
                                        stroke={isHighlighted ? "#7c3aed" : "#a78bfa"}
                                        strokeWidth={isHighlighted ? "3" : "2"}
                                        strokeDasharray="5,5"
                                        markerEnd="url(#arrowhead-logic)"
                                        className="transition-all"
                                    />
                                    {/* Label on path */}
                                    <rect x={(e.startX + e.endX)/2 - 20} y={(e.startY + e.endY)/2 - 10} width="40" height="20" rx="4" fill="white" className="stroke-sw-purpleLight" />
                                    <text x={(e.startX + e.endX)/2} y={(e.startY + e.endY)/2 + 4} textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold">
                                        {e.operator === 'equals' ? '=' : '?'}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Node Layer */}
                    {nodes.map(node => {
                        const isDimmed = hoveredNodeId && hoveredNodeId !== node.id && 
                            !edges.some(e => (e.sourceId === hoveredNodeId && e.targetId === node.id) || (e.targetId === hoveredNodeId && e.sourceId === node.id));
                        
                        // Stage Container
                        if (node.type === 'stage') return (
                            <div 
                                key={node.id}
                                style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                                className="absolute border-2 border-gray-200 bg-white/50 rounded-2xl transition-all"
                            >
                                <div className="absolute -top-10 left-0">
                                    <div className="bg-sw-teal text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg z-20">
                                        {node.index}
                                    </div>
                                </div>
                                <div className="p-4 border-b border-gray-100 bg-white rounded-t-2xl">
                                    <h3 className="font-bold text-lg text-sw-teal">{node.label}</h3>
                                </div>
                            </div>
                        );

                        // Section Container
                        if (node.type === 'section') return (
                            <div
                                key={node.id}
                                style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                                className="absolute border border-dashed border-gray-300 rounded-xl bg-gray-50/50"
                            >
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100/50">
                                    {node.label}
                                </div>
                            </div>
                        );

                        // Element Node
                        if (node.type === 'element') return (
                            <div
                                key={node.id}
                                id={`node-${node.id}`}
                                style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                                className={`
                                    absolute bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex justify-between items-center cursor-pointer
                                    transition-all duration-300 z-20 hover:scale-105 hover:shadow-md hover:border-sw-teal
                                    ${hoveredNodeId === node.id ? 'ring-2 ring-sw-teal shadow-lg scale-105 z-30' : ''}
                                    ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}
                                `}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                            >
                                <span className="font-bold text-sm text-gray-700 truncate pr-2">{node.label}</span>
                                
                                {/* Indicators */}
                                <div className="flex gap-1">
                                    {/* Has incoming logic? */}
                                    {edges.some(e => e.targetId === node.id && e.type === 'logic') && (
                                        <div className="bg-sw-purpleLight text-sw-teal p-1 rounded" title="Controlled by Logic">
                                            <GitCommit size={12} />
                                        </div>
                                    )}
                                    {/* Has outgoing logic? */}
                                    {edges.some(e => e.sourceId === node.id && e.type === 'logic') && (
                                        <div className="bg-sw-teal text-white p-1 rounded" title="Controls other fields">
                                            <ArrowRight size={12} />
                                        </div>
                                    )}
                                    <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold">
                                        {node.data.type}
                                    </span>
                                </div>

                                {/* Connection Ports */}
                                <div className={`absolute -left-1 top-1/2 w-2 h-2 bg-gray-300 rounded-full transform -translate-y-1/2 ${hoveredNodeId === node.id ? 'bg-sw-teal' : ''}`}></div>
                                <div className={`absolute -right-1 top-1/2 w-2 h-2 bg-gray-300 rounded-full transform -translate-y-1/2 ${hoveredNodeId === node.id ? 'bg-sw-teal' : ''}`}></div>
                            </div>
                        );
                        return null;
                    })}
                </div>
            </div>
        </div>
    );
}
