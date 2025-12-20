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
    Position
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
        <div style={{ position: 'relative', width: 140, height: 140 }}>
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

                {/* Optional Story Chip Display (Centered) */}
                {data.story && (
                    <div style={{ pointerEvents: 'all', marginBottom: '8px' }}>
                        {/* We pass a partial node object sufficient for the visual component */}
                        <StoryNode
                            id="story-chip-inner"
                            data={data.story as any}
                            type="story"
                            selected={false}
                            zIndex={10}
                            isConnectable={false}
                            positionAbsoluteX={0}
                            positionAbsoluteY={0}
                            dragging={false}
                            dragHandle={undefined}
                        />
                    </div>
                )}

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
// Standardized handles on all sides for cleaner routing
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
                {data.label}
            </div>

            {/* Content Area (where child nodes would visually sit if we weren't using absolute nodes) 
                Since React Flow handles grouping via coordinates, this is just the visual container.
            */}

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
    // Terminology: Service Agent -> Colleague
    const rawDescription = (data.description as string) || '';
    const description = rawDescription.replace(/Service Agent/g, 'Colleague');

    return (
        <div
            title={`${data.fullTitle}\n\n${description}`} // Native tooltip with replacement
            className="px-3 py-1 bg-sw-teal border border-sw-teal rounded-full text-xs font-bold text-white shadow-sm cursor-help whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-center hover:bg-sw-tealHover transition-colors font-sans"
        >
            {data.label}
        </div>
    );
};

const nodeTypes = {
    decision: DecisionNode,
    stage: StageNode,
    story: StoryNode
};

