
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessDefinition, StageDefinition, SectionDefinition, ElementDefinition, FormState, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StrategyRecommendation, ChatMessage, DataObjectSuggestion, LogicGroup } from "../types";

// @ts-ignore
const apiKey = (typeof process !== 'undefined' && process.env?.VITE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || 'TEST_KEY';
console.log('[GeminiService] Initialized with API Key present:', !!apiKey);
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-3-flash-preview"; // User requested Gemini 3 Preview

// --- Resilience / Retry Logic ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const msg = error.message?.toLowerCase() || '';

        // 1. FAIL FAST: Check for Hard Quota Limits (Daily Limit/Billing)
        if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('billing')) {
            console.error(`[AI Service] 🛑 HARD QUOTA LIMIT REACHED: ${error.message} `);
            throw error;
        }

        // Check if it is a transient rate limit error
        const isRateLimit = error.status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('overloaded');

        // 2. RETRY: Transient Rate Limits
        if (retries > 0 && isRateLimit) {
            const waitTime = Math.max(delay, 10000);
            console.warn(`[AI Service] ⚠️ Transient API Error(429 / Overloaded), retrying in ${waitTime}ms... (${retries} attempts left).Error: ${msg} `);
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
            let start = -1;
            let end = -1;
            let balance = 0;
            let inString = false;
            let stringChar = '';
            let isEscaped = false;

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

        let jsonCandidate = extractJSON(cleaned);

        if (!jsonCandidate) {
            const firstOpen = cleaned.search(/[\{\[]/);
            const lastClose = cleaned.search(/[\}\]][^}]*$/);
            if (firstOpen !== -1 && lastClose !== -1) {
                jsonCandidate = cleaned.substring(firstOpen, lastClose + 1);
            }
        }

        if (!jsonCandidate) return null;

        try {
            return JSON.parse(jsonCandidate) as T;
        } catch (e2) {
            return null;
        }
    }
}

// Recursively ensure logic groups have valid arrays
const sanitizeLogicGroup = (group: LogicGroup | undefined) => {
    if (!group) return;
    if (!group.conditions || !Array.isArray(group.conditions)) group.conditions = [];
    if (!group.groups || !Array.isArray(group.groups)) group.groups = [];
    group.groups.forEach(sanitizeLogicGroup);
};

