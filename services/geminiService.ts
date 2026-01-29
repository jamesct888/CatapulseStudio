import { GoogleGenAI, Type } from "@google/genai";
import { ProcessDefinition, StageDefinition, SectionDefinition, ElementDefinition, FormState, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StrategyRecommendation, ChatMessage, DataObjectSuggestion, LogicGroup, DictionaryEntry } from "../types";

// Helper to check Runtime Config
export const getAiEnabled = (): boolean => {
    if (typeof window !== 'undefined' && window.CATAPULSE_APP_CONFIG) {
        return window.CATAPULSE_APP_CONFIG.aiEnabled;
    }
    // Default to TRUE if config is missing (Legacy behavior) OR force FALSE if desired for security default?
    // Plan says "Default to FALSE for security" in config.js, but here if config is missing?
    // Let's safe default to TRUE slightly for dev, but if the user wants strict security they will have the config file.
    // Actually, implementation plan says: "Ensure it fails safe if config is missing (assume Disabled)"
    return false;
};

// @ts-ignore
const apiKey = (typeof process !== 'undefined' && process.env?.VITE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || 'TEST_KEY';

// Initialize AI conditionally
const ai = new GoogleGenAI({ apiKey }); // We instantiate, but will gate calls.

console.log('[GeminiService] Initialized. AI Enabled:', getAiEnabled());

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

// --- Helper: Shared Generation Logic ---
const generateJSON = async <T>(
    prompt: string | any[],
    options: {
        maxTokens?: number;
        retries?: number;
        systemInstruction?: string;
        model?: string;
        logLabel?: string;
    } = {}
): Promise<T | null> => {
    const { maxTokens = 8192, retries = 2, systemInstruction, model = modelId, logLabel = "Generation" } = options;

    if (!getAiEnabled()) {
        console.warn(`[AI Service] 🔒 Security Block: AI is disabled in config.js.`);
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
        // Propagate Quota Errors for UI handling
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded') || e.message?.includes('billing')) {
            throw e;
        }
        console.warn(`[AI Service] ${logLabel} failed:`, e.message);
        return null;
    }
};

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
    
    IMPORTANT: For 'select', 'multiselect', or 'radio' types, you MUST include a 'options' array with 3-5 realistic values based on the process context (e.g., ["High", "Medium", "Low"] or ["Pension", "ISA", "GIA"]).
    
    JSON Structure:
    {
        "id": "proc_auto",
            "name": "Process Name",
                "description": "Summary",
                    "stages": [
                        {
                            "id": "stg_1", "title": "Stage 1",
                            "sections": [
                                { "id": "sec_1", "title": "Section 1", "layout": "2col", "elements": [{ "id": "el_1", "label": "Account Type", "type": "select", "options": ["Savings", "Checking"] }] }
                            ]
                        }
                    ]
    }
