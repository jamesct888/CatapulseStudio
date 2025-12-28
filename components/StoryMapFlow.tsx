
import React, { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    MarkerType,
    NodeProps,
    Handle,
    Position,
    BaseEdge,
    getSmoothStepPath,
    EdgeLabelRenderer,
    EdgeProps
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { UserStory, ProcessDefinition } from '../types';

// -- TYPES --
interface StoryMapFlowProps {
    stories: UserStory[];
    processDef: ProcessDefinition;
}

// 1. Custom Decision Node (Diamond + Optional Story Chip)
const DecisionNode = ({ data }: NodeProps) => {
    return (
        <div style={{ position: 'relative', width: 100, height: 100 }}>
            {/* The diamond shape */}
            <div style={{
                width: '100%', height: '100%',
                transform: 'rotate(45deg)',
                backgroundColor: 'white',
                border: '2px solid #0f172a',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                position: 'absolute',
                top: 0, left: 0,
                zIndex: 0
            }} />

            {/* Container for Content (Un-rotated) */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                zIndex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none' // Let clicks pass to handles if needed, or 'all' if interactive
            }}>

                {/* Optional Story Chip Display (REMOVED - Now on Edge) */}

                {/* The Label */}
                <div
                    title={data.tooltip as string}
                    style={{
                        fontWeight: 'bold', fontSize: '11px', color: '#0f172a',
                        pointerEvents: 'all',
                        textAlign: 'center',
                        maxWidth: '80%'
                    }}
                >
                    {data.label as string}
                </div>
            </div>

            {/* Handles: Top, Bottom, Left, Right */}
            <Handle type="target" position={Position.Left} id="in-left" style={{ zIndex: 2 }} />
            <Handle type="target" position={Position.Top} id="in-top" style={{ zIndex: 2 }} />

            <Handle type="source" position={Position.Right} id="out-else" style={{ top: '50%', zIndex: 2 }} />
            <Handle type="source" position={Position.Bottom} id="out-true" style={{ left: '50%', zIndex: 2 }} />
        </div>
    );
};

// 2. Custom Stage Node (Container)
const StageNode = ({ data }: NodeProps) => {
    return (
        <div style={{
            width: '100%', height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid #cbd5e1',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '12px',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 'bold', color: '#0f172a',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
            }}>
                {data.label as React.ReactNode}
            </div>

            {/* Handles for routing flexibility */}
            <Handle type="target" position={Position.Left} id="target-left" style={{ top: '50%', width: 10, height: 10 }} />
            <Handle type="target" position={Position.Top} id="target-top" style={{ left: '50%', width: 10, height: 10 }} />

            <Handle type="source" position={Position.Right} id="source-right" style={{ top: '50%', width: 10, height: 10 }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ left: '50%', width: 10, height: 10 }} />
        </div>
    );
};

// 3. Custom Story Node (Chip Style)
const StoryNode = ({ data }: NodeProps) => {
    const rawDescription = (data.description as string) || '';
    const description = rawDescription.replace(/Service Agent/g, 'Colleague');

    return (
        <div
            title={`${data.fullTitle}\n\n${description}`} // Native tooltip
            className="px-3 py-1 bg-sw-teal border border-sw-teal rounded-full text-xs font-bold text-white shadow-sm cursor-help whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-center hover:bg-sw-tealHover transition-colors font-sans"
        >
            {data.label as React.ReactNode}
        </div>
    );
};

// 4. Custom Chip Edge
const ChipEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    if (!data?.story) {
        return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
    }

    const story = data.story as UserStory;

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <div
                        title={`${story.title}\n\n${story.description}`}
                        className="px-2 py-0.5 bg-sw-teal border border-sw-teal rounded-full text-[10px] font-bold text-white shadow-sm cursor-help hover:bg-sw-tealHover transition-colors font-sans"
                        style={{ minWidth: '40px', textAlign: 'center' }}
                    >
                        {story.id}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

const nodeTypes = {
    decision: DecisionNode,
    stage: StageNode,
    story: StoryNode
};

const edgeTypes = {
    chip: ChipEdge
};