export const sanitizeProcessData = (data: ProcessDefinition): ProcessDefinition => {
    if (!data.stages || !Array.isArray(data.stages)) data.stages = [];
    for (const stage of data.stages) {
        if (!stage.sections || !Array.isArray(stage.sections)) stage.sections = [];

        // Sanitize Stage Logic
        if (!stage.skillLogic || !Array.isArray(stage.skillLogic)) stage.skillLogic = [];
        stage.skillLogic.forEach(rule => sanitizeLogicGroup(rule.logic));
        if (stage.skipLogic) sanitizeLogicGroup(stage.skipLogic);

        for (const section of stage.sections) {
            if (!section.elements || !Array.isArray(section.elements)) section.elements = [];
            if (!section.layout) section.layout = '1col';

            // Sanitize Section Visibility
            if (section.visibility) sanitizeLogicGroup(section.visibility);

            for (const el of section.elements) {
                if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)} `;
                // Fix options
                if (el.options && Array.isArray(el.options)) {
                    el.options = el.options.map((opt: any) => {
                        if (typeof opt === 'object' && opt !== null) return opt.label || opt.value || opt.text || JSON.stringify(opt);
                        return String(opt);
                    });
                }
                // Compatibility for legacy visibilityConditions
                const anyEl = el as any;
                if (anyEl.visibilityConditions && Array.isArray(anyEl.visibilityConditions) && !el.visibility) {
                    el.visibility = { id: `vis_${el.id} `, operator: 'AND', conditions: anyEl.visibilityConditions };
                }
                if (anyEl.requiredConditions && Array.isArray(anyEl.requiredConditions) && !el.requiredLogic) {
                    el.requiredLogic = { id: `req_${el.id} `, operator: 'AND', conditions: anyEl.requiredConditions };
                }

                // Sanitize Element Logic
                if (el.visibility) sanitizeLogicGroup(el.visibility);
                if (el.requiredLogic) sanitizeLogicGroup(el.requiredLogic);
            }
        }
    }
    return data;
}

// --- OPTIMIZATION 1: MONOLITHIC GENERATION (Fastest) ---
export const generateMonolithicProcess = async (description: string): Promise<ProcessDefinition | null> => {
    console.log(`[AI Service] 🚀 Attempting Monolithic Generation for: "${description}"`);
    if (!apiKey) return null;

    const prompt = `
    Act as an expert UK Business Analyst. 
    Design a COMPLETE business process for: "${description}".

    CONTEXT:
    - Market: UK.
    - Language: British English.

    REQUIREMENTS:
    1. Define Stages(e.g.Intake, Review, Decision).
    2. Define Sections within stages.
    3. Define Data Elements(Fields) within sections.
    4. Return a SINGLE valid JSON object matching ProcessDefinition.
    
    Field Types: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'radio', 'checkbox', 'static', 'repeater', 'calculated'.
    
    JSON Structure:
    {
        "id": "proc_auto",
            "name": "Process Name",
                "description": "Summary",
                    "stages": [
                        {
                            "id": "stg_1", "title": "Stage 1",
                            "sections": [
                                { "id": "sec_1", "title": "Section 1", "layout": "2col", "elements": [{ "id": "el_1", "label": "Name", "type": "text" }] }
                            ]
                        }
                    ]
    }
`;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192, // Max tokens for one-shot
                }
            });
        }, 1, 2000); // 1 retry only, fail fast to fallback

        const data = cleanAndParseJSON<ProcessDefinition>(response.text);
        if (data && data.stages && data.stages.length > 0) {
            return sanitizeProcessData(data);
        }
        return null;
    } catch (e: any) {
        // If quota error, rethrow to let UI handle demo fallback
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded') || e.message?.includes('billing')) {
            throw e;
        }
        console.warn("[AI Service] Monolithic generation failed or truncated. Switching to iterative strategy.");
        return null;
    }
};

// --- PHASE 1: GENERATE SKELETON (Stages Only) ---
export const generateProcessSkeleton = async (description: string): Promise<ProcessDefinition | null> => {
    console.log(`[AI Service] 🦴 Generating Skeleton for: "${description}"`);
    if (!apiKey) {
        console.error("API Key is missing");
        return null;
    }

    const skeletonPrompt = `
    Act as an expert UK Business Analyst. 
    Create a high - level business process SKELETON for: "${description}".

    CONTEXT:
    - Target Market: United Kingdom(UK).
    - Language: British English(en - GB).

    Requirements:
    1. Define specific Stages needed for this process(e.g., Intake, Validation, Decision).
    2. Do NOT generate Sections or Elements yet.Just the Stages with IDs, Titles, and Descriptions.
    3. Return valid JSON only.
    
    Structure required:
    {
        "id": "proc_auto",
            "name": "derived from description",
                "description": "Executive summary of process",
                    "stages": [
                        {
                            "id": "stg_1",
                            "title": "Stage Name",
                            "description": "Brief description of the goal of this stage."
                        }
                    ]
    }
`;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: skeletonPrompt,
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: "You are a JSON generator. Output ONLY valid JSON. No conversational text.",
                    maxOutputTokens: 2048,
                }
            });
        }, 2, 2000);

        const skeleton = cleanAndParseJSON<ProcessDefinition>(response.text);
        if (!skeleton) return null;

        // Initialize sections array for safety
        skeleton.stages.forEach(s => s.sections = []);
        return skeleton;
    } catch (error) {
        console.error("Error generating skeleton:", error);
        return null;
    }
};

// --- PHASE 2: GENERATE FLESH (One-Shot Batch) ---
export const generateProcessFlesh = async (skeleton: ProcessDefinition): Promise<ProcessDefinition | null> => {
    console.log(`[AI Service] ⚡ Generating Flesh for ALL ${skeleton.stages.length} stages in batch...`);
    if (!apiKey) return null;

    const prompt = `
    Act as an expert UK Business Analyst.
        I have a process skeleton.Generate detailed SECTIONS and DATA FIELDS for ALL the following stages.

        SKELETON STAGES:
        ${JSON.stringify(skeleton.stages.map(s => ({ id: s.id, title: s.title, description: s.description })))}

    CONTEXT: ${skeleton.description}

    REQUIREMENTS:
    1. For EACH stage ID provided, generate a list of Sections.
        2. Each Section must have 3 - 6 Data Elements(Fields).
        3. Include 'visibility' logic where appropriate.
        4. STRICTLY USE ONLY THESE FIELD TYPES: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'multiselect', 'radio', 'checkbox', 'static', 'repeater', 'calculated'.
        
        OUTPUT FORMAT:
        Return a JSON Object where Keys are the 'id' of the Stage, and Values are arrays of SectionDefinition.
        
        Example Output:
        {
            "stg_1": [{ "id": "sec_1", "title": "Personal Details", "elements": [...] }],
                "stg_2": [... ]
        }
`;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                }
            });
        });

        const stageMap = cleanAndParseJSON<Record<string, SectionDefinition[]>>(response.text);
        if (!stageMap) return null;

        // Merge back into skeleton
        const fleshedProcess = { ...skeleton };
        fleshedProcess.stages = fleshedProcess.stages.map(stage => {
            if (stageMap[stage.id]) {
                return { ...stage, sections: stageMap[stage.id] };
            }
            return stage;
        });

        return sanitizeProcessData(fleshedProcess);

    } catch (e: any) {
        console.error(`Error generating batch details: `, e);
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded') || e.message?.includes('billing') || e.status === 429) {
            throw e;
        }
        return null;
    }
};

// --- PHASE 2: GENERATE DETAILS (Fields for a specific stage) ---
export const generateStageDetails = async (stage: StageDefinition, processDescription: string): Promise<SectionDefinition[]> => {
    console.log(`[AI Service] ⚡ Generating Flesh for Stage: "${stage.title}"`);
    if (!apiKey) return [];

    const detailPrompt = `
    Act as an expert UK Business Analyst.
        We are defining the "${stage.title}" stage of a "${processDescription}" process.
        Stage Goal: ${stage.description || stage.title}.

        Generate the detailed SECTIONS and DATA FIELDS for this specific stage.

    Requirements:
    1. Define 1 - 3 Sections.
        2. Each Section must have 3 - 6 specific Data Elements(Fields).
        3. INCLUDE LOGIC:
    - Add 'visibility' logic to fields.
        4. Types: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'radio', 'checkbox', 'static', 'repeater', 'calculated'.
        5. IDs: Use unique IDs(e.g., 'sec_${stage.id}_1', 'el_${stage.id}_dob').

        Return ONLY a JSON Array of SectionDefinition objects:
    [
        {
            "id": "sec_${stage.id}_1",
            "title": "Section Name",
            "layout": "2col",
            "elements": [... ]
        }
    ]
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: detailPrompt,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                }
            });
        });
        const sections = cleanAndParseJSON<SectionDefinition[]>(response.text);

        // We must sanitize this partial result manually since it's just sections
        if (sections) {
            const dummyProcess = { id: '', name: '', description: '', stages: [{ id: 'temp', title: '', sections }] };
            const sanitized = sanitizeProcessData(dummyProcess);
            return sanitized.stages[0].sections;
        }
        return [];
    } catch (e) {
        console.error(`Error generating details for stage ${stage.title}: `, e);
        return [{
            id: `sec_err_${stage.id} `,
            title: "Details Generation Failed",
            layout: "1col",
            variant: "warning",
            elements: [{
                id: `el_err_${stage.id} `,
                label: "Error: Generation Failed",
                description: "Rate limit exceeded or API error. Please try manually adding fields.",
                type: "static"
            }]
        }] as SectionDefinition[];
    }
};

