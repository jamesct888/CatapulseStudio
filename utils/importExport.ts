
import { SectionDefinition, ElementDefinition, LogicGroup, Condition, CalculationPart } from '../types';

export interface ProcessSnippet {
    meta: {
        id: string;
        name: string;
        version: string;
        created: string;
        author: string;
    };
    content: {
        section: SectionDefinition;
    };
}

/**
 * Generates a unique ID (simple random string)
 */
const generateId = (prefix: string = 'id'): string => {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Exports a section to a JSON string.
 * Currently just wraps it in metadata. 
 * We could add "Tokenization" here later to make IDs neutral (e.g. {{FIELD_1}}), 
 * but for now we keep raw IDs and handle mapping on Import.
 */
export const exportSectionToJSON = (section: SectionDefinition, author: string = 'User'): string => {
    const snippet: ProcessSnippet = {
        meta: {
            id: `snippet-${Date.now()}`,
            name: section.title,
            version: '1.0.0',
            created: new Date().toISOString(),
            author: author
        },
        content: {
            section: JSON.parse(JSON.stringify(section)) // Deep copy
        }
    };
    return JSON.stringify(snippet, null, 2);
};

/**
 * Imports a JSON string and "hydrates" it with new unique IDs
 * to prevent collisions with existing elements.
 */
export const importSectionFromJSON = (jsonString: string): SectionDefinition | null => {
    try {
        const snippet: ProcessSnippet = JSON.parse(jsonString);
        if (!snippet.content || !snippet.content.section) {
            console.error("Invalid snippet format");
            return null;
        }

        const rawSection = snippet.content.section;

        // 1. Identify all Old IDs and generate New IDs
        const idMap = new Map<string, string>();

        // Map Section ID
        if (rawSection.id) {
            idMap.set(rawSection.id, generateId('sec'));
        }

        // Map Element IDs
        const traverseElementsForIds = (elements: ElementDefinition[]) => {
            elements.forEach(el => {
                if (el.id) {
                    idMap.set(el.id, generateId(el.type || 'el'));
                }
                // Handle nested structures if any (repeaters columns don't usually have global IDs but check types)
            });
        };
        traverseElementsForIds(rawSection.elements);

        // 2. Traversal function to replace IDs
        // We do this by deep walking specific properties that we know contain IDs

        const replaceLogicIds = (logic: LogicGroup) => {
            if (logic.conditions) {
                logic.conditions.forEach(cond => {
                    if (cond.targetElementId && idMap.has(cond.targetElementId)) {
                        cond.targetElementId = idMap.get(cond.targetElementId)!;
                    }
                    // Handle 'field' value source comparison
                    if (cond.valueSource === 'field' && typeof cond.value === 'string' && idMap.has(cond.value)) {
                        cond.value = idMap.get(cond.value)!;
                    }
                });
            }
            if (logic.groups) {
                logic.groups.forEach(g => replaceLogicIds(g));
            }
        };

        const hydrateElement = (el: ElementDefinition) => {
            // Replace ID using map
            if (el.id && idMap.has(el.id)) {
                el.id = idMap.get(el.id)!;
            }

            // Replace Calculation Refs
            if (el.calculation) {
                el.calculation.forEach(part => {
                    if (part.type === 'field' && idMap.has(part.value)) {
                        part.value = idMap.get(part.value)!;
                    }
                });
            }

            // Replace Source Field ID (Reflection)
            if (el.sourceFieldId && idMap.has(el.sourceFieldId)) {
                el.sourceFieldId = idMap.get(el.sourceFieldId)!;
            }

            // Replace Visibility/Required Logic
            if (el.visibility) replaceLogicIds(el.visibility);
            if (el.requiredLogic) replaceLogicIds(el.requiredLogic);
        };

        // 3. Apply Hydration
        // Update Section ID
        if (rawSection.id && idMap.has(rawSection.id)) {
            rawSection.id = idMap.get(rawSection.id)!;
        }

        // Update Section Visibility
        if (rawSection.visibility) replaceLogicIds(rawSection.visibility);

        // Update Elements
        rawSection.elements.forEach(el => hydrateElement(el));

        return rawSection;

    } catch (e) {
        console.error("Failed to parse or hydrate snippet", e);
        return null;
    }
};