const StoryMapFlow: React.FC<StoryMapFlowProps> = ({ stories, processDef }) => {

    // Process the graph logic
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
        const decisionSize = 140;

        // --- HELPERS ---
        const getConditionLabel = (logic: any) => {
            if (!logic || !logic.conditions) return 'Check';

            // Helper to lookup field name
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
            const candidates = stories.filter(s => s.relatedStageIds?.includes(stageId));

            // PRIORITY: Submit > Decision > Rule > Logic > Condition > Check > Skip
            const priority = ['submit', 'decision', 'rule:', 'logic:', 'condition:', 'check', 'skip'];

            return candidates.sort((a, b) => {
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();
                const aIdx = priority.findIndex(p => aTitle.includes(p));
                const bIdx = priority.findIndex(p => bTitle.includes(p));

                // If both match a priority, picking higher priority (lower index)
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                // If only one matches, prioritize it
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;
                return 0;
            }).find(s =>
                priority.some(p => s.title.toLowerCase().includes(p))
            );
        };

        const createStageBlock = (stage: any, x: number, y: number) => {
            const stageStories = stories.filter(s =>
                s.relatedStageIds?.includes(stage.id) &&
                !s.title.toLowerCase().includes('skip') // Exclude rule stories from the list
            );

            // Layout chips inside the stage container
            // We can do grid or Stack. Let's do simple stack.
            const chipGap = 10;
            const contentHeight = stageStories.length * (storyHeight + chipGap) + padding; // Extra padding at bottom
            const totalHeight = Math.max(150, headerHeight + contentHeight);

            // 1. Stage Container Node
            newNodes.push({
                id: stage.id,
                position: { x, y },
                data: { label: stage.title },
                type: 'stage', // CUSTOM TYPE
                style: { width: stageWidth, height: totalHeight },
                zIndex: 0
            });

            // 2. Story Chips
            let currentY = headerHeight + chipGap;
            stageStories.forEach((s) => {
                newNodes.push({
                    id: s.id,
                    parentId: stage.id,
                    position: { x: padding, y: currentY },
                    data: {
                        label: s.id, // Show ID only
                        fullTitle: s.title,
                        description: s.description
                    },
                    extent: 'parent',
                    type: 'story', // CUSTOM TYPE
                    zIndex: 2
                });
                currentY += storyHeight + chipGap;
            });

            return { id: stage.id, width: stageWidth, height: totalHeight };
        };


        // --- MAIN LOOP ---
        let currentX = 50;
        let prevNodeId: string | null = null;
        let prevSourceHandle = 'source-right'; // Default flow exit

        // We track branches that need to merge into the next Unconditional block
        // Format: { id: string, sourceHandle: string }
        let pendingMerges: { id: string, sourceHandle: string }[] = [];

        processDef.stages.forEach((stage, i) => {
            const hasSkip = !!stage.skipLogic;

            // FORCE First Stage to be valid start (ignore skip logic if it's the 0th item)
            // This fixes the user reported issue where Stage 1 looked conditional.
            const isConditional = hasSkip && i > 0;

            if (!isConditional) {
                // -- UNCONDITIONAL (MAIN RAIL) --

                // Align on Rail Y = 100
                createStageBlock(stage, currentX, railY);

                // Connect Previous -> Current
                if (prevNodeId) {
                    newEdges.push({
                        id: `e-${prevNodeId}-${stage.id}`,
                        source: prevNodeId,
                        target: stage.id,
                        sourceHandle: prevSourceHandle,
                        targetHandle: 'target-left', // Side-to-Side flow
                        type: 'smoothstep',
                        label: prevSourceHandle === 'out-else' ? 'Else' : undefined,
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                }

                // Connect Pending Merges -> Current (Left or Top?)
                // If dropping in from above or side... side is cleaner if we route well.
                // React Flow smoothstep handles mult-input pretty well on Left.
                pendingMerges.forEach(merge => {
                    newEdges.push({
                        id: `e-${merge.id}-${stage.id}`,
                        source: merge.id,
                        target: stage.id,
                        sourceHandle: merge.sourceHandle,
                        targetHandle: 'target-left', // Merge into the main line
                        type: 'smoothstep',
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                });
                pendingMerges = [];

                // Prepare next
                prevNodeId = stage.id;
                prevSourceHandle = 'source-right';
                currentX += stageWidth + gapX;

            } else {
                // -- Conditional Block (Ladder) --

                // 1. Decision Node (On the Rail)
                const decId = `dec_${stage.id}`;
                const ruleStory = findRuleStory(stage.id);
                // Fallback Label and Tooltip from Logic
                const condLabel = getConditionLabel(stage.skipLogic);

                // If we have a rule story, the CHIP is the primary label. The diamond should be clean.
                // If no story, we show '?' in the diamond (cleaner than Rx).
                const ruleLabel = ruleStory ? '' : '?';

                const ruleTooltip = ruleStory
                    ? `${ruleStory.title}\n----------------\n${ruleStory.description}`
                    : `Logic Gate: ${stage.title}\n\nRule: Proceed if ${condLabel}`;

                // Construct story chip data if story exists
                const storyChipData = ruleStory ? {
                    label: ruleStory.id,
                    fullTitle: ruleStory.title,
                    description: ruleStory.description
                } : undefined;

                // Center decision in the gap or align?
                // Visual preference: Decision centers over the column or start of column?
                // Let's place it at start of column space.
                const decX = currentX + (stageWidth - decisionSize) / 2;

                newNodes.push({
                    id: decId,
                    position: { x: decX, y: railY + 20 }, // Vertical alignment tweak
                    data: { label: ruleLabel, tooltip: ruleTooltip, story: storyChipData },
                    type: 'decision'
                });

                // Connect Prev -> Decision
                if (prevNodeId) {
                    newEdges.push({
                        id: `e-${prevNodeId}-${decId}`,
                        source: prevNodeId,
                        target: decId,
                        sourceHandle: prevSourceHandle,
                        targetHandle: 'in-left', // Side entry
                        type: 'smoothstep',
                        label: prevSourceHandle === 'out-else' ? 'Else' : undefined,
                        style: { stroke: '#64748b', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
                    });
                }




                // 2. Conditional Stage (Dropped Vertical)
                // Position X: Same as decision? Or aligned with the column?
                // Let's align exactly below.
                const stageY = railY + branchDrop;
                // Center stage on decision?
                // Stage width 300, Dec 60. Center diff = 120.
                const stageX = decX - (stageWidth - decisionSize) / 2;
                createStageBlock(stage, stageX, stageY);

                // Connect Decision -(True)-> Stage
                newEdges.push({
                    id: `e-${decId}-${stage.id}`,
                    source: decId,
                    target: stage.id,
                    sourceHandle: 'out-true', // Bottom
                    targetHandle: 'target-top', // Top entry
                    label: condLabel,
                    type: 'smoothstep',
                    style: { stroke: '#0f172a', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' }
                });

                // 3. Update State
                // The "Main Line" continues from the 'Else' handle of the decision
                prevNodeId = decId;
                prevSourceHandle = 'out-else';

                // Pending Merge: The Dropped stage needs to merge back eventually
                pendingMerges.push({ id: stage.id, sourceHandle: 'source-right' }); // Or bottom?

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
                newEdges.push({
                    id: `e-${src.id}-${endId}`,
                    source: src.id,
                    target: endId,
                    sourceHandle: src.handle,
                    type: 'smoothstep',
                    label: src.handle === 'out-else' ? 'Else' : undefined,
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