// Deprecated legacy wrapper
export const generateProcessStructure = async (description: string): Promise<ProcessDefinition | null> => {
    return generateMonolithicProcess(description);
};

export const generateProcessFromImage = async (base64Data: string, mimeType: string): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;
    const prompt = `Act as an expert UK Business Analyst.Analyze this document...`;
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }],
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        const data = cleanAndParseJSON<ProcessDefinition>(response.text);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Vision API Error:", error); return null; }
}

export const importLegacyContent = async (textContext: string): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;
    const prompt = `Act as a Migration Architect.Convert this legacy schema / text into a Catapulse Process Definition.LEGACY CONTENT: ${textContext} `;
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        const data = cleanAndParseJSON<ProcessDefinition>(response.text);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Legacy Import Error:", error); return null; }
}

export const modifyProcess = async (currentProcess: ProcessDefinition, instruction: string, context: { selectedStageId: string, selectedSectionId: string | null }): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;
    const prompt = `
    ACT AS: An expert UK Business Analyst and Systems Architect.

    GOAL: Modify the existing business process JSON based strictly on the user's INSTRUCTION.

    INPUT CONTEXT:
    - User Instruction: "${instruction}"
    - Current Stage ID: "${context.selectedStageId}"
        - Current Section ID: "${context.selectedSectionId || 'none'}"
            - Current Process JSON: 
    ${JSON.stringify(currentProcess)}

    STRICT MODIFICATION RULES:
    1. ** Intelligent Labeling **: If the user asks for "address lines", GENERATE 5 - 6 fields with clear, professional labels(e.g., "Address Line 1", "Address Line 2", "Town/City", "County", "Postcode").DO NOT use generic names like "Field 1" or "Text Input".
    2. ** Correct Types **: Use the most appropriate field type. 
       - "Address Line 1" -> 'text'
    - "Postcode" -> 'text'(or 'text' with regex if you were adding validation, but standard 'text' is fine)
    - "Email" -> 'email'
    - "Date of Birth" -> 'date'
    - "Salary" -> 'currency'
    3. ** Structure Integrity **: Do NOT delete existing fields unless explicitly asked.APPEND new fields to the selected section(or the first section of the selected stage if no section is selected).
    4. ** JSON Only **: Return ONLY the full, valid, modified ProcessDefinition JSON.No markdown, no chat.

    Execute the instruction now.
    `;
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        const data = cleanAndParseJSON<ProcessDefinition>(response.text);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Error modifying process:", error); return null; }
};

