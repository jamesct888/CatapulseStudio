import { GoogleGenAI } from "@google/genai";
import { ProcessDefinition, UserStory, StoryStrategy } from "../types";
import { getAiEnabled } from "./geminiService";

// @ts-ignore
const apiKey = (typeof process !== 'undefined' && process.env?.VITE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || 'TEST_KEY';

const ai = new GoogleGenAI({ apiKey });
const modelId = "gemini-3-flash-preview";

// --- Resilience / Retry Logic (Duplicated for standalone Agile Agent) ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('billing')) {
            console.error(`[Agile Service] 🛑 HARD QUOTA LIMIT REACHED: ${error.message}`);
            throw error;
        }
        const isRateLimit = error.status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('overloaded');
        if (retries > 0 && isRateLimit) {
            const waitTime = Math.max(delay, 10000);
            console.warn(`[Agile Service] ⚠️ Transient API Error, retrying in ${waitTime}ms...`);
            await new Promise(res => setTimeout(res, waitTime));
            return callWithRetry(fn, retries - 1, waitTime * 1.5);
        } else {
            throw error;
        }
    }
};

// --- Helper: Robust JSON Parsing ---
const cleanAndParseJSON = <T>(text: string | undefined): T | null => {
    if (!text) return null;
    let cleaned = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // Fallback: Stack-Based Extraction
        const extractJSON = (str: string): string | null => {
            let start = -1; let end = -1; let balance = 0; let inString = false; let stringChar = ''; let isEscaped = false;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (start === -1) {
                    if (char === '{' || char === '[') { start = i; balance = 1; }
                } else {
                    if (inString) {
                        if (isEscaped) { isEscaped = false; }
                        else if (char === '\\') { isEscaped = true; }
                        else if (char === stringChar) { inString = false; }
                    } else {
                        if (char === '"' || char === "'") { inString = true; stringChar = char; }
                        else if (char === '{' || char === '[') { balance++; }
                        else if (char === '}' || char === ']') {
                            balance--;
                            if (balance === 0) { end = i; break; }
                        }
                    }
                }
            }
            return (start !== -1 && end !== -1) ? str.substring(start, end + 1) : null;
        };
        const jsonCandidate = extractJSON(cleaned);
        if (jsonCandidate) {
            try { return JSON.parse(jsonCandidate) as T; } catch (e2) { return null; }
        }
        return null;
    }
}

// --- Helper: Generation Logic ---
const generateJSON = async <T>(
    prompt: string | any[],
    options: { maxTokens?: number; retries?: number; systemInstruction?: string; model?: string; logLabel?: string; } = {}
): Promise<T | null> => {
    const { maxTokens = 8192, retries = 2, systemInstruction, model = modelId, logLabel = "Agile Generation" } = options;

    if (!getAiEnabled()) {
        console.warn(`[Agile Service] 🔒 Security Block: AI is disabled.`);
        return null;
    }

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: model,
                contents: typeof prompt === 'string' ? prompt : prompt,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: maxTokens,
                    systemInstruction: systemInstruction
                }
            });
        }, retries);
        return cleanAndParseJSON<T>(response.text);
    } catch (e: any) {
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded')) throw e;
        console.warn(`[Agile Service] ${logLabel} failed:`, e.message);
        return null;
    }
};

