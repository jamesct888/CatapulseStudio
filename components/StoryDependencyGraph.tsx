
import React from 'react';
import { UserStory } from '../types';

interface StoryDependencyGraphProps {
    stories: UserStory[];
}

export const StoryDependencyGraph: React.FC<StoryDependencyGraphProps> = ({ stories }) => {
    // 1. Calculate Levels (Topological sort approximation)
    const getLevels = () => {
        const levels: { [id: string]: number } = {};
        const storyMap = new Map(stories.map(s => [s.id, s]));
        
        // Initialize all to 0
        stories.forEach(s => levels[s.id] = 0);

        // Simple iteration to push dependents forward (max 10 passes for safety)
        for (let i = 0; i < 10; i++) {
            let changed = false;
            stories.forEach(s => {
                if (s.dependencies && s.dependencies.length > 0) {
                    const maxDepLevel = Math.max(...s.dependencies.map(dId => levels[dId] || 0));
                    if (levels[s.id] <= maxDepLevel) {
                        levels[s.id] = maxDepLevel + 1;
                        changed = true;
                    }
                }
            });
            if (!changed) break;
        }
        return levels;
    };

    const levels = getLevels();
    const maxLevel = Math.max(0, ...Object.values(levels));
    
    // Group by level for rendering
    const columns: UserStory[][] = Array.from({ length: maxLevel + 1 }, () => []);
    stories.forEach(s => columns[levels[s.id]].push(s));

    // Calculate Coordinates
    const cardWidth = 220;
    const cardHeight = 80;
    const gapX = 100;
    const gapY = 20;
    const startX = 50;
    const startY = 50;

    const coords: { [id: string]: { x: number, y: number } } = {};
    
    columns.forEach((col, colIdx) => {
        col.forEach((story, rowIdx) => {
            coords[story.id] = {
                x: startX + colIdx * (cardWidth + gapX),
                y: startY + rowIdx * (cardHeight + gapY)
            };
        });
    });

    const canvasWidth = Math.max(800, startX + (maxLevel + 1) * (cardWidth + gapX));
    const canvasHeight = Math.max(500, startY + Math.max(...columns.map(c => c.length)) * (cardHeight + gapY) + 50);

    return (
        <div className="overflow-x-auto bg-slate-50 rounded-xl border border-gray-200 p-4">
            <svg width={canvasWidth} height={canvasHeight}>
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                    </marker>
                </defs>

                {/* Draw Connections */}
                {stories.map(story => (
                    story.dependencies?.map(depId => {
                        const start = coords[depId];
                        const end = coords[story.id];
                        if (!start || !end) return null;

                        const startPoint = { x: start.x + cardWidth, y: start.y + cardHeight / 2 };
                        const endPoint = { x: end.x, y: end.y + cardHeight / 2 };
                        
                        // Bezier Curve
                        const controlPoint1 = { x: startPoint.x + 50, y: startPoint.y };
                        const controlPoint2 = { x: endPoint.x - 50, y: endPoint.y };

                        return (
                            <path
                                key={`${depId}-${story.id}`}
                                d={`M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                                className="transition-all duration-500 hover:stroke-sw-teal hover:stroke-[3px]"
                            />
                        );
                    })
                ))}

                {/* Draw Nodes */}
                {stories.map(story => {
                    const pos = coords[story.id];
                    if (!pos) return null;
                    return (
                        <foreignObject key={story.id} x={pos.x} y={pos.y} width={cardWidth} height={cardHeight}>
                            <div className="w-full h-full bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md hover:border-sw-teal transition-all cursor-pointer flex flex-col justify-center group">
                                <div className="text-[10px] font-bold text-gray-400 group-hover:text-sw-teal transition-colors mb-1">{story.id}</div>
                                <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{story.title}</div>
                            </div>
                        </foreignObject>
                    );
                })}
            </svg>
        </div>
    );
};