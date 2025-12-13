
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessDefinition, StageDefinition, SectionDefinition, ElementDefinition, FormState, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StrategyRecommendation, ChatMessage, DataObjectSuggestion } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-2.5-flash";

// --- Resilience / Retry Logic ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || '';
    
    // 1. FAIL FAST: Check for Hard Quota Limits (Daily Limit)
    // If we hit the daily quota, retrying in 10 seconds won't help. We should fail immediately.
    if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('billing')) {
        console.error(`[AI Service] 🛑 HARD QUOTA LIMIT REACHED: ${error.message}`);
        throw error; 
    }

    // 2. RETRY: Transient Rate Limits (429 Resource Exhausted / Too Many Requests)
    const isTransient = msg.includes('429') || error.status === 429 || msg.includes('resource_exhausted') || msg.includes('overloaded');
    
    if (retries > 0 && isTransient) {
      // Wait longer for rate limits (10s), shorter for other transient errors
      const waitTime = Math.max(delay, 5000);
      
      console.warn(`[AI Service] ⚠️ Transient API Error (429/Overloaded), retrying in ${waitTime}ms... (${retries} attempts left).`);
      
      await new Promise(res => setTimeout(res, waitTime));
      // Exponential backoff
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
    
    // 0. Fast Path: Try parsing directly
    try {
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // Continue to extraction
    }
    
    // 1. Stack-Based Extraction (Best Effort)
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
    
    // Fallback: Simple regex extraction if stack failed (sometimes better for fragmented output)
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
    } catch (e) {
        // Last resort: JS Eval for loose JSON (comments/trailing commas)
        try {
            // More robust comment stripping that respects strings
            // regex: matches strings OR single line comments OR multi-line comments
            const noComments = jsonCandidate.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g1) => g1 ? "" : m).trim();
            
            // Prevent empty eval which causes "Unexpected token"
            if (!noComments) return null;

            const looseParse = new Function('return (' + noComments + ')');
            return looseParse() as T;
        } catch (e2) {
            // console.error("JSON Parse Failed:", e2); // Silence error to prevent console noise
            return null;
        }
    }
}

export const sanitizeProcessData = (data: ProcessDefinition): ProcessDefinition => {
    if (!data.stages || !Array.isArray(data.stages)) data.stages = [];
    for (const stage of data.stages) {
        if (!stage.sections || !Array.isArray(stage.sections)) stage.sections = [];
        for (const section of stage.sections) {
            if (!section.elements || !Array.isArray(section.elements)) section.elements = [];
            if (!section.layout) section.layout = '1col';
            for (const el of section.elements) {
                if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
                // Fix options
                if (el.options && Array.isArray(el.options)) {
                    el.options = el.options.map((opt: any) => {
                         if (typeof opt === 'object' && opt !== null) return opt.label || opt.value || opt.text || JSON.stringify(opt);
                         return String(opt);
                    });
                }
                
                // Compatibility for old "visibilityConditions" array
                const anyEl = el as any;
                if (anyEl.visibilityConditions && Array.isArray(anyEl.visibilityConditions) && !el.visibility) {
                    el.visibility = { id: `vis_${el.id}`, operator: 'AND', conditions: anyEl.visibilityConditions };
                }
                if (anyEl.requiredConditions && Array.isArray(anyEl.requiredConditions) && !el.requiredLogic) {
                    el.requiredLogic = { id: `req_${el.id}`, operator: 'AND', conditions: anyEl.requiredConditions };
                }
            }
        }
    }
    return data;
}

// --- PHASE 1: GENERATE SKELETON (Stages Only) ---
export const generateProcessSkeleton = async (description: string): Promise<ProcessDefinition | null> => {
  console.log(`[AI Service] 🚀 Generating Skeleton for: "${description}"`);
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
    // Increase retries to 5 for skeleton generation to handle cold start rate limits
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
    }, 5, 4000); // Start with 4s delay, retries=5

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
           - Add 'visibility' logic to fields (e.g., "If Marital Status = Married, show Spouse Name").
           - Logic Schema: "visibility": { "id": "vis_${stage.id}_1", "operator": "AND", "conditions": [ { "targetElementId": "...", "operator": "equals", "value": "..." } ] }
        4. Types: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'radio', 'checkbox', 'static', 'repeater'.
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
        return sections || [];
    } catch (e) {
        console.error(`Error generating details for stage ${stage.title}:`, e);
        // Return fallback section on error so the UI doesn't hang
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

// Deprecated wrapper kept for backward compatibility if needed
export const generateProcessStructure = async (description: string): Promise<ProcessDefinition | null> => {
    console.log("[AI Service] Falling back to legacy monolithic generation...");
    const skeleton = await generateProcessSkeleton(description);
    if (!skeleton) return null;

    const detailPromises = skeleton.stages.map(stage => generateStageDetails(stage, skeleton.description));
    const allSections = await Promise.all(detailPromises);

    skeleton.stages.forEach((stage, index) => {
        stage.sections = allSections[index];
    });

    return sanitizeProcessData(skeleton);
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