`;

    try {
        const data = await generateJSON<ProcessDefinition>(prompt, {
            retries: 1,
            logLabel: "Monolithic Generation"
        });

        if (data && data.stages && data.stages.length > 0) {
            return sanitizeProcessData(data);
        }
        return null;
    } catch (e: any) {
        // Rethrow quota errors
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded')) throw e;
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

    const skeleton = await generateJSON<ProcessDefinition>(skeletonPrompt, {
        maxTokens: 2048,
        systemInstruction: "You are a JSON generator. Output ONLY valid JSON. No conversational text.",
        logLabel: "Skeleton Generation"
    });

    if (!skeleton) return null;

    // Initialize sections array for safety
    if (skeleton.stages) {
        skeleton.stages.forEach(s => s.sections = []);
    }
    return skeleton;
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
        5. **OPTIONS**: For 'select', 'radio', or 'multiselect', providing an 'options' array is MANDATORY. Populate it with 3-5 realistic business values.
        
        OUTPUT FORMAT:
        Return a JSON Object where Keys are the 'id' of the Stage, and Values are arrays of SectionDefinition.
        
        Example Output:
        {
            "stg_1": [{ "id": "sec_1", "title": "Personal Details", "elements": [...] }],
                "stg_2": [... ]
        }
`;

    try {
        const stageMap = await generateJSON<Record<string, SectionDefinition[]>>(prompt);
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
        if (e.message?.includes('quota') || e.message?.includes('limit exceeded') || e.message?.includes('billing')) {
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
        5. For 'select'/'radio' fields: You MUST include an 'options' array with realistic values (e.g. options: ["Yes", "No"] or ["Email", "Post"]).
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
        const sections = await generateJSON<SectionDefinition[]>(detailPrompt);

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
        const data = await generateJSON<ProcessDefinition>([{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }]);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Vision API Error:", error); return null; }
}

export const importLegacyContent = async (textContext: string): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;
    const prompt = `Act as a Migration Architect.Convert this legacy schema / text into a Catapulse Process Definition.LEGACY CONTENT: ${textContext} `;
    try {
        const data = await generateJSON<ProcessDefinition>(prompt);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Legacy Import Error:", error); return null; }
}


export interface ChangePlan {
    planDescription: string;
    technicalImpact: string[];
}

export const analyzeChangeRequest = async (currentProcess: ProcessDefinition, instruction: string, context: { selectedStageId: string, selectedSectionId: string | null }, history: string[] = []): Promise<ChangePlan | null> => {
    if (!apiKey) return null;
    const prompt = `
    ACT AS: An expert UK Business Analyst and Systems Architect.

    GOAL: Analyze the user's request to modify the business process. Do NOT generate the code yet. 
    Instead, produce a NATURAL LANGUAGE PLAN of what you will change.

    INPUT CONTEXT:
    - User Instruction: "${instruction}"
    - Previous Refinement History: ${JSON.stringify(history)}
    - Current Stage ID: "${context.selectedStageId}"
    - Current Section ID: "${context.selectedSectionId || 'none'}"
    - Current Process Definition (Snippet): 
    ${JSON.stringify({
        ...currentProcess,
        stages: currentProcess.stages.map(s => ({
            id: s.id,
            title: s.title,
            sections: s.sections.map(sec => ({ id: sec.id, title: sec.title, elementCount: sec.elements.length }))
        }))
    })}

    REQUIREMENTS:
    1. **Plan Description**: A clear, concise summary of the changes you will make. Use "I will..." statements.
       - Example: "I will add a 'Spouse' field that is only visible when 'Marital Status' is 'Married'."
    2. **Technical Impact**: A list of specific structural changes.
       - Example: ["Add Element 'el_spouse' (text)", "Add Visibility Rule: Show 'el_spouse' if 'el_marital_status' == 'Married'", "Add Validation Rule: 'el_dob' must be past date"]

    OUTPUT:
    Return ONLY a valid JSON object matching this interface:
    {
        "planDescription": "string",
        "technicalImpact": ["string", "string"]
    }
    `;

    try {
        return await generateJSON<ChangePlan>(prompt, { logLabel: "Change Analysis" });
    } catch (error) { console.error("Error analyzing change:", error); return null; }
};

export const modifyProcess = async (currentProcess: ProcessDefinition, instruction: string, context: { selectedStageId: string, selectedSectionId: string | null }, history: string[] = []): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;
    const prompt = `
    ACT AS: An expert UK Business Analyst and Systems Architect.

    GOAL: Modify the existing business process JSON based strictly on the user's INSTRUCTION and REFINEMENT HISTORY.

    INPUT CONTEXT:
    - User Instruction (Original): "${instruction}"
    - Refinement Context: ${JSON.stringify(history)}
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
    3. ** Options **: If adding a 'select' or 'radio' field, ALWAYS generate an 'options' array with relevant choices.
    4. ** Structure Integrity **: Do NOT delete existing fields unless explicitly asked.APPEND new fields to the selected section(or the first section of the selected stage if no section is selected).
    5. ** Visibility / Logic **: If user asks "Show X only if Y is Z":
       - FIND the 'elementId' of field 'Y' in the provided JSON.
       - ADD a 'visibility' object to element X:
       - { "id": "grp_...", "operator": "AND", "conditions": [ { "targetElementId": "id_of_Y", "operator": "equals", "value": "Z" } ] }
       - Valid Operators: 'equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'.
    6. ** Validation **: If user asks for specific checks (e.g. "Must be a future date"):
       - ADD a 'validation' object to the element.
       - { "type": "date_future" } (or 'email', 'phone_uk', 'nino_uk', 'date_past').
    7. ** JSON Only **: Return ONLY the full, valid, modified ProcessDefinition JSON.No markdown, no chat.

    Execute the instruction now.
    `;
    try {
        const data = await generateJSON<ProcessDefinition>(prompt);
        return data ? sanitizeProcessData(data) : null;
    } catch (error) { console.error("Error modifying process:", error); return null; }
};