export const generateFormData = async (processDef: ProcessDefinition, personaDescription: string): Promise<FormState | null> => {
    if (!apiKey) return null;
    const fields = processDef.stages.flatMap(s => s.sections.flatMap(sec => sec.elements.map(el => ({ id: el.id, label: el.label, type: el.type, options: el.options, columns: el.columns }))));
    const prompt = 'Act as a testing data generator...Fields: ' + JSON.stringify(fields) + '...Persona: "' + personaDescription + '"...';
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        return cleanAndParseJSON<FormState>(response.text);
    } catch (e) { console.error("Error generating form data", e); return null; }
}

export const consultStrategyAdvisor = async (processDef: ProcessDefinition, chatHistory: ChatMessage[], userMessage: string): Promise<{ reply: string, recommendations: StrategyRecommendation[] }> => {
    if (!apiKey) return { reply: "AI Service Unavailable", recommendations: [] };
    const prompt = `
    ACT AS: A Senior Agile Coach and QA Strategist.
    
    GOAL: Analyze the provided Business Process and the User's Message (or history) to provide strategic advice on how to break down User Stories and test this solution.

    INPUT CONTEXT:
    - User Message: "${userMessage}"
    - Process Definition: 
    ${JSON.stringify(processDef)}
    
    RESPONSE REQUIREMENTS:
    1. **Reply**: A conversational, helpful, and professional response to the user.
    2. **Recommendations**: A list of 1-3 suggested "Story Splitting Strategies" suitable for this specific process complexity.

    OUTPUT FORMAT:
    Return ONLY valid JSON matching this structure:
    {
        "reply": "Your conversational advice here...",
        "recommendations": [
            {
                "id": "rec_1",
                "strategyName": "By Screen / Component",
                "strategyDescription": "screen", 
                "pros": ["Good for frontend dev", "Clear boundaries"],
                "cons": ["May miss end-to-end logic"],
                "estimatedCount": 5,
                "recommendationLevel": "High"
            }
        ]
    }
    
    VALID STRATEGY KEYS for 'strategyDescription': 'screen', 'journey', 'persona', or a custom short string.
    `;
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        const data = cleanAndParseJSON<{ reply: string, recommendations: StrategyRecommendation[] }>(response.text);
        return data || { reply: "I couldn't analyze that.", recommendations: [] };
    } catch (e) { console.error("Error consulting strategy advisor:", e); return { reply: "Error.", recommendations: [] }; }
};

