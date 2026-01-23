import path from 'path';
import fs from 'fs';
import { ProcessDefinition } from './types';

// Load env locally BEFORE importing service
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const keyMatch = envContent.match(/VITE_API_KEY=(.+)/);
    if (keyMatch) {
        // Strip quotes if present
        process.env.VITE_API_KEY = keyMatch[1].trim().replace(/^["']|["']$/g, '');
    }
} catch (e) {
    console.warn("Could not load .env.local");
}

// Dynamic import to ensure env is set first
// @ts-ignore
const { generateUserStories } = await import('./services/agileService');

// Mock Process
const mockProcess: ProcessDefinition = {
    id: 'test_proc',
    name: 'Test Process',
    description: 'A simple process for testing AI generation',
    stages: [
        {
            id: 'stg_1',
            title: 'Intake',
            sections: [
                {
                    id: 'sec_1',
                    title: 'User Details',
                    elements: [
                        { id: 'el_1', label: 'Name', type: 'text' },
                        { id: 'el_2', label: 'Email', type: 'email' }
                    ]
                }
            ]
        }
    ]
};

console.log("--- STARTING DEBUG SCRIPT ---");
console.log("VITE_API_KEY Present:", !!process.env.VITE_API_KEY);

(async () => {
    try {
        console.log("Calling generateUserStories...");
        const result = await generateUserStories(mockProcess, 'path');
        console.log("--- RESULT ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error("--- ERROR ---");
        console.error(e.message);
    }
})();