export const generateFormData = async (processDef: ProcessDefinition, personaDescription: string): Promise<FormState | null> => {
    if (!apiKey) return null;
    const fields = processDef.stages.flatMap(s => s.sections.flatMap(sec => sec.elements.map(el => ({ id: el.id, label: el.label, type: el.type, options: el.options, columns: el.columns }))));
    const prompt = 'Act as a testing data generator...Fields: ' + JSON.stringify(fields) + '...Persona: "' + personaDescription + '"...';
    try {
        return await generateJSON<FormState>(prompt);
    } catch (e) { console.error("Error generating form data", e); return null; }
}

export const consultStrategyAdvisor = async (processDef: ProcessDefinition, chatHistory: ChatMessage[], userMessage: string): Promise<{ reply: string, recommendations: StrategyRecommendation[] }> => {
    if (!getAiEnabled()) {
        return { reply: "AI Advisor is offline.", recommendations: [] };
    }
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
        const data = await generateJSON<{ reply: string, recommendations: StrategyRecommendation[] }>(prompt);
        return data || { reply: "I couldn't analyze that.", recommendations: [] };
    } catch (e) { console.error("Error consulting strategy advisor:", e); return { reply: "Error.", recommendations: [] }; }
};



export const generateTestCases = async (processDef: ProcessDefinition): Promise<TestCase[]> => {
    if (!apiKey) return [];
    const prompt = 'Act as a UK QA Lead... Generate Manual Test Cases...Process: ' + JSON.stringify(processDef);
    try {
        return await generateJSON<TestCase[]>(prompt) || [];
    } catch (error) { console.error("Error generating Test Cases:", error); return []; }
};

export const analyzeTranscript = async (processDef: ProcessDefinition, transcriptText: string | null): Promise<WorkshopSuggestion[]> => {
    if (!apiKey) return [];

    const prompt = `
    ACT AS: A Senior Business Analyst conducting a workshop review.
    GOAL: Compare the CURRENT PROCESS DEFINITION against the provided WORKSHOP TRANSCRIPT. Identify discrepancies, missing fields, or logic changes requested by the SMEs.

    CURRENT PROCESS:
    ${JSON.stringify(processDef)}

    TRANSCRIPT:
    "${transcriptText || 'Simulate a workshop where stakeholders suggest adding a "Date of Birth" field and removing "Middle Name".'}"

    OUTPUT SCHEMA:
    Return a JSON Array of objects matching this interface:
    interface WorkshopSuggestion {
        id: string; // Generate a unique string ID
        type: 'add' | 'remove' | 'modify';
        description: string; // Short summary of the change
        reasoning: string; // Quote or reason from transcript
        targetLabel?: string; // Label of the field to remove/modify (Exact match if possible)
        newElement?: { // Only for 'add' type
            label: string;
            type: 'text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'currency';
            sectionTitle?: string; // Which section to add it to
        };
        updateData?: { // Only for 'modify' type
             required?: boolean;
             label?: string;
             visibility?: { // Simple Logic Group
                id: string;
                operator: 'AND' | 'OR';
                conditions: Array<{
                    targetElementId: string; // The ID of the field that controls this (e.g. 'maritalStatus')
                    operator: 'equals' | 'notEquals' | 'contains' | 'doesNotContain' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
                    value: string;
                }>;
             };
        };
    }

    RULES:
    1. EXTRACT clear action items from the conversation.
    2. IGNORE general chatter. Focus on data requirements.
    3. If they say "Add X", usage type 'add'.
    4. If they say "We don't need Y", usage type 'remove'.
    5. If they say "Make Z mandatory", usage type 'modify' with updateData: { required: true }.
    6. IF LOGIC/KEYING REQUESTED (e.g., "Only show Spouse Name if Marital Status is Married"):
       - FIND the 'elementId' of the controlling field (e.g., "maritalStatus") from the provided JSON.
       - Construct a 'visibility' object with that ID.
       - Example: updateData: { visibility: { id: "log_1", operator: "AND", conditions: [{ targetElementId: "maritalStatus", operator: "equals", value: "Married" }] } }
    7. USE 'isNotEmpty' or 'isEmpty' for "is populated" / "has value" checks.
       - Example: "Show NI Number if Title is selected" -> operator: "isNotEmpty", targetElementId: "title".
    `;

    try {
        return await generateJSON<WorkshopSuggestion[]>(prompt) || [];
    } catch (e) { return []; }
};

export const generateDataMapping = async (elements: { id: string; label: string; type: string }[], baseClass?: string, dictionary: DictionaryEntry[] = []): Promise<DataObjectSuggestion[]> => {
    if (!apiKey) return [];

    // Optimize Dictionary Context: If dictionary is huge, we might need to filter or RAG it. 
    // For now, we assume it's reasonable size (< 500 fields) or we take top relevance.
    // To be safe, let's limit the dictionary string size if needed, but for MVP pass it all.
    const dictionaryContext = dictionary.length > 0
        ? `EXISTING DATA DICTIONARY (Prioritize these matches):
           ${JSON.stringify(dictionary.map(d => ({ class: d.className, prop: d.property, label: d.label || d.property })))}`
        : "No existing data dictionary provided.";

    const prompt = `
    ACT AS: A Senior Pega System Architect.
    GOAL: Group the provided fields into logical Pega Data Classes (Data Objects).
    CONTEXT: The Base Class for this application is: "${baseClass || 'Org-App-Work'}".

    INPUT FIELDS:
    ${JSON.stringify(elements)}

    ${dictionaryContext}

    OUTPUT REQUIREMENT:
    Return a JSON Array of objects with this structure AND NOTHING ELSE:
    [
        {
            "className": "${baseClass ? baseClass + '-Data-Customer' : 'Customer'}", 
            "description": "Customer personal details",
            "mappings": [
                { 
                    "elementId": "field_id_input", 
                    "suggestedProperty": "FirstName",
                    "source": "dictionary" (if matched) OR "ai" (if new),
                    "dictionaryMatch": { "className": "...", "property": "...", "type": "..." } (ONLY if matched)
                }
            ]
        }
    ]
    
    STRATEGIC GUIDELINES:
    1. **GROUPING IS CRITICAL**: Do NOT just list all fields in one class. Analyze the field labels to group them by business entity.
    2. **PRIORITIZE DICTIONARY**: If an input field label is semantically similar to a Dictionary Entry, USE THAT ENTRY. 
       - Set source: "dictionary".
       - Use the EXACT className and property from the dictionary.
    3. **FALLBACK to AI**: If no dictionary match found:
       - Set source: "ai".
       - Generate a COMPLIANT class name (Prefix with Base Class).
       - Generate a COMPLIANT property name (CamelCase).
    4. **Completeness**: Ensure EVERY input field is mapped to exactly one class.
    `;

    try {
        return await generateJSON<DataObjectSuggestion[]>(prompt) || [];
    } catch (e) {
        console.error("Error generating Data Mapping:", e);
        return [];
    }
};