export const generateUserStories = async (processDef: ProcessDefinition, strategy: StoryStrategy): Promise<UserStory[]> => {
    if (!getAiEnabled()) {
        console.warn("[Agile Service] generateUserStories blocked (AI Disabled)");
        return [];
    }
    if (!apiKey) return [];

    console.log("[Agile Service] Generating User Stories with strategy:", strategy);

    // Dynamic Splitting Logic
    let splittingInstruction = "";
    const cleanStrategy = typeof strategy === 'string' ? strategy.toLowerCase() : 'screen';

    if (cleanStrategy.includes('section')) {
        splittingInstruction = `
    2. **SPLIT STRATEGY: ONE STORY PER SECTION (Granular)**:
       - **CRITICAL**: The user needs granular tickets. You MUST generate distinct stories for separate sections.
       - **CONSTRAINT**: **NEVER** combine multiple sections into a single 'Screen' story.
       - **Title Format**: MUST be "[Stage Name]: [Section Name]" (e.g. "Draft Claim: Policy Details").
       - **Scope**: The Acceptance Criteria must ONLY reference fields that belong to that specific Section.
       - **Logic**: 
         - Iterate through every Section in the Stage.
         - Create one User Story per Section.
         - If Stage A has Section 1 and Section 2 -> Output Story A1 (Section 1) and Story A2 (Section 2).`;
    } else if (cleanStrategy.includes('journey')) {
        splittingInstruction = `
    2. **SPLIT STRATEGY: END-TO-END JOURNEY**:
       - Focus on the flow between stages rather than deep field validation.
       - Combine simple screens if they are part of a single logical step.`;
    } else {
        // Default: Screen Based
        splittingInstruction = `
    2. **SPLIT STRATEGY: ONE STORY PER SECTION (GRANULAR)**:
       - **CRITICAL**: The user wants stories split by SECTION, not just Screen.
       - **Logic**: For EACH Stage, look at its defined 'sections'. Create a separate user story for EACH section.
       - **Title**: "[Stage Name]: [Section Name]"
       - **Constraint**: Do NOT combine multiple sections into one story.
       - **Goal**: Granular validation where each ticket corresponds to one distinct UI section.`;
    }

    const prompt = `
    ACT AS: An expert UK QA Lead and Business Analyst (ISTQB Certified).
    GOAL: Generate a comprehensive list of User Stories for an **INTERNAL COLLEAGUE/AGENT**.
    
    STRUCTURE REQUIREMENT:
    1. **STORY 0 (SKELETON)**: The FIRST story MUST be a high-level "Process Skeleton" story.
       - Title: "End-to-End Process Flow"
       - Narrative: "As a Process Owner, I want the system to facilitate the end-to-end journey from [Start] to [End]..."
       - Criteria: 
         "GIVEN I am a Colleague 
          WHEN I create a [NAME OF PROCESS] case
          THEN the [NAME OF FIRST STAGE] screen should appear
          WHEN I hit Next/Submit
          THEN the [NAME OF SECOND STAGE] screen should appear
          (Repeat for all major stages until standard completion)"
    
    ${splittingInstruction}

    3. **SUBMISSION STORY (CONDITIONAL)**:
       - **CONDITION**: For every STAGE that has a valid transition to another stage.
       - **Title**: "Submit [Stage Name]"
       - **Narrative**: "As a System/User, I want to submit the [Stage Name], So that the next assignment is created."
       - **Criteria Focus**: What happens on click of 'Submit' (Validation & Routing).
       - **Required Syntax**: 
         "**WHEN** I click 'Submit' on [Stage Name]
          **THEN** the system should validate all mandatory data
          **AND** a new assignment for [Next Stage] should be generated..."
          
    4. **DATA ELEMENTS JSON ARRAY**:
       - **STRICTLY GENERATE A 'dataElements' ARRAY**: 
       - **label**: Field Label.
       - **type**: Field Type (text, select, etc).
       - **required**: boolean (true/false).
       - **visibility**: "Always", or logic like "If [Field] is 'Yes'".
       - **validation**: LIST ALL Regex or Business Rules here. (e.g. "^[0-9]+$").
       - **options**: LIST ALL Dropdown Options here as a CSV String. (e.g. "Name, Address, Other"). 
       
       **CRITICAL**: DO NOT MIX Validation and Options. They are separate fields now.
       - **Skill Check**: Mention that access depends on the user having the required skills (if applicable).

    CRITICAL OUTPUT ENTITY: 'acceptanceCriteria'. 
    This field MUST be a SINGLE MARKDOWN STRING containing:
    1. Gherkin Scenarios (GIVEN/WHEN/THEN) following strict rules below.
    2. A 'Data Elements' array in the JSON object (Structured Field Definitions). DO NOT include a Markdown table in the criteria text.

    INPUT DATA:
    - Testing Strategy: "${strategy}" (e.g., 'path' = Happy Paths, 'edge' = Edge Cases, 'negative' = Negative Testing)
    - Process Definition: 
    ${JSON.stringify(processDef)}

    OUTPUT SCHEMA (JSON Array):
    [
        {
            "id": "us_0",
            "title": "End-to-End Process Flow",
            "narrative": "As a...",
            "acceptanceCriteria": "...",
            "acceptanceCriteria": "...",
            "dataElements": [
                {
                    "label": "Change Type",
                    "type": "select",
                    "required": true,
                    "visibility": "Always",
                    "validation": "None",
                    "options": "Name, Address, Other"
                }
            ],
            "relatedStageIds": ["stg_1", "stg_2"], // Map to Input Stage IDs
            "priority": "High"
        },
        {
            "id": "us_1",
            "title": "Capture Personal Details",
            "description": "As a [Internal Role], I want to [Action], So that [Goal]",
            "acceptanceCriteria": "...",
            "relatedStageIds": ["stg_1"], // Specific Stage ID this story belongs to
            "priority": "High"
        }
    ]

    STRICT GHERKIN RULES:
    1. **Format Keywords**: ALWAYS make Gherkin keywords BOLD: **GIVEN**, **WHEN**, **THEN**, **AND**.

    2. **PERSONA (Internal Only)**: 
       - In the 'description', ALWAYS use "As a **Service Agent**" or "As a **Colleague**".
       - NEVER use "As a user wanting to update my...".

    3. **GIVEN (Context)**: 
       - Set the scene: "**GIVEN** I am a Colleague handling a [Case Type] **AND** I am on the [Screen/Section Name]..."
    
    4. **WHEN (User Action)**: 
       - **CRITICAL**: Do NOT list data entry steps (e.g. "WHEN I enter Name, AND I enter Email...").
       - USE High-Level Actions: "**WHEN** I am viewing the [Section Name] section" or "**WHEN** I initiate the task".
    
    5. **THEN (Field Availability - MANDATORY)**: 
       - You MUST list the definitions here. Do NOT say "details should be saved".
       - Format: "**THEN** the following fields should be available:"
       - List: "* **[Field Name]**" (Must match table below).
       - **CRITICAL**: Use bold square brackets around field names in the text: **[Field Name]**.

    6. **ANTI-PATTERNS (DO NOT DO)**:
       - Do NOT create separate stories just for selecting dropdown options (e.g. "WHEN I select 'Yes'").
       - Do NOT list "validating" fields in the text. Validation/Options go in the Table.

    7. **DATA ELEMENTS TABLE**:
       - **STRICTLY USE THESE EXACT COLUMNS**: 
         | Label | Type | Mandatory | Visible When | Validation | Options |
       - **Visible When**: "Always", or logic like "If [Field] is 'Yes'".
       - **Validation**: MUST be empty for 'select/radio' lists (unless custom regex). DO NOT put options here.
       - **Options**: For 'select/radio' fields, list values separated by comma e.g. "Name Change, Address Change". PUT HERE ONLY.
    
       - Limit this to complex branching where multiple outcomes exist.
       - If it's a simple flow to the next stage, the **Submission Story** (Part B above) handles it.
          **AND** all validation is passed
          **AND** [Condition, e.g., 'FullName is populated']
          **THEN** generate assignment '[Next Stage Name]'
          **AND** have it require [any routing skills defined]"
         
         - **EXAMPLES**:
           - ❌ INCORRECT: "THEN the process should skip the Review stage."
           - ✅ CORRECT: "**THEN** generate assignment 'Decision & Execution' **AND** have it require 'Senior Reviewer' skill."

         - generate a second scenario for the ELSE/Negative path.
       - **Related Stage**: Link this story to the CONDITIONAL Stage ID (the one being skipped/entered).

    9. **QA**: The combination of the **THEN** list and the **TABLE** must fully define the screen found in the Input Data.

    RETURN ONLY AND EXCLUSIVELY VALID JSON.
    `;

    try {
        const parsed = await generateJSON<any>(prompt);
        if (!parsed) throw new Error("Failed to parse AI response.");

        // UNWRAPPER
        let finalStories: any[] = [];
        if (Array.isArray(parsed)) finalStories = parsed;
        else if (parsed.userStories && Array.isArray(parsed.userStories)) finalStories = parsed.userStories;
        else if (parsed.stories && Array.isArray(parsed.stories)) finalStories = parsed.stories;
        else {
            const possibleArray = Object.values(parsed).find(v => Array.isArray(v));
            if (possibleArray) finalStories = possibleArray as any[];
        }

        if (!finalStories || finalStories.length === 0) throw new Error("No stories found in AI response.");

        // VALIDATION & MAPPING
        return finalStories.map((s, index) => {
            // Smart Mapping for Missing Keys
            if (!s.title || !s.narrative || !s.acceptanceCriteria) {
                const values = Object.values(s);
                const stringValues = values.filter(v => typeof v === 'string') as string[];
                // Look for the long rich markdown string for criteria
                const longMarkdown = stringValues.find(v => v.includes('GIVEN') || v.includes('|') || v.length > 200);

                if (!s.acceptanceCriteria && longMarkdown) s.acceptanceCriteria = longMarkdown;

                // Fallback titles/narratives
                if (!s.title) s.title = stringValues.find(v => v.length < 100 && v !== s.acceptanceCriteria) || "Untitled Story";
                if (!s.narrative) s.narrative = stringValues.find(v => v.length >= 10 && v !== s.acceptanceCriteria) || "No narrative";
            }

            // Defaults
            if (!s.id) s.id = 'gen_story_' + index + '_' + Date.now();
            if (!s.title) s.title = "Untitled Story";
            if (!s.narrative) s.narrative = "No narrative provided.";
            if (!s.acceptanceCriteria) s.acceptanceCriteria = "No criteria generated.";

            // --- STRICT SYNTAX ENFORCEMENT (Post-Processing) ---
            if (s.title.toLowerCase().startsWith('rule:') || s.title.toLowerCase().includes('logic')) {
                s.acceptanceCriteria = s.acceptanceCriteria
                    .replace(/proceed to ['"]?(.+?)['"]?(?=\W|$)/gi, "generate assignment '$1'")
                    .replace(/skip the stage/gi, "generate assignment 'Next Stage'")
                    .replace(/proceed to the next stage/gi, "generate assignment 'Next Stage'");
            }

            return s as UserStory;
        });

    } catch (error: any) {
        console.error("Error generating User Stories:", error);
        throw new Error(error.message || "Unknown Error");
    }
};
