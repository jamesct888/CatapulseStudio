
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessDefinition, StageDefinition, SectionDefinition, ElementDefinition, FormState, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StrategyRecommendation, ChatMessage, DataObjectSuggestion, LogicGroup } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-2.5-flash";

// --- Resilience / Retry Logic ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || '';
    
    // 1. FAIL FAST: Check for Hard Quota Limits (Daily Limit/Billing)
    if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('billing')) {
        console.error(`[AI Service] 🛑 HARD QUOTA LIMIT REACHED: ${error.message}`);
        throw error; 
    }

    // Check if it is a transient rate limit error
    const isRateLimit = error.status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('overloaded');

    // 2. RETRY: Transient Rate Limits
    if (retries > 0 && isRateLimit) {
      const waitTime = Math.max(delay, 10000);
      console.warn(`[AI Service] ⚠️ Transient API Error (429/Overloaded), retrying in ${waitTime}ms... (${retries} attempts left). Error: ${msg}`);
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
                if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
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
                    el.visibility = { id: `vis_${el.id}`, operator: 'AND', conditions: anyEl.visibilityConditions };
                }
                if (anyEl.requiredConditions && Array.isArray(anyEl.requiredConditions) && !el.requiredLogic) {
                    el.requiredLogic = { id: `req_${el.id}`, operator: 'AND', conditions: anyEl.requiredConditions };
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
    1. Define Stages (e.g. Intake, Review, Decision).
    2. Define Sections within stages.
    3. Define Data Elements (Fields) within sections.
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
             { "id": "sec_1", "title": "Section 1", "layout": "2col", "elements": [ { "id": "el_1", "label": "Name", "type": "text" } ] }
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
    Create a high-level business process SKELETON for: "${description}".
    
    CONTEXT:
    - Target Market: United Kingdom (UK).
    - Language: British English (en-GB).
    
    Requirements:
    1. Define specific Stages needed for this process (e.g., Intake, Validation, Decision).
    2. Do NOT generate Sections or Elements yet. Just the Stages with IDs, Titles, and Descriptions.
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
        I have a process skeleton. Generate detailed SECTIONS and DATA FIELDS for ALL the following stages.

        SKELETON STAGES:
        ${JSON.stringify(skeleton.stages.map(s => ({ id: s.id, title: s.title, description: s.description })))}

        CONTEXT: ${skeleton.description}

        REQUIREMENTS:
        1. For EACH stage ID provided, generate a list of Sections.
        2. Each Section must have 3-6 Data Elements (Fields).
        3. Include 'visibility' logic where appropriate.
        4. STRICTLY USE ONLY THESE FIELD TYPES: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'multiselect', 'radio', 'checkbox', 'static', 'repeater', 'calculated'.
        
        OUTPUT FORMAT:
        Return a JSON Object where Keys are the 'id' of the Stage, and Values are arrays of SectionDefinition.
        
        Example Output:
        {
           "stg_1": [ { "id": "sec_1", "title": "Personal Details", "elements": [...] } ],
           "stg_2": [ ... ]
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
        console.error(`Error generating batch details:`, e);
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
        1. Define 1-3 Sections.
        2. Each Section must have 3-6 specific Data Elements (Fields).
        3. INCLUDE LOGIC:
           - Add 'visibility' logic to fields.
        4. Types: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'radio', 'checkbox', 'static', 'repeater', 'calculated'.
        5. IDs: Use unique IDs (e.g., 'sec_${stage.id}_1', 'el_${stage.id}_dob').

        Return ONLY a JSON Array of SectionDefinition objects:
        [
            {
              "id": "sec_${stage.id}_1",
              "title": "Section Name",
              "layout": "2col",
              "elements": [ ... ] 
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
        console.error(`Error generating details for stage ${stage.title}:`, e);
        return [{
            id: `sec_err_${stage.id}`,
            title: "Details Generation Failed",
            layout: "1col",
            variant: "warning",
            elements: [{
                id: `el_err_${stage.id}`,
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
    const prompt = `Act as an expert UK Business Analyst. Analyze this document...`;
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
    const prompt = `Act as a Migration Architect. Convert this legacy schema/text into a Catapulse Process Definition. LEGACY CONTENT: ${textContext}`;
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
  const prompt = `You are an intelligent UK Business Analyst Assistant... Current Process JSON: ${JSON.stringify(currentProcess)}... Instruction: "${instruction}"...`;
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
    const prompt = `Act as a testing data generator... Fields: ${JSON.stringify(fields)}... Persona: "${personaDescription}"...`;
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
    const prompt = `Act as a Senior Agile Coach... PROCESS: ${JSON.stringify(processDef)}... HISTORY: ... USER: ${userMessage}`;
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
  const prompt = `Act as a UK Business Analyst... Generate User Stories... Strategy: ${strategy}... Process: ${JSON.stringify(processDef)}`;
  try {
    const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: { responseMimeType: "application/json", maxOutputTokens: 8192 }
        });
    });
    return cleanAndParseJSON<UserStory[]>(response.text) || [];
  } catch (error) { console.error("Error generating User Stories:", error); return []; }
};

export const generateTestCases = async (processDef: ProcessDefinition): Promise<TestCase[]> => {
  if (!apiKey) return [];
  const prompt = `Act as a UK QA Lead... Generate Manual Test Cases... Process: ${JSON.stringify(processDef)}`;
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
    const prompt = `Analyze this transcript... Process: ${JSON.stringify(processDef)}... Transcript: ${transcriptText || 'Simulate...'}`;
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
    const prompt = `Act as Pega System Architect... Fields: ${JSON.stringify(elements)}`;
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
}