export const generateUserStories = async (processDef: ProcessDefinition, strategy: StoryStrategy): Promise<UserStory[]> => {
    if (!apiKey) return [];

    // ISTQB Certified Prompt
    const prompt = `
    ACT AS: An expert UK QA Lead and Business Analyst (ISTQB Certified).
    GOAL: Generate a comprehensive list of User Stories for an **INTERNAL COLLEAGUE/AGENT**.
    
    STRUCTURE REQUIREMENT:
    1. **STORY 0 (SKELETON)**: The FIRST story MUST be a high-level "Process Skeleton" story.
       - Title: "End-to-End Process Flow"
       - Description: "As a Process Owner, I want the system to facilitate the end-to-end journey from [Start] to [End]..."
       - Criteria: "GIVEN I am a Colleague... WHEN I follow the standard process... THEN the process should flow from [Stage A] to [Stage B]." (No Field Details).
    
    2. **SPLIT STRATEGY PER STAGE**: For EACH Stage/screen in the process, you must generate AT LEAST TWO distinct stories:
       
       **A. SCREEN STORY (Display & Validation)**
       - **Title**: "[Stage Name] Screen"
       - **Description**: "As a [Role], I want to view and complete the [Stage Name], So that I can capture the necessary data."
       - **Criteria Focus**: Field visibility, validation, and layout.
       - **Constraint**: Must include the Data Elements JSON Array.
       - **Field Reference**: ALL fields in the AC text must be bolded and in brackets, e.g., "**[Customer Name]**".

       **B. SUBMISSION STORY (CONDITIONAL)**
       - **CONDITION**: CHECK INPUT DATA. If the stage is an End Event or has no outgoing connections, **DO NOT GENERATE THIS STORY**.
       - **Constraint**: Only generate if there is a valid transition to a subsequent stage.

     7. **DATA ELEMENTS JSON ARRAY**:
       - **STRICTLY GENERATE A 'dataElements' ARRAY**: 
       - **label**: Field Label.
       - **type**: Field Type (text, select, etc).
       - **required**: boolean (true/false).
       - **visibility**: "Always", or logic like "If [Field] is 'Yes'".
       - **validation**: LIST ALL Regex or Business Rules here. (e.g. "^[0-9]+$").
       - **options**: LIST ALL Dropdown Options here as a CSV String. (e.g. "Name, Address, Other"). 
       
       **CRITICAL**: DO NOT MIX Validation and Options. They are separate fields now.
       - **Title**: "Submit [Stage Name]"
       - **Description**: "As a System/User, I want to submit the [Stage Name], So that the next assignment is created."
       - **Criteria Focus**: What happens on click of 'Submit'.
       - **Required Syntax**: 
         "**WHEN** I click 'Submit' on [Stage Name]
          **THEN** the system should validate all mandatory data
          **AND** a new assignment for [Next Stage] should be generated..."
       - **Skill Check**: Mention that access to the next assignment depends on the user having the required skills (if applicable).

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
            "description": "As a...",
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
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        console.log("[Gemini] Stories Raw Response:", response.text);

        const parsed = cleanAndParseJSON<any>(response.text);
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
            // The AI sometimes ignores negative constraints. We force the syntax here.
            // Replace "proceed to 'X'" or "skip stage" with "generate assignment 'X'"
            if (s.title.toLowerCase().startsWith('rule:') || s.title.toLowerCase().includes('logic')) {
                s.acceptanceCriteria = s.acceptanceCriteria
                    .replace(/proceed to ['"]?(.+?)['"]?(?=\W|$)/gi, "generate assignment '$1'")
                    .replace(/skip the stage/gi, "generate assignment 'Next Stage'") // Fallback generic
                    .replace(/proceed to the next stage/gi, "generate assignment 'Next Stage'");
            }

            return s as UserStory;
        });

    } catch (error: any) {
        console.error("Error generating User Stories:", error);
        throw new Error(error.message || "Unknown Error");
    }
};

export const generateTestCases = async (processDef: ProcessDefinition): Promise<TestCase[]> => {
    if (!apiKey) return [];
    const prompt = 'Act as a UK QA Lead... Generate Manual Test Cases...Process: ' + JSON.stringify(processDef);
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        return cleanAndParseJSON<TestCase[]>(response.text) || [];
    } catch (error) { console.error("Error generating Test Cases:", error); return []; }
};

export const analyzeTranscript = async (processDef: ProcessDefinition, transcriptText: string | null): Promise<WorkshopSuggestion[]> => {
    if (!apiKey) return [];
    const prompt = 'Analyze this transcript...Process: ' + JSON.stringify(processDef) + '...Transcript: ' + (transcriptText || 'Simulate...');
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        return cleanAndParseJSON<WorkshopSuggestion[]>(response.text) || [];
    } catch (e) { return []; }
};

export const generateDataMapping = async (elements: { id: string; label: string; type: string }[]): Promise<DataObjectSuggestion[]> => {
    if (!apiKey) return [];
    const prompt = 'Act as Pega System Architect...Fields: ' + JSON.stringify(elements);
    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
            });
        });
        return cleanAndParseJSON<DataObjectSuggestion[]>(response.text) || [];
    } catch (e) { return []; }
};
