
import React, { useMemo, useState } from 'react';
import { DataObjectSuggestion, DictionaryEntry } from '../types';
import { ChevronRight, ChevronDown, Braces, Box, Layers, Code, Copy, Layout } from 'lucide-react';

interface ClipboardPreviewProps {
    dataSuggestions: DataObjectSuggestion[];
    baseClass: string;
}

interface ClipboardNode {
    name: string;
    type: 'Page' | 'Page List' | 'Property' | 'Group';
    className?: string;
    value?: string;
    children?: ClipboardNode[];
    isMeta?: boolean;
}

const ClipboardPreview: React.FC<ClipboardPreviewProps> = ({ dataSuggestions, baseClass }) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['pyWorkPage']));

    const clipboardTree = useMemo(() => {
        const root: ClipboardNode = {
            name: 'pyWorkPage',
            type: 'Page',
            className: baseClass,
            children: []
        };

        // Helper to find or create a path
        const ensurePath = (path: string[], parent: ClipboardNode, finalClass?: string) => {
            let current = parent;
            for (let i = 0; i < path.length; i++) {
                const part = path[i];
                let found = current.children?.find(c => c.name === part);
                if (!found) {
                    const isLast = i === path.length - 1;
                    const isPageList = part.endsWith('()');
                    const cleanName = part.replace('()', '');

                    found = {
                        name: cleanName,
                        type: isLast ? 'Group' : (isPageList ? 'Page List' : 'Page'),
                        className: isLast ? finalClass : undefined,
                        children: []
                    };
                    current.children = current.children || [];
                    current.children.push(found);

                    // Sort children: Meta first, then Properties, then Pages/Groups, then Alphabetical
                    current.children.sort((a, b) => {
                        if (a.isMeta && !b.isMeta) return -1;
                        if (!a.isMeta && b.isMeta) return 1;

                        if (a.type === 'Property' && b.type !== 'Property') return -1;
                        if (a.type !== 'Property' && b.type === 'Property') return 1;

                        return a.name.localeCompare(b.name);
                    });
                }
                current = found;
            }
            return current;
        };

        // 1. Add Standard Properties
        root.children?.push({ name: 'pxObjClass', type: 'Property', value: baseClass, isMeta: true });
        root.children?.push({ name: 'pyID', type: 'Property', value: '(Auto-generated)', isMeta: true });
        root.children?.push({ name: 'pyLabel', type: 'Property', value: 'Case Description', isMeta: true });

        // 2. Process Mappings
        dataSuggestions.forEach(group => {
            let groupNode: ClipboardNode;

            // CHECK: If this group belongs to the Base Class (Work Class), attach directly to pyWorkPage
            if (group.className === baseClass) {
                groupNode = root;
            } else {
                // Heuristic: Derive Page Name from Class Name (e.g. Org-App-Data-Customer -> Customer)
                const classParts = group.className.split('-');
                const pageName = classParts[classParts.length - 1] || 'UnknownPage';

                // Ensure the Page node exists on pyWorkPage
                let foundNode = root.children?.find(c => c.name === pageName);
                if (!foundNode) {
                    foundNode = {
                        name: pageName,
                        type: 'Page',
                        className: group.className,
                        children: []
                    };
                    root.children = root.children || [];
                    root.children.push(foundNode);

                    // Sort children: Meta first, then Properties, then Pages/Groups, then Alphabetical
                    root.children.sort((a, b) => {
                        if (a.isMeta && !b.isMeta) return -1;
                        if (!a.isMeta && b.isMeta) return 1;

                        if (a.type === 'Property' && b.type !== 'Property') return -1;
                        if (a.type !== 'Property' && b.type === 'Property') return 1;

                        return a.name.localeCompare(b.name);
                    });
                }
                groupNode = foundNode;
            }

            group.mappings.forEach(mapping => {
                // Assume mapping.suggestedProperty is a dot notation path i.e., ".Address.City"
                // Remove leading dot
                const fullPath = mapping.suggestedProperty.startsWith('.') ? mapping.suggestedProperty.substring(1) : mapping.suggestedProperty;
                const parts = fullPath.split('.');

                // Last part is the property itself
                const propName = parts.pop();
                if (!propName) return;

                // Path to the parent page (starting from the Group Node, NOT root)
                const parentNode = ensurePath(parts, groupNode!, group.className);

                // Add the property
                parentNode.children = parentNode.children || [];
                // Check if property already exists to avoid dupes from multiple mappings to same prop
                if (!parentNode.children.find(c => c.name === propName)) {
                    parentNode.children.push({
                        name: propName,
                        type: 'Property',
                        value: `[Mapped from ${mapping.elementId}]`
                    });

                    // Re-sort to ensure new property is placed correctly
                    parentNode.children.sort((a, b) => {
                        if (a.isMeta && !b.isMeta) return -1;
                        if (!a.isMeta && b.isMeta) return 1;

                        if (a.type === 'Property' && b.type !== 'Property') return -1;
                        if (a.type !== 'Property' && b.type === 'Property') return 1;

                        return a.name.localeCompare(b.name);
                    });
                }
            });
        });

        // Final Sort of Root
        root.children?.sort((a, b) => {
            if (a.isMeta && !b.isMeta) return -1;
            if (!a.isMeta && b.isMeta) return 1;
            if (a.type === 'Property' && b.type !== 'Property') return -1;
            if (a.type !== 'Property' && b.type === 'Property') return 1;
            return a.name.localeCompare(b.name);
        });

        return root;
    }, [dataSuggestions, baseClass]);

    const toggleNode = (id: string) => {
        const newSent = new Set(expandedNodes);
        if (newSent.has(id)) {
            newSent.delete(id);
        } else {
            newSent.add(id);
        }
        setExpandedNodes(newSent);
    };

    const renderNode = (node: ClipboardNode, path: string, depth: number) => {
        const nodeId = `${path}.${node.name}`;
        const isExpanded = expandedNodes.has(nodeId);
        const hasChildren = node.children && node.children.length > 0;

        const Icon = node.type === 'Page' ? Layers :
            node.type === 'Page List' ? Braces :
                node.type === 'Group' ? Box :
                    Code;

        return (
            <div key={nodeId} className="font-mono text-sm group/line">
                <div
                    className={`flex items-center gap-1 py-1 px-2 hover:bg-blue-50 cursor-pointer border-l-2 ${isExpanded ? 'border-blue-300' : 'border-transparent'}`}
                    style={{ paddingLeft: `${depth * 20 + 8}px` }}
                    onClick={() => hasChildren && toggleNode(nodeId)}
                >
                    {/* Expander */}
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
                        ) : (
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        )}
                    </div>

                    {/* Icon */}
                    <Icon size={14} className={`${node.isMeta ? 'text-gray-400' : node.type === 'Property' ? 'text-green-600' : 'text-sw-teal'}`} />

                    {/* Name */}
                    <span className={`${node.isMeta ? 'text-gray-500 italic' : 'text-gray-800 font-medium'}`}>
                        {node.name}
                    </span>

                    {/* Type / Class Badge */}
                    {node.type !== 'Property' && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded ml-2">
                            {node.type} {node.className ? `(${node.className})` : ''}
                        </span>
                    )}

                    {/* Value Preview */}
                    {node.value && (
                        <span className="text-gray-400 text-xs ml-2 truncate max-w-[200px] border-l border-gray-200 pl-2">
                            = <span className="text-blue-600">{node.value}</span>
                        </span>
                    )}
                </div>

                {/* Children (Recursive) */}
                {isExpanded && hasChildren && (
                    <div>
                        {node.children!.map(child => renderNode(child, nodeId, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Layout size={16} className="text-sw-teal" /> Clipboard Page Structure
                    </h3>
                    <p className="text-xs text-gray-500">Preview of <code>pyWorkPage</code> based on current mappings.</p>
                </div>
                <button
                    onClick={() => setExpandedNodes(new Set(['pyWorkPage']))}
                    className="text-xs text-gray-500 hover:text-sw-teal bg-white border border-gray-200 px-2 py-1 rounded shadow-sm"
                >
                    Collapse All
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {renderNode(clipboardTree, '', 0)}
            </div>
        </div>
    );
};

export default ClipboardPreview;
