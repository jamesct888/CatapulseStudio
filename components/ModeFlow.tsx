
import React, { useMemo, useState, useRef } from 'react';
import { ProcessDefinition, LogicGroup, StageDefinition } from '../types';
import { ArrowRight, Eye, GitCommit, Layers, EyeOff, FastForward, GripVertical, CheckCircle2 } from 'lucide-react';
import { formatLogicSummary } from '../utils/logic';
import { ModalWrapper } from './ModalWrapper';
import { LogicBuilder } from './LogicBuilder';

interface ModeFlowProps {
    processDef: ProcessDefinition;
    setProcessDef: (def: ProcessDefinition) => void;
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
    baseY: 100
};

export const ModeFlow: React.FC<ModeFlowProps> = ({ processDef, setProcessDef }) => {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [showLogic, setShowLogic] = useState(true);
    
    // Drag State for Skip Logic Lines
    const [isDraggingConnection, setIsDraggingConnection] = useState(false);
    const [connectionStart, setConnectionStart] = useState<{ x: number, y: number, stageId: string, stageIndex: number } | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [dragTargetId, setDragTargetId] = useState<string | null>(null);

    // Modal State for configuring skip logic
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [pendingSkipConfig, setPendingSkipConfig] = useState<{ sourceStageIdx: number, targetStageIdx: number } | null>(null);
    const [tempLogicGroup, setTempLogicGroup] = useState<LogicGroup>({ id: 'root', operator: 'AND', conditions: [] });

    // State for Stage Reordering
    const [draggedStageId, setDraggedStageId] = useState<string | null>(null);

    // --- 1. Layout Calculation ---
    const { nodes, edges, mapElIdToNode } = useMemo(() => {
        const nodes: any[] = [];
        const mapElIdToNode: {[id: string]: any} = {};
        const allElements = processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);
        
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
                index: sIdx + 1,
                realIndex: sIdx
            };
            nodes.push(stageNode);

            stage.sections.forEach(section => {
                const sectionY = currentY;
                let currentElY = sectionY + CFG.sectionHeaderHeight + CFG.sectionPadding;

                // Render Section Node
                const sectionNode = {
                    id: section.id,
                    type: 'section',
                    data: section,
                    x: currentStageX + CFG.sectionPadding,
                    y: sectionY,
                    width: CFG.stageWidth - (CFG.sectionPadding * 2),
                    height: 0,
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

                sectionNode.height = (currentElY - sectionY) + CFG.sectionPadding;
                currentY = sectionY + sectionNode.height + CFG.sectionPadding;
            });

            stageNode.height = currentY - CFG.baseY;
            currentStageX += CFG.stageWidth + CFG.stageGap;
        });

        // --- 2. Edge Calculation ---
        const edges: any[] = [];

        // 2a. Sequence & Skip Flow
        for (let i = 0; i < processDef.stages.length - 1; i++) {
            const current = processDef.stages[i];
            const next = processDef.stages[i+1];
            
            const s1 = nodes.find(n => n.id === current.id);
            const s2 = nodes.find(n => n.id === next.id);

            if(s1 && s2) {
                // Standard Sequence Flow
                edges.push({
                    id: `flow_${s1.id}_${s2.id}`,
                    type: 'sequence',
                    startX: s1.x + s1.width,
                    startY: s1.y + (s1.height / 2),
                    endX: s2.x,
                    endY: s2.y + (s2.height / 2)
                });

                // VISUALIZE SKIPS:
                // Check if any *future* stage logic points back to here? No, forward only.
                // Check if 'next' stage has skip logic? If so, we draw an arch over it.
                // If Stage B (index i+1) has skip logic, it means we MIGHT skip B.
                // Visually, this is a path from A (i) to C (i+2).
                
                if (next.skipLogic && (next.skipLogic.conditions.length > 0 || (next.skipLogic.groups && next.skipLogic.groups.length > 0))) {
                    
                    const skipTargetStage = processDef.stages[i+2];
                    
                    if (skipTargetStage) {
                        const sTarget = nodes.find(n => n.id === skipTargetStage.id);
                        if (sTarget) {
                            edges.push({
                                id: `skip_${s1.id}_${sTarget.id}`,
                                type: 'skip',
                                label: `Skip ${next.title} if: ${formatLogicSummary(next.skipLogic, allElements)}`,
                                startX: s1.x + s1.width,
                                startY: s1.y, 
                                endX: sTarget.x,
                                endY: sTarget.y,
                                skippedStageIdx: i + 1
                            });
                        }
                    } else {
                        // Skipping final stage
                        edges.push({
                            id: `skip_${s1.id}_end`,
                            type: 'skip',
                            label: `Skip ${next.title} if: ${formatLogicSummary(next.skipLogic, allElements)}`,
                            startX: s1.x + s1.width,
                            startY: s1.y,
                            endX: s2.x + s2.width + 100, 
                            endY: s2.y,
                            skippedStageIdx: i + 1
                        });
                    }
                }
            }
        }

        // 2b. Logic Flow (Dependency Lines)
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
                        endX: targetNode.x,
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

    // --- Interaction Handlers ---

    // 1. Connection Dragging (Create Skip Rule)
    const handleConnectStart = (e: React.MouseEvent, stageNode: any) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        // Calculate relative position within the container
        const container = document.getElementById('flow-canvas');
        if (!container) return;
        const cRect = container.getBoundingClientRect();
        
        setIsDraggingConnection(true);
        setConnectionStart({ 
            x: stageNode.x + stageNode.width, 
            y: stageNode.y, 
            stageId: stageNode.id,
            stageIndex: stageNode.realIndex
        });
        setMousePos({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingConnection) return;
        const container = document.getElementById('flow-canvas');
        if (!container) return;
        const cRect = container.getBoundingClientRect();
        setMousePos({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
    };

    const handleConnectEnd = (e: React.MouseEvent, targetStageNode: any) => {
        e.stopPropagation();
        if (!isDraggingConnection || !connectionStart) return;

        // Validation: Can only connect to stages at least 2 steps ahead 
        // (Connecting Stage i to Stage i+1 is just normal flow. Connecting to i+2 skips i+1)
        if (targetStageNode.realIndex > connectionStart.stageIndex + 1) {
            // Valid skip!
            // We need to define logic for the stages IN BETWEEN to be skipped.
            // Simplified: If connecting A (0) to C (2), we skip B (1).
            // We will configure logic for Stage B.
            
            // For now, support only skipping ONE stage at a time via UI for simplicity
            if (targetStageNode.realIndex === connectionStart.stageIndex + 2) {
                setPendingSkipConfig({
                    sourceStageIdx: connectionStart.stageIndex,
                    targetStageIdx: targetStageNode.realIndex
                });
                setTempLogicGroup({ id: 'new_skip', operator: 'AND', conditions: [] });
                setIsConfigModalOpen(true);
            } else {
                alert("For this prototype, please only skip one stage at a time (e.g. Stage 1 to Stage 3).");
            }
        }

        setIsDraggingConnection(false);
        setConnectionStart(null);
        setDragTargetId(null);
    };

    const saveSkipLogic = () => {
        if (!pendingSkipConfig) return;
        
        const newDef = { ...processDef };
        const skippedStageIdx = pendingSkipConfig.sourceStageIdx + 1;
        const skippedStage = newDef.stages[skippedStageIdx];
        
        // Update the skipped stage with the logic
        skippedStage.skipLogic = tempLogicGroup;
        
        setProcessDef(newDef);
        setIsConfigModalOpen(false);
        setPendingSkipConfig(null);
    };

    // 2. Stage Reordering (Drag and Drop Stages)
    const handleStageDragStart = (e: React.DragEvent, stageId: string) => {
        setDraggedStageId(stageId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleStageDrop = (e: React.DragEvent, targetStageId: string) => {
        e.preventDefault();
        if (!draggedStageId || draggedStageId === targetStageId) return;

        const newStages = [...processDef.stages];
        const sourceIdx = newStages.findIndex(s => s.id === draggedStageId);
        const targetIdx = newStages.findIndex(s => s.id === targetStageId);

        if (sourceIdx !== -1 && targetIdx !== -1) {
            const [moved] = newStages.splice(sourceIdx, 1);
            newStages.splice(targetIdx, 0, moved);
            setProcessDef({ ...processDef, stages: newStages });
        }
        setDraggedStageId(null);
    };

    // --- Helper for Bezier Curves ---
    const getBezierPath = (edge: any) => {
        const { startX, startY, endX, endY, type } = edge;
        if (type === 'skip') {
            const controlY = Math.min(startY, endY) - 80;
            return `M ${startX} ${startY} Q ${(startX + endX) / 2} ${controlY} ${endX} ${endY}`;
        }
        // Temp line while dragging
        if (type === 'temp') {
             const controlY = Math.min(startY, endY) - 50;
             return `M ${startX} ${startY} Q ${(startX + endX) / 2} ${controlY} ${endX} ${endY}`;
        }

        const dist = Math.abs(endX - startX);
        const controlX1 = startX + dist * 0.5;
        const controlX2 = endX - dist * 0.5;
        return `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
    };

    // Calculate canvas size
    const canvasWidth = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + n.width)) + 150 : 800;
    const canvasHeight = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + n.height)) + 100 : 600;

    // Available fields for logic builder
    const allFields = useMemo(() => {
        return processDef.stages.flatMap(s => s.sections).flatMap(sec => sec.elements);
    }, [processDef]);

    return (
        <div className="h-full flex flex-col" onMouseMove={handleMouseMove} onMouseUp={() => { setIsDraggingConnection(false); setDragTargetId(null); }}>
            <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shrink-0">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Layers size={18} className="text-sw-teal" />
                    Process Visualizer
                </h3>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                        <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-sw-teal/30"></div> Sequence</div>
                        <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-amber-500 border-b border-dashed border-amber-500"></div> Skip Logic</div>
                        <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-sw-purpleLight border-b border-dashed border-sw-purpleLight"></div> Visibility</div>
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

            <div id="flow-canvas" className="flex-1 overflow-auto bg-slate-50 relative cursor-default p-8">
                <div style={{ width: canvasWidth, height: canvasHeight }} className="relative">
                    
                    <svg className="absolute inset-0 pointer-events-none z-10" width={canvasWidth} height={canvasHeight}>
                        <defs>
                            <marker id="arrowhead-seq" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                            </marker>
                            <marker id="arrowhead-skip" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                            </marker>
                            <marker id="arrowhead-logic" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L6,3 z" fill="#8b5cf6" />
                            </marker>
                        </defs>

                        {/* Standard Edges */}
                        {edges.filter(e => e.type === 'sequence').map(e => (
                            <path key={e.id} d={getBezierPath(e)} fill="none" stroke="#cbd5e1" strokeWidth="3" markerEnd="url(#arrowhead-seq)" className="opacity-50" />
                        ))}

                        {/* Logic Edges */}
                        {showLogic && edges.filter(e => e.type === 'logic').map(e => (
                            <g key={e.id} className={`transition-opacity duration-300 ${hoveredNodeId && hoveredNodeId !== e.sourceId && hoveredNodeId !== e.targetId ? 'opacity-10' : 'opacity-100'}`}>
                                <path d={getBezierPath(e)} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead-logic)" />
                            </g>
                        ))}

                        {/* Skip Logic Edges */}
                        {edges.filter(e => e.type === 'skip').map(e => (
                            <g key={e.id} className="group/skip pointer-events-auto">
                                <path d={getBezierPath(e)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arrowhead-skip)" className="transition-all" />
                                {/* Label background pill */}
                                <foreignObject x={(e.startX + e.endX) / 2 - 100} y={Math.min(e.startY, e.endY) - 50} width="200" height="40">
                                    <div className="flex justify-center">
                                        <div className="bg-white border border-amber-200 shadow-sm px-2 py-1 rounded-full text-[10px] text-amber-700 font-bold text-center truncate max-w-full">
                                            {e.label}
                                        </div>
                                    </div>
                                </foreignObject>
                            </g>
                        ))}

                        {/* Temporary Drag Line */}
                        {isDraggingConnection && connectionStart && (
                            <path 
                                d={getBezierPath({ type: 'temp', startX: connectionStart.x, startY: connectionStart.y, endX: mousePos.x, endY: mousePos.y })} 
                                fill="none" 
                                stroke="#f59e0b" 
                                strokeWidth="3" 
                                strokeDasharray="5,5" 
                                className="animate-pulse"
                            />
                        )}
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => {
                        if (node.type === 'stage') {
                            const hasSkipLogic = node.data.skipLogic && node.data.skipLogic.conditions.length > 0;
                            const isDragTarget = dragTargetId === node.id;
                            
                            return (
                                <div 
                                    key={node.id}
                                    style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                                    className={`absolute border-2 bg-white/50 rounded-2xl transition-all 
                                        ${hasSkipLogic ? 'border-amber-200' : 'border-gray-200'}
                                        ${isDragTarget ? 'ring-4 ring-amber-200 bg-amber-50 scale-105 z-50' : ''}
                                        ${draggedStageId === node.id ? 'opacity-50' : ''}
                                    `}
                                    draggable
                                    onDragStart={(e) => handleStageDragStart(e, node.id)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleStageDrop(e, node.id)}
                                    onMouseEnter={() => isDraggingConnection && setDragTargetId(node.id)}
                                    onMouseLeave={() => isDraggingConnection && setDragTargetId(null)}
                                    onMouseUp={(e) => isDraggingConnection ? handleConnectEnd(e, node) : null}
                                >
                                    {/* Drag Handle */}
                                    <div className="absolute -left-3 top-4 cursor-move text-gray-300 hover:text-sw-teal opacity-0 hover:opacity-100 transition-opacity">
                                        <GripVertical size={20} />
                                    </div>

                                    {/* Stage Index Badge */}
                                    <div className="absolute -top-10 left-0">
                                        <div className={`text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg z-20 ${hasSkipLogic ? 'bg-amber-500' : 'bg-sw-teal'}`}>
                                            {hasSkipLogic ? <FastForward size={14} /> : node.index}
                                        </div>
                                    </div>

                                    {/* Connection Output Handle */}
                                    <div 
                                        className="absolute -right-3 -top-3 w-6 h-6 bg-white border-2 border-amber-400 rounded-full flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-30 shadow-sm group/handle"
                                        onMouseDown={(e) => handleConnectStart(e, node)}
                                        title="Drag to create Skip Logic"
                                    >
                                        <div className="w-2 h-2 bg-amber-400 rounded-full group-hover/handle:bg-amber-600"></div>
                                    </div>

                                    <div className={`p-4 border-b bg-white rounded-t-2xl flex justify-between items-center ${hasSkipLogic ? 'border-amber-100' : 'border-gray-100'}`}>
                                        <h3 className={`font-bold text-lg ${hasSkipLogic ? 'text-amber-600' : 'text-sw-teal'}`}>{node.label}</h3>
                                        {hasSkipLogic && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">Skippable</span>}
                                    </div>
                                </div>
                            );
                        }

                        if (node.type === 'section') return (
                            <div key={node.id} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} className="absolute border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100/50">{node.label}</div>
                            </div>
                        );

                        if (node.type === 'element') return (
                            <div key={node.id} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} 
                                className={`absolute bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex justify-between items-center cursor-pointer transition-all duration-300 z-20 hover:scale-105 ${hoveredNodeId === node.id ? 'ring-2 ring-sw-teal shadow-lg' : ''}`}
                                onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)}
                            >
                                <span className="font-bold text-sm text-gray-700 truncate pr-2">{node.label}</span>
                                <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold">{node.data.type}</span>
                            </div>
                        );
                        return null;
                    })}
                </div>
            </div>

            {/* Skip Logic Configuration Modal */}
            {isConfigModalOpen && (
                <ModalWrapper 
                    title="Configure Skip Logic" 
                    icon={FastForward} 
                    onClose={() => setIsConfigModalOpen(false)}
                    modalSize={{ width: 800, height: 600 }}
                    onResizeStart={() => {}}
                >
                    <div className="h-full flex flex-col">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 flex gap-3">
                            <FastForward className="text-amber-600 shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm">Create Jump Rule</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    You are creating a path from Stage {pendingSkipConfig?.sourceStageIdx! + 1} to Stage {pendingSkipConfig?.targetStageIdx! + 1}. 
                                    This effectively skips Stage {pendingSkipConfig?.sourceStageIdx! + 2}.
                                    Define the conditions under which this skip should happen.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto">
                            <LogicBuilder 
                                group={tempLogicGroup} 
                                onChange={setTempLogicGroup} 
                                availableTargets={allFields}
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-bold">Cancel</button>
                            <button onClick={saveSkipLogic} className="bg-sw-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-sw-tealHover shadow-sm flex items-center gap-2">
                                <CheckCircle2 size={16} /> Save Logic Rule
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}
