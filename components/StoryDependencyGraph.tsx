
import React from 'react';
import { UserStory, ProcessDefinition } from '../types';

interface StoryDependencyGraphProps {
    stories: UserStory[];
    processDef: ProcessDefinition;
}

export const StoryDependencyGraph: React.FC<StoryDependencyGraphProps> = ({ stories, processDef }) => {
    // 1. Calculate Levels (Stages are Level 0)
    // We will group stories by their RELATED STAGE if possible

    // Map stage IDs to their index for ordering
    const stageOrder = processDef.stages.map((s, i) => ({ id: s.id, title: s.title, index: i }));
    const stageMap = new Map(stageOrder.map(s => [s.id, s]));

    // Group stories by Stage
    const storiesByStage: { [nodeId: string]: UserStory[] } = {};
    const unlinkedStories: UserStory[] = [];

    // Helper to check skip logic
    const stageInfoMap = new Map(processDef.stages.map(s => [s.id, s]));

    stories.forEach(story => {
        let linked = false;
        if (story.relatedStageIds && story.relatedStageIds.length > 0) {
            story.relatedStageIds.forEach(stageId => {
                if (stageMap.has(stageId)) {
                    const fullStage = stageInfoMap.get(stageId);
                    const hasSkipLogic = fullStage?.skipLogic;

                    let targetId = stageId;

                    // HEURISTIC: If story title mentions 'skip' and stage has skip logic, move to decision node
                    if (hasSkipLogic && story.title.toLowerCase().includes('skip')) {
                        targetId = `dec_${stageId}`;
                    }

                    if (!storiesByStage[targetId]) storiesByStage[targetId] = [];
                    storiesByStage[targetId].push(story);
                    linked = true;
                }
            });
        }

        // Also check if the logic links it implicitly (fallback)
        if (!linked) {
            unlinkedStories.push(story);
        }
    });

    // Layout Constants
    const cardWidth = 220;
    const cardHeight = 80;
    const stageNodeWidth = 180;
    const stageNodeHeight = 50;
    const decisionSize = 50; // Increased size
    const gapX = 180; // Increased gap for better breathing room
    const gapY = 30;

    // Calculate Coordinates
    const coords: { [id: string]: { x: number, y: number, type: 'stage' | 'story' | 'decision' } } = {};

    let currentX = 50;
    const startY = 50;
    let maxY = 0;

    // Helper: Find element label by ID
    const findElementLabel = (elementId: string): string => {
        for (const stage of processDef.stages) {
            for (const section of stage.sections) {
                const element = section.elements.find(e => e.id === elementId);
                if (element) return element.label;
            }
        }
        return elementId;
    };

    // Helper: Linear layout nodes (Stage | Decision)
    type LayoutNode =
        | { type: 'stage', data: typeof stageOrder[0] }
        | { type: 'decision', id: string, label: string, relatedStageId: string, conditionLabel?: string };

    const layoutNodes: LayoutNode[] = [];
    stageOrder.forEach((stage, idx) => {
        // Check for skip logic in the actual stage definition
        const fullStage = processDef.stages.find(s => s.id === stage.id);

        if (fullStage?.skipLogic) {
            // Try to create a meaningful label from the first condition
            let label = 'Skip?';
            let conditionLabel = 'Yes';

            if (fullStage.skipLogic.conditions && fullStage.skipLogic.conditions.length > 0) {
                const cond = fullStage.skipLogic.conditions[0];
                // Lookup the human-readable label for the field
                const fieldName = findElementLabel(cond.targetElementId);
                label = fieldName === cond.targetElementId ? 'Field?' : fieldName;

                // Format condition label
                const val = cond.value.toString();
                conditionLabel = `${cond.operator === 'equals' ? '==' : cond.operator} ${val}`;
                if (cond.operator === 'isNotEmpty') conditionLabel = 'Is Populated';
                if (cond.operator === 'isEmpty') conditionLabel = 'Is Empty';
            }

            layoutNodes.push({ type: 'decision', id: `dec_${stage.id}`, label: label, relatedStageId: stage.id, conditionLabel });
        }
        layoutNodes.push({ type: 'stage', data: stage });
    });

    // Place Layout Nodes (Stages + Decisions)
    layoutNodes.forEach((node, idx) => {
        const isDecision = node.type === 'decision';
        const nodeWidth = isDecision ? decisionSize * 2 : stageNodeWidth; // Diamond width approx
        const nodeX = currentX;
        const nodeY = isDecision ? startY + (stageNodeHeight / 2) - decisionSize / 2 : startY; // Center decision vertically relative to stage

        // Register Node
        const nodeId = node.type === 'stage' ? node.data.id : node.id;
        coords[nodeId] = {
            x: nodeX,
            y: nodeY,
            type: node.type
        };

        // Place Child Stories below (Stages AND Decisions)
        if (node.type === 'stage' || node.type === 'decision') {
            const stageStories = storiesByStage[nodeId] || [];
            let currentStoryY = startY + stageNodeHeight + gapY + 50; // Align stories below stage flow

            stageStories.forEach((story, storyIdx) => {
                if (coords[story.id]) return;
                coords[story.id] = { x: nodeX, y: currentStoryY, type: 'story' };
                currentStoryY += cardHeight + gapY;
            });
            maxY = Math.max(maxY, currentStoryY);
        }

        currentX += nodeWidth + gapX;
    });

    // Place Unlinked Stories in a separate column at the end
    if (unlinkedStories.length > 0) {
        const unlinkedX = currentX;
        let unlinkedY = startY;

        // "Unlinked" Header Node Fake
        const unlinkedId = 'unlinked_root';
        coords[unlinkedId] = { x: unlinkedX, y: unlinkedY, type: 'stage' };

        unlinkedY += stageNodeHeight + gapY + 50;

        unlinkedStories.forEach(story => {
            if (coords[story.id]) return;
            coords[story.id] = { x: unlinkedX, y: unlinkedY, type: 'story' };
            unlinkedY += cardHeight + gapY;
        });
        maxY = Math.max(maxY, unlinkedY);
        currentX += Math.max(cardWidth, stageNodeWidth) + gapX;
    }

    // Drag & Drop State
    const [nodePositions, setNodePositions] = React.useState<{ [id: string]: { x: number, y: number } }>({});
    const [dragState, setDragState] = React.useState<{ id: string | null, startX: number, startY: number, initX: number, initY: number }>({
        id: null, startX: 0, startY: 0, initX: 0, initY: 0
    });

    // Infinite Canvas State
    const [viewState, setViewState] = React.useState({ x: 0, y: 0, scale: 1 });
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Connector Drag State
    const [connectorControlPoints, setConnectorControlPoints] = React.useState<{ [linkId: string]: { x: number, y: number } }>({});
    const [connectorDragState, setConnectorDragState] = React.useState<{ linkId: string | null, startX: number, startY: number, initX: number, initY: number }>({
        linkId: null, startX: 0, startY: 0, initX: 0, initY: 0
    });

    // Selection State
    const [selectedLinkId, setSelectedLinkId] = React.useState<string | null>(null);

    // Pan State
    const [isPanning, setIsPanning] = React.useState(false);
    const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });

    // Helper to get effective coordinates
    const getPos = (id: string, defX: number, defY: number) => {
        return nodePositions[id] || { x: defX, y: defY };
    };

    const handleMouseDown = (e: React.MouseEvent, id: string, initX: number, initY: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({ id, startX: e.clientX, startY: e.clientY, initX, initY });
    };

    const handleConnectorMouseDown = (e: React.MouseEvent, linkId: string, initX: number, initY: number) => {
        e.preventDefault();
        e.stopPropagation();
        setConnectorDragState({ linkId, startX: e.clientX, startY: e.clientY, initX, initY });
    };

    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        // Start Panning on Left Click (if not clicking node) or Middle Click
        if (e.button === 0 || e.button === 1) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            setSelectedLinkId(null); // Deselect items
        }
    };

    const handleLinkClick = (e: React.MouseEvent, linkId: string) => {
        e.stopPropagation();
        setSelectedLinkId(linkId);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const scaleSpeed = 0.1;
            const newScale = Math.max(0.1, Math.min(5, viewState.scale - Math.sign(e.deltaY) * scaleSpeed));

            // Zoom towards mouse pointer logic could be added here, simplified for now:
            setViewState(prev => ({ ...prev, scale: newScale }));
        } else {
            // Pan with wheel
            setViewState(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Handle Pan
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        // Handle Node Drag
        if (dragState.id) {
            const dx = (e.clientX - dragState.startX) / viewState.scale;
            const dy = (e.clientY - dragState.startY) / viewState.scale;
            setNodePositions(prev => ({
                ...prev,
                [dragState.id!]: { x: dragState.initX + dx, y: dragState.initY + dy }
            }));
            return;
        }

        // Handle Connector Drag (Midpoint Drag Compensation: 2x delta)
        if (connectorDragState.linkId) {
            const dx = (e.clientX - connectorDragState.startX) / viewState.scale;
            const dy = (e.clientY - connectorDragState.startY) / viewState.scale;
            setConnectorControlPoints(prev => ({
                ...prev,
                [connectorDragState.linkId!]: { x: connectorDragState.initX + dx * 2, y: connectorDragState.initY + dy * 2 }
            }));
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDragState({ id: null, startX: 0, startY: 0, initX: 0, initY: 0 });
        setConnectorDragState({ linkId: null, startX: 0, startY: 0, initX: 0, initY: 0 });
    };

    // Infinite Canvas: We use a large virtual size but let SVG handle viewport
    // Actually, for "Figma-like", we just make the container fill parent and use viewState transform

    return (
        <div
            ref={containerRef}
            className="w-full h-[800px] bg-slate-50 relative overflow-hidden cursor-grab active:cursor-grabbing select-none border-2 border-slate-300 rounded-xl shadow-inner"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleBackgroundMouseDown}
            onWheel={handleWheel}
        >
            <div className="absolute top-4 left-4 z-50 bg-white/90 p-2 rounded shadow text-xs text-gray-500 pointer-events-none">
                Pan: Drag / Wheel • Zoom: Ctrl+Wheel ({Math.round(viewState.scale * 100)}%)
            </div>

            <svg
                width="100%"
                height="100%"
                className="w-full h-full"
            >
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                    </marker>
                    <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#20c997" />
                    </marker>
                    <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#b45309" />
                    </marker>
                    <pattern id="grid" width={20 * viewState.scale} height={20 * viewState.scale} patternUnits="userSpaceOnUse">
                        <circle cx={1 * viewState.scale} cy={1 * viewState.scale} r={1 * viewState.scale} fill="#cbd5e1" />
                    </pattern>
                </defs>

                {/* Background Grid */}
                <rect width="100%" height="100%" fill="url(#grid)" opacity={0.3} />

                {/* Transform Group for Zoom/Pan */}
                <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>

                    {/* Draw Flows (Decision -> Stage) */}
                    {layoutNodes.map((node, i) => {
                        if (node.type === 'decision') {
                            const decCoord = coords[node.id];
                            const stageCoord = coords[node.relatedStageId];

                            const relatedStageIndex = i + 1;
                            const nextNode = layoutNodes[relatedStageIndex + 1];
                            const nextStageCoord = nextNode ? coords[nextNode.type === 'stage' ? nextNode.data.id : nextNode.id] : null;

                            if (!decCoord || !stageCoord) return null;

                            const diamondRight = { x: decCoord.x + (decisionSize) + 20, y: decCoord.y + (decisionSize / 2) }; // Edge of diamond
                            // FIX: Center the bottom point accurately (removed erroneously added offset if any)
                            const diamondBottom = { x: decCoord.x + (decisionSize / 2), y: decCoord.y + decisionSize + 8 }; // Bottom tip + slight gap

                            const stageLeft = { x: stageCoord.x, y: decCoord.y + (decisionSize / 2) }; // Center Y aligned

                            // Skip Link Logic (Pre-calculated to avoid IIFE)
                            let skipLinkResult = null;
                            if (nextStageCoord) {
                                const linkId = `link-skip-${node.id}`;
                                // Default control point (reduced distance)
                                // FIX: Brought closer to source (Diamond) to avoid "flying away" handle
                                const defaultControlX = diamondBottom.x + 30;
                                const defaultControlY = diamondBottom.y + 30;

                                // Use state or default
                                const cp = (connectorControlPoints && connectorControlPoints[linkId]) ? connectorControlPoints[linkId] : { x: defaultControlX, y: defaultControlY };

                                const isSelected = selectedLinkId === linkId;

                                // Bezier Curve Label Calculation
                                const t = 0.5;
                                const p0 = diamondBottom;
                                const p1 = cp;
                                const p2 = { x: nextStageCoord.x - 5, y: nextStageCoord.y + (stageNodeHeight / 2) };

                                const mx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                                const my = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

                                skipLinkResult = (
                                    <>
                                        {/* Main Curve */}
                                        <path
                                            d={`M ${diamondBottom.x} ${diamondBottom.y} Q ${cp.x} ${cp.y}, ${p2.x} ${p2.y}`}
                                            fill="none"
                                            stroke={isSelected ? "#3b82f6" : "#f59e0b"} // Blue when selected, Amber normally
                                            strokeWidth={isSelected ? "5" : "2"}
                                            strokeDasharray="4,4"
                                            markerEnd={isSelected ? "url(#arrowhead-blue)" : "url(#arrowhead-amber)"}
                                            filter={isSelected ? "url(#glow)" : undefined}
                                            className="cursor-pointer transition-all duration-300"
                                            onClick={(e) => handleLinkClick(e, linkId)}
                                        />

                                        {/* Interactive Control Handle - Scaled inverse to zoom to keep size constant-ish */}
                                        {/* Interaction Group for Handle */}
                                        {/* Interaction Group for Handle - CENTERED ON CURVE MIDPOINT (mx, my) */}
                                        <g>
                                            {/* Hit Target (Invisible, larger, stable) */}
                                            <circle
                                                cx={mx}
                                                cy={my}
                                                r={20 / viewState.scale} // Larger hit area
                                                fill="transparent"
                                                stroke="none"
                                                className="cursor-grab active:cursor-grabbing z-50"
                                                onMouseDown={(e) => handleConnectorMouseDown(e, linkId, cp.x, cp.y)}
                                            />
                                            {/* Visual Handle (Pointer events none so hit target takes priority) */}
                                            <circle
                                                cx={mx}
                                                cy={my}
                                                r={12 / viewState.scale}
                                                fill={isSelected ? "#3b82f6" : "white"}
                                                stroke={isSelected ? "white" : "#f59e0b"}
                                                strokeWidth={3 / viewState.scale}
                                                className="pointer-events-none shadow-lg drop-shadow-xl"
                                            />
                                        </g>

                                        {/* Label moves with line (approx midpoint of quadratic bezier) */}
                                        <g transform={`translate(${mx}, ${my})`}>
                                            <rect
                                                x="-40" y="-8" width="80" height="16" fill="white" fillOpacity="0.9" rx="4"
                                                stroke={isSelected ? "#3b82f6" : "none"}
                                                strokeWidth="1"
                                                className="cursor-pointer"
                                                onClick={(e) => handleLinkClick(e, linkId)}
                                            />
                                            <text
                                                textAnchor="middle" dy="3" className={`text-[10px] font-bold pointer-events-none ${isSelected ? 'fill-blue-600' : 'fill-amber-700'}`}
                                            >
                                                {node.conditionLabel || 'True'}
                                            </text>
                                        </g>
                                    </>
                                );
                            }


                            return (
                                <React.Fragment key={`flow-group-${node.id}`}>
                                    {/* ELSE Branch (Straight to Related Stage) */}
                                    <path
                                        d={`M ${diamondRight.x} ${diamondRight.y} L ${stageLeft.x} ${stageLeft.y}`}
                                        stroke="#cbd5e1"
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    <g transform={`translate(${(diamondRight.x + stageLeft.x) / 2}, ${diamondRight.y - 8})`}>
                                        <rect x="-12" y="-6" width="24" height="12" fill="white" fillOpacity="0.9" rx="2" />
                                        <text textAnchor="middle" className="text-[10px] fill-gray-500 font-mono" dy="3">Else</text>
                                    </g>

                                    {/* CONDITION Branch (Skip to Next Node) */}
                                    {skipLinkResult}
                                </React.Fragment>
                            );
                        }
                        // Normal Stage Flow (Stage -> Next Node)
                        if (node.type === 'stage') {
                            // Keep usage of constants from parent scope
                            const nextNode = layoutNodes[i + 1];
                            if (!nextNode) return null;

                            const currCoord = coords[node.data.id];
                            const nextCoord = coords[nextNode.type === 'stage' ? nextNode.data.id : nextNode.id];

                            if (!currCoord || !nextCoord) return null;

                            const start = { x: currCoord.x + stageNodeWidth, y: currCoord.y + stageNodeHeight / 2 };
                            const end = { x: nextCoord.x, y: nextCoord.y + (nextNode.type === 'decision' ? decisionSize / 2 : stageNodeHeight / 2) };

                            return (
                                <path
                                    key={`flow-stage-${node.data.id}`}
                                    d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                                    stroke="#cbd5e1"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                    className="pointer-events-none"
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Draw Parent Links (Stage -> Story) */}
                    {stories.map(story => {
                        const storyBase = coords[story.id];
                        if (!storyBase) return null;
                        const storyCoord = getPos(story.id, storyBase.x, storyBase.y);

                        return (story.relatedStageIds || []).map(stageId => {
                            const stageCoord = coords[stageId]; // Stages are not draggable yet, kept simple
                            if (!stageCoord) return null;

                            // Draw line from Stage bottom to Story top
                            const start = { x: stageCoord.x + stageNodeWidth / 2, y: stageCoord.y + stageNodeHeight };
                            const end = { x: storyCoord.x + cardWidth / 2, y: storyCoord.y };

                            // Orthogonal / Stepped Line
                            const midY = start.y + 25;
                            return (
                                <path
                                    key={`link-${stageId}-${story.id}`}
                                    d={`M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`}
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                    className="pointer-events-none"
                                />
                            );
                        });
                    })}

                    {/* Draw Dependency Links (Story -> Story) */}
                    {stories.map(story => (
                        story.dependencies?.map(depId => {
                            const startBase = coords[depId];
                            const endBase = coords[story.id];
                            if (!startBase || !endBase) return null;

                            // Use dynamic positions
                            const start = getPos(depId, startBase.x, startBase.y);
                            const end = getPos(story.id, endBase.x, endBase.y);


                            const startPoint = { x: start.x + cardWidth, y: start.y + cardHeight / 2 };
                            const endPoint = { x: end.x, y: end.y + cardHeight / 2 };

                            // Bezier Curve
                            const controlPoint1 = { x: startPoint.x + 30, y: startPoint.y };
                            const controlPoint2 = { x: endPoint.x - 30, y: endPoint.y };

                            const linkId = `dep-${depId}-${story.id}`;
                            const isSelected = selectedLinkId === linkId;

                            return (
                                <g key={linkId}>
                                    {/* Invisible wider path for easier clicking */}
                                    <path
                                        d={`M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth="15"
                                        className="cursor-pointer"
                                        onClick={(e) => handleLinkClick(e, linkId)}
                                    />
                                    {/* Visible path */}
                                    <path
                                        d={`M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`}
                                        fill="none"
                                        stroke={isSelected ? "#3b82f6" : "#94a3b8"}
                                        strokeWidth={isSelected ? "3" : "2"}
                                        markerEnd={isSelected ? "url(#arrowhead-blue)" : "url(#arrowhead)"}
                                        className={`transition-all duration-300 pointer-events-none ${isSelected ? '' : 'hover:stroke-sw-teal hover:stroke-[3px]'}`}
                                    />
                                </g>
                            );
                        })
                    ))}

                    {/* Draw Nodes (Stage + Decision) */}
                    {layoutNodes.map(node => {
                        if (node.type === 'stage') {
                            const pos = coords[node.data.id];
                            if (!pos) return null;
                            return (
                                <foreignObject key={node.data.id} x={pos.x} y={pos.y} width={stageNodeWidth} height={stageNodeHeight} className="pointer-events-none">
                                    <div className="w-full h-full bg-slate-800 rounded-full border border-slate-700 shadow-md flex items-center justify-center">
                                        <span className="text-white font-bold text-sm tracking-wide">{node.data.title}</span>
                                    </div>
                                </foreignObject>
                            );
                        } else if (node.type === 'decision') {
                            const pos = coords[node.id];
                            if (!pos) return null;
                            const size = 50;
                            return (
                                <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                    {/* Diamond Shape */}
                                    <rect
                                        x={0}
                                        y={0}
                                        width={size}
                                        height={size}
                                        fill="#f59e0b" // Amber-500
                                        stroke="#b45309"
                                        strokeWidth="2"
                                        rx="2"
                                        transform={`rotate(45, ${size / 2}, ${size / 2})`}
                                        className="shadow-sm"
                                    />
                                    <text x={size / 2} y={size / 2 + 4} textAnchor="middle" className="text-[10px] font-bold fill-white pointer-events-none">Skip?</text>
                                </g>
                            );
                        }
                    })}

                    {/* Draw Unlinked Header */}
                    {unlinkedStories.length > 0 && coords['unlinked_root'] && (
                        <foreignObject x={coords['unlinked_root'].x} y={coords['unlinked_root'].y} width={stageNodeWidth} height={stageNodeHeight}>
                            <div className="w-full h-full bg-gray-400 rounded-full border border-gray-500 shadow-sm flex items-center justify-center opacity-70">
                                <span className="text-white font-bold text-sm">General / Unlinked</span>
                            </div>
                        </foreignObject>
                    )}

                    {/* Draw STORY Nodes */}
                    {stories.map(story => {
                        const basePos = coords[story.id];
                        if (!basePos) return null;
                        const pos = getPos(story.id, basePos.x, basePos.y);
                        const isSkeleton = story.id === 'us_0' || story.title.toLowerCase().includes('skeleton');

                        return (
                            <foreignObject
                                key={story.id}
                                x={pos.x}
                                y={pos.y}
                                width={cardWidth}
                                height={cardHeight}
                                style={{ overflow: 'visible' }} // Allow drag shadow/effects if needed
                            >
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, story.id, pos.x, pos.y)}
                                    className={`w-full h-full bg-white rounded-lg border shadow-sm p-3 hover:shadow-md hover:border-sw-teal transition-colors cursor-grab active:cursor-grabbing active:scale-105 active:shadow-lg select-none flex flex-col justify-center group ${isSkeleton ? 'border-sw-teal border-2 bg-teal-50' : 'border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-[10px] font-bold text-gray-400 group-hover:text-sw-teal transition-colors">{story.id}</div>
                                        {isSkeleton && <span className="text-[9px] bg-sw-teal text-white px-1 rounded uppercase">Skeleton</span>}
                                    </div>
                                    <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{story.title}</div>
                                </div>
                            </foreignObject>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};