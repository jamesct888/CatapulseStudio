
import { mortgageProcess } from './mortgage-process';
import { coffeeShopProcess } from './coffee-shop';
import { comprehensiveProcess } from './comprehensive-showcase';
import { ProcessDefinition } from '../types';

export interface TemplateCard {
    id: string;
    title: string;
    description: string;
    tags: string[];
    processDef: ProcessDefinition;
    color: string;
}

export const GALLERY_TEMPLATES: TemplateCard[] = [
    {
        id: 'tmpl-kitchen-sink',
        title: 'Mars Colony Application',
        description: 'Comprehensive clearance process exercising every system capability: Repeaters, Calculations, Regex, and Multi-stage Logic.',
        tags: ['Reference', 'Space', 'Complex'],
        processDef: comprehensiveProcess,
        color: 'bg-indigo-600'
    },
    {
        id: 'tmpl-mortgage',
        title: 'Enterprise Mortgage App',
        description: 'Complex 5-stage flow with calculations, regex validation, skip logic, and Pega class structure.',
        tags: ['Finance', 'Complex Logic', 'Pega'],
        processDef: mortgageProcess,
        color: 'bg-emerald-600'
    },
    {
        id: 'tmpl-coffee',
        title: 'Coffee Shop Order',
        description: 'Visual ordering experience demonstrating conditional visibility, radio buttons, and clear UX.',
        tags: ['Retail', 'Visual', 'UX'],
        processDef: coffeeShopProcess,
        color: 'bg-orange-500'
    }
];
