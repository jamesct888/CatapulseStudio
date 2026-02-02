
import { Node, Edge, Position } from '@xyflow/react';
import { DataObjectSuggestion, DictionaryEntry } from '../types';
import { ClassNodeData } from './ClassNode';

// Simple tree layout helper
export const getLayoutedElements = (
    dataSuggestions: DataObjectSuggestion[],
    dictionary: DictionaryEntry[],
    baseClass: string,
    showAllClasses: boolean
): { nodes: Node[]; edges: Edge[] } => {

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeWidth = 280;
    const nodeHeight = 100;
    const levelHeight = 200;

    // Helper: Determine Layer
    const getLayer = (className: string) => {
        if (className === baseClass || className.includes('-Work-')) return 'Case Layer (Work)';
        if (className.includes('-Data-')) return 'Data Layer';
        if (className.includes('-Int-')) return 'Integration Layer';
        return 'Foundation / Other';
    };

    // 1. Build Merged Data Model
    // We want a unified list of Classes and their Properties.
    // Source precedence: Mapped Suggestion > Dictionary

    const classMap = new Map<string, {
        className: string;
        layer: string;
        properties: Map<string, string>; // name -> type
        isRoot: boolean;
        source: 'mapped' | 'dictionary' | 'both';
    }>();

    // Init Base Class
    classMap.set(baseClass, {
        className: baseClass,
        layer: 'Case Layer (Work)',
        properties: new Map(),
        isRoot: true,
        source: 'both' // Assume base class is always relevant
    });

    // Process Suggestions (Mapped)
    dataSuggestions.forEach(ds => {
        if (!classMap.has(ds.className)) {
            classMap.set(ds.className, {
                className: ds.className,
                layer: getLayer(ds.className),
                properties: new Map(),
                isRoot: false,
                source: 'mapped'
            });
        }
        const entry = classMap.get(ds.className)!;
        entry.source = 'mapped'; // Ensure marked as mapped

        ds.mappings.forEach(m => {
            const propName = m.suggestedProperty.replace('.', '');
            entry.properties.set(propName, 'Mapped');
        });
    });

    // Process Dictionary (if Show All enabled)
    if (showAllClasses) {
        dictionary.forEach(d => {
            if (!classMap.has(d.className)) {
                classMap.set(d.className, {
                    className: d.className,
                    layer: getLayer(d.className),
                    properties: new Map(),
                    isRoot: false,
                    source: 'dictionary'
                });
            }
            const entry = classMap.get(d.className)!;
            // If already mapped, upgrade to 'both'
            if (entry.source === 'mapped') entry.source = 'both';

            // Add property if not exists (preserve Mapped status if collision)
            // Note: In dictionary, d.property is simple name
            if (!entry.properties.has(d.property)) {
                entry.properties.set(d.property, d.type);
            }
        });
    }

    // Convert Map to Array for Layout
    const allClassNames = new Set(classMap.keys());
    const sortedClasses = Array.from(classMap.values()).sort((a, b) => a.className.length - b.className.length);

    sortedClasses.forEach((cls) => {
        // Create Node
        const props = Array.from(cls.properties.entries()).map(([name, type]) => ({ name, type }));

        // Visual tweak for Dictionary-only nodes?
        // We can pass `source` to ClassNode to style it differently (e.g. dashed border)
        // For now, ClassNode only uses layer color, but we can pass source in data.

        nodes.push({
            id: cls.className,
            type: 'classNode',
            data: {
                label: cls.className.split('-').pop() || cls.className,
                fullClassName: cls.className,
                layer: cls.layer,
                properties: props,
                isRoot: cls.isRoot,
                source: cls.source // Pass source to node
            } as ClassNodeData,
            position: { x: 0, y: 0 }
        });

        // Determine Parent (Same heuristic)
        if (cls.className === baseClass) return;

        let parentId = baseClass;
        let bestParentMatchLength = 0;

        for (const potentialParent of allClassNames) {
            if (potentialParent === cls.className) continue;

            if (cls.className.startsWith(potentialParent + '-')) {
                if (potentialParent.length > bestParentMatchLength) {
                    parentId = potentialParent;
                    bestParentMatchLength = potentialParent.length;
                }
            }
        }

        // Add Edge
        edges.push({
            id: `${parentId}-${cls.className}`,
            source: parentId,
            target: cls.className,
            type: 'smoothstep',
            animated: cls.source !== 'dictionary', // Animate active mapped paths
            style: { stroke: cls.source === 'dictionary' ? '#cbd5e1' : '#94a3b8', strokeDasharray: cls.source === 'dictionary' ? '5,5' : '0' }
        });
    });

    // --- Simple BFS Layout (Same as before) ---
    const depths: Record<string, number> = { [baseClass]: 0 };
    const queue = [baseClass];
    const levelCounts: Record<number, number> = { 0: 1 };

    const childrenMap: Record<string, string[]> = {};
    edges.forEach(e => {
        if (!childrenMap[e.source]) childrenMap[e.source] = [];
        childrenMap[e.source].push(e.target);
    });

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDepth = depths[current];
        const children = childrenMap[current] || [];

        children.forEach((child) => {
            if (depths[child] === undefined) {
                depths[child] = currentDepth + 1;
                levelCounts[currentDepth + 1] = (levelCounts[currentDepth + 1] || 0) + 1;
                queue.push(child);
            }
        });
    }

    const rowCurrentX: Record<number, number> = {};
    nodes.forEach(node => {
        const depth = depths[node.id] || 0;
        const countInRow = levelCounts[depth] || 1;
        const indexInRow = rowCurrentX[depth] || 0;
        rowCurrentX[depth] = indexInRow + 1;

        const rowWidth = countInRow * nodeWidth + (countInRow - 1) * 50;
        const startX = -(rowWidth / 2);

        node.position = {
            x: startX + indexInRow * (nodeWidth + 50),
            y: depth * levelHeight
        };
    });

    return { nodes, edges };
};