const StoryMapFlow: React.FC<StoryMapFlowProps> = ({ stories, processDef }) => {

    const { nodes: validNodes, edges: validEdges } = useMemo(() => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // --- CONSTANTS ---
        const stageWidth = 300;
        const storyHeight = 30; // Chip height
        const headerHeight = 50;
        const padding = 20;
        const gapX = 180;
        const railY = 100; // Main sequence 'Y'
        const branchDrop = 250; // Vertical distance for conditional branches
        const decisionSize = 100;

        // --- HELPERS ---
        const getConditionLabel = (logic: any) => {
            if (!logic || !logic.conditions) return 'Check';

            const getFieldName = (elId: string) => {
                for (const stage of processDef.stages) {
                    for (const section of stage.sections) {
                        const el = section.elements.find(e => e.id === elId);
                        if (el) return el.label;
                    }
                }
                return elId; // Fallback to ID
            };

            const shorten = (s: string) => s.replace('Type of Change', 'Type').replace('Change Request Type', 'Type');

            const parts = logic.conditions.map((c: any) => {
                const rawName = getFieldName(c.targetElementId);
                const name = shorten(rawName);
                const op = c.operator === 'contains' ? 'has' : c.operator === 'equals' ? '=' : c.operator;
                return `${name} ${op} '${c.value}'`;
            });
            return parts.join(' & ');
        };

        const findRuleStory = (stageId: string) => {
            const candidates = stories.filter(s =>
                s.relatedStageIds?.includes(stageId) &&
                !s.title.toLowerCase().startsWith('submit') && // Exclude submit stories from decision nodes
                !s.title.toLowerCase().startsWith('process')
            );
            const priority = ['submit', 'decision', 'rule:', 'logic:', 'condition:', 'check', 'skip'];
            return candidates.sort((a, b) => {
                const aIdx = priority.findIndex(p => a.title.toLowerCase().includes(p));
                const bIdx = priority.findIndex(p => b.title.toLowerCase().includes(p));
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;
                return 0;
            }).find(s => priority.some(p => s.title.toLowerCase().includes(p)));
        };

        const findSubmitStory = (stageId: string) => {
            return stories.find(s =>
                s.relatedStageIds?.includes(stageId) &&
                (s.title.toLowerCase().startsWith('submit') || s.title.toLowerCase().startsWith('process'))
            );
        };

        const createStageBlock = (stage: any, x: number, y: number) => {
            const stageStories = stories.filter(s =>
                s.relatedStageIds?.includes(stage.id) &&
                !s.title.toLowerCase().includes('skip') &&
                !s.title.toLowerCase().startsWith('submit') &&
                !s.title.toLowerCase().startsWith('process')
            );

            // Container
            newNodes.push({
                id: stage.id,
                position: { x, y },
                data: { label: stage.title },
                style: { width: stageWidth, height: headerHeight + padding + (stageStories.length * (storyHeight + 10)) + 20 },
                type: 'stage',
                zIndex: 1
            });

            // Stories inside
            let currentY = headerHeight + 10;
            stageStories.forEach((s) => {
                newNodes.push({
                    id: s.id,
                    position: { x: 10, y: currentY },
                    parentId: stage.id,
                    data: {
                        label: s.id,
                        fullTitle: s.title,
                        description: s.description
                    },
                    extent: 'parent',
                    type: 'story',
                    zIndex: 2
                });
                currentY += storyHeight + 10; // gap
            });

            return { id: stage.id, width: stageWidth };
        };


        // --- MAIN LOOP ---
        let currentX = 50;
        let prevNodeId: string | null = null;
        let prevSourceHandle = 'source-right';
        let pendingMerges: { id: string, sourceHandle: string }[] = [];

        processDef.stages.forEach((stage, i) => {
            const hasSkip = !!stage.skipLogic;
            const isConditional = hasSkip && i > 0;

            if (!isConditional) {
                // -- UNCONDITIONAL (MAIN RAIL) --
                createStageBlock(stage, currentX, railY);

                // Connect Previous -> Current
                if (prevNodeId) {
                    const submitStory = findSubmitStory(prevNodeId);
                    const hasStory = submitStory && prevNodeId === submitStory.relatedStageIds?.[0];

                    newEdges.push({
                        id: `e-${prevNodeId}-${stage.id}`,
                        source: prevNodeId,
                        target: stage.id,
                        sourceHandle: prevSourceHandle,
                        targetHandle: 'target-left',
                        type: hasStory ? 'chip' : 'smoothstep',
                        data: hasStory ? { story: submitStory } : undefined,
                        label: !hasStory && prevSourceHandle === 'out-else' ? 'Else' : undefined,
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                }

                // Connect Pending Merges -> Current
                pendingMerges.forEach(merge => {
                    const submitStory = findSubmitStory(merge.id);
                    const hasStory = submitStory && merge.id === submitStory.relatedStageIds?.[0];

                    newEdges.push({
                        id: `e-${merge.id}-${stage.id}`,
                        source: merge.id,
                        target: stage.id,
                        sourceHandle: merge.sourceHandle,
                        targetHandle: 'target-left',
                        type: hasStory ? 'chip' : 'smoothstep',
                        data: hasStory ? { story: submitStory } : undefined,
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                });
                pendingMerges = [];

                prevNodeId = stage.id;
                prevSourceHandle = 'source-right';
                currentX += stageWidth + gapX;

            } else {
                // -- Conditional Block (Ladder) --
                const decId = `dec_${stage.id}`;
                const ruleStory = findRuleStory(stage.id);
                const condLabel = getConditionLabel(stage.skipLogic);
                const ruleLabel = ruleStory ? '' : '?';
                const ruleTooltip = ruleStory
                    ? `${ruleStory.title}\n----------------\n${ruleStory.description}`
                    : `Logic Gate: ${stage.title}\n\nRule: Proceed if ${condLabel}`;

                // Story Chip is now on the Incoming Edge, not inside the node.
                // Reverting node to simple 'Decision' label.

                const decX = currentX + (stageWidth - decisionSize) / 2;

                newNodes.push({
                    id: decId,
                    position: { x: decX, y: railY + 20 },
                    data: { label: 'Decision', tooltip: ruleTooltip }, // Hardcoded label
                    type: 'decision'
                });

                // Connect Prev -> Decision
                if (prevNodeId) {
                    const submitStory = findSubmitStory(prevNodeId);
                    const hasStory = submitStory && prevNodeId === submitStory.relatedStageIds?.[0];

                    newEdges.push({
                        id: `e-${prevNodeId}-${decId}`,
                        source: prevNodeId,
                        target: decId,
                        sourceHandle: prevSourceHandle,
                        targetHandle: 'in-left',
                        type: hasStory ? 'chip' : 'smoothstep',
                        data: hasStory ? { story: submitStory } : undefined,
                        label: undefined,
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                }

                // Conditional Stage
                const stageY = railY + branchDrop;
                const stageX = decX - (stageWidth - decisionSize) / 2;
                createStageBlock(stage, stageX, stageY);

                // Connect Decision -(True)-> Stage
                newEdges.push({
                    id: `e-${decId}-${stage.id}`,
                    source: decId,
                    target: stage.id,
                    sourceHandle: 'out-true',
                    targetHandle: 'target-top',
                    label: condLabel,
                    type: 'smoothstep',
                    style: { stroke: '#0f172a', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' }
                });

                // Update State
                prevNodeId = decId;
                prevSourceHandle = 'out-else';
                pendingMerges.push({ id: stage.id, sourceHandle: 'source-right' });
                currentX += stageWidth + gapX;
            }
        });

        // Final End
        const endId = 'end_node';
        newNodes.push({
            id: endId,
            position: { x: currentX, y: railY + 40 },
            data: { label: 'End' },
            style: {
                width: 60, height: 40,
                backgroundColor: '#cbd5e1', borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            },
            type: 'default'
        });

        // Connect dangling lines
        const finalSources = [{ id: prevNodeId, handle: prevSourceHandle }, ...pendingMerges.map(p => ({ id: p.id, handle: p.sourceHandle }))];
        finalSources.forEach(src => {
            if (src.id) {
                const submitStory = src.id ? findSubmitStory(src.id) : undefined;
                const hasStory = submitStory && src.id === submitStory.relatedStageIds?.[0];

                newEdges.push({
                    id: `e-${src.id}-${endId}`,
                    source: src.id,
                    target: endId,
                    sourceHandle: src.handle,
                    type: hasStory ? 'chip' : 'smoothstep',
                    data: hasStory ? { story: submitStory } : undefined,
                    label: !hasStory && src.handle === 'out-else' ? 'Else' : undefined,
                    style: { stroke: '#64748b', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                });
            }
        });

        return { nodes: newNodes, edges: newEdges };
    }, [stories, processDef]);

    const [nodes, setNodes, onNodesChange] = useNodesState(validNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(validEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    useEffect(() => {
        setNodes(validNodes);
        setEdges(validEdges);
    }, [validNodes, validEdges, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '800px', border: '1px solid #ccc', borderRadius: '12px', overflow: 'hidden' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default StoryMapFlow;
