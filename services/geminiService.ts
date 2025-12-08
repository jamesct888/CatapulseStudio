
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessDefinition, StageDefinition, ElementDefinition, FormState, WorkshopSuggestion, TestCase, UserStory, StoryStrategy, StrategyRecommendation, ChatMessage, DataObjectSuggestion } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-2.5-flash";

// --- Resilience / Retry Logic ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`API Call failed, retrying... (${retries} attempts left). Error: ${error.message}`);
      await new Promise(res => setTimeout(res, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
    } else {
      throw error;
    }
  }
};

// Helper to ensure the process structure is valid (arrays initialized)
export const sanitizeProcessData = (data: ProcessDefinition): ProcessDefinition => {
    if (!data.stages || !Array.isArray(data.stages)) data.stages = [];
    
    for (const stage of data.stages) {
        if (!stage.sections || !Array.isArray(stage.sections)) stage.sections = [];
        for (const section of stage.sections) {
            if (!section.elements || !Array.isArray(section.elements)) section.elements = [];
            if (!section.layout) section.layout = '1col';
            for (const el of section.elements) {
                if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
                
                // Fix: Handle legacy properties if AI generated them (cast to any to access missing props)
                const anyEl = el as any;
                if (anyEl.visibilityConditions && Array.isArray(anyEl.visibilityConditions) && anyEl.visibilityConditions.length > 0 && !el.visibility) {
                    el.visibility = {
                        id: `vis_${el.id}`,
                        operator: 'AND',
                        conditions: anyEl.visibilityConditions
                    };
                    delete anyEl.visibilityConditions;
                }
                
                if (anyEl.requiredConditions && Array.isArray(anyEl.requiredConditions) && anyEl.requiredConditions.length > 0 && !el.requiredLogic) {
                    el.requiredLogic = {
                        id: `req_${el.id}`,
                        operator: 'AND',
                        conditions: anyEl.requiredConditions
                    };
                    delete anyEl.requiredConditions;
                }
                
                // Fix options if they are objects (flatten to string)
                if (el.options && Array.isArray(el.options)) {
                    el.options = el.options.map((opt: any) => {
                         if (typeof opt === 'object' && opt !== null) {
                             return opt.label || opt.value || opt.text || JSON.stringify(opt);
                         }
                         return String(opt);
                    });
                }
            }
        }
    }
    return data;
}

export const generateProcessStructure = async (description: string): Promise<ProcessDefinition | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  const prompt = `
    Act as an expert UK Business Analyst and Pega Architect. 
    Create a comprehensive, PRODUCTION-READY business process definition for: "${description}".
    
    CONTEXT:
    - Target Market: United Kingdom (UK).
    - Language: British English (en-GB) spelling (e.g. 'Authorise', 'Programme', 'Licence').
    - Currency: GBP (£).
    - Regulations: Consider UK frameworks (GDPR, FCA, HMRC, DWP) where relevant.
    - Terminology: Use 'Postcode' (not Zip), 'Surname' (not Last Name), 'National Insurance' (not SSN), 'Sort Code'.

    The output must be a deep JSON object containing Stages, Sections, and SPECIFIC DATA FIELDS with LOGIC.
    
    Requirements:
    1. Define 3-5 Stages (e.g., Capture, Validate, Decision).
    2. Each Stage must have 1-3 Sections.
    3. Each Section must have 3-6 specific Data Elements (Fields).
    4. INCLUDE LOGIC:
       - Add 'visibility' logic to some fields (e.g., Only show "Spouse Name" if "Marital Status" equals "Married").
       - Logic Schema: "visibility": { "id": "vis_1", "operator": "AND", "conditions": [ { "targetElementId": "...", "operator": "equals", "value": "..." } ] }
       - Add 'requiredLogic' to some fields if needed using same schema.
    5. Types allowed: 'text', 'email', 'textarea', 'number', 'date', 'currency', 'select', 'radio', 'checkbox', 'static'.
    6. For 'select'/'radio', provide realistic options in the 'options' array.
    
    Structure required:
    {
      "id": "proc_auto",
      "name": "derived from description",
      "description": "Executive summary of process",
      "stages": [
        {
          "id": "stg_1",
          "title": "Stage Name",
          "sections": [
            {
              "id": "sec_1",
              "title": "Section Name",
              "layout": "2col",
              "elements": [
                 {
                    "id": "el_1",
                    "label": "Field Label",
                    "type": "text",
                    "required": true,
                    "visibility": null
                 }
              ] 
            }
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
                systemInstruction: "You are a JSON generator. Output only valid JSON. Do not use Markdown code blocks.",
            }
        });
    });

    const text = response.text;
    if (!text) return null;
    let data: ProcessDefinition;
    try {
        data = JSON.parse(text) as ProcessDefinition;
    } catch (e) {
        console.error("Failed to parse AI response", e);
        return null;
    }
    
    return sanitizeProcessData(data);
  } catch (error) {
    console.error("Error generating process:", error);
    return null;
  }
};

export const generateProcessFromImage = async (base64Data: string, mimeType: string): Promise<ProcessDefinition | null> => {
    if (!apiKey) return null;

    const prompt = `
        Act as an expert UK Business Analyst.
        Analyze this document (image or PDF) of a legacy form.
        Digitize it into a structured JSON Process Definition.
        
        CONTEXT:
        - Assume the document is from a UK context unless clearly otherwise.
        - Infer UK specific fields (Sort Code, Postcode, National Insurance).
        - Use British English spelling for labels.

        Structure required:
        {
            "id": "proc_digitized",
            "name": "Digitized Form Process",
            "description": "Imported from legacy document",
            "stages": [
                {
                    "id": "stg_1",
                    "title": "Main Form",
                    "sections": [
                        {
                            "id": "sec_1",
                            "title": "Section Name",
                            "layout": "2col",
                            "elements": [ ... ]
                        }
                    ]
                }
            ]
        }

        Rules:
        1. Infer field types (text, date, number, checkbox, radio, select).
        2. For radio/select, infer options from the document context.
        3. Break long forms into logical Sections based on visual headers.
        4. If the form is complex, split it into 2-3 logical Stages.
        5. Return ONLY valid JSON.
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });
        });

        const text = response.text;
        if (!text) return null;
        let data: ProcessDefinition;
        try {
            data = JSON.parse(text) as ProcessDefinition;
        } catch (e) {
            console.error("Failed to parse AI response", e);
            return null;
        }
        
        return sanitizeProcessData(data);
    } catch (error) {
        console.error("Vision API Error:", error);
        return null;
    }
}

export const modifyProcess = async (
  currentProcess: ProcessDefinition, 
  instruction: string, 
  context: { selectedStageId: string, selectedSectionId: string | null }
): Promise<ProcessDefinition | null> => {
  if (!apiKey) return null;

  const prompt = `
    You are an intelligent UK Business Analyst Assistant (Copilot).
    Your task is to MODIFIY the provided JSON Process Definition based on the user's conversational request.

    Current Process JSON:
    ${JSON.stringify(currentProcess)}

    User Context:
    - Currently Selected Stage ID: "${context.selectedStageId}"
    - Currently Selected Section ID: "${context.selectedSectionId || 'None'}"

    User Instruction:
    "${instruction}"

    Rules for Modification:
    1. CRUD: You can Add, Remove, or Update Stages, Sections, or Elements.
    2. Context: UK Business Environment. Use British English spelling. 
    3. Logic/Conditions: 
       - The user may ask for logic, e.g., "Only show Employer Name when Smoker is Yes".
       - You MUST find the 'Employer Name' element (target) and the 'Smoker' element (source) by fuzzy matching their labels in the JSON.
       - Add a 'visibility' object to the target element.
       - Schema for Condition: { targetElementId: string, operator: 'equals'|'notEquals'|'contains'|'greaterThan'|'lessThan'|'isEmpty'|'isNotEmpty', value: any }
       - Schema for LogicGroup: { id: string, operator: 'AND'|'OR', conditions: Condition[] }
       - "Populated" means operator 'isNotEmpty'.
       - "Empty" means operator 'isEmpty'.
    4. Preservation: Do NOT change IDs of existing elements unless explicitly asked to regenerate them. Keep the structure intact.
    5. Identifiers: Generate clean camelCase IDs for any NEW elements.

    Return ONLY the full valid updated JSON.
  `;

  try {
    const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                systemInstruction: "You are a JSON modifier. You receive a JSON and an instruction, and you return the modified JSON. You strictly adhere to the existing schema.",
            }
        });
    });

    const text = response.text;
    if (!text) return null;
    let data: ProcessDefinition;
    try {
        data = JSON.parse(text) as ProcessDefinition;
    } catch (e) {
        console.error("Failed to parse AI response", e);
        return null;
    }

    return sanitizeProcessData(data);
  } catch (error) {
    console.error("Error modifying process:", error);
    return null;
  }
};

export const generateFormData = async (
    processDef: ProcessDefinition, 
    personaDescription: string
): Promise<FormState | null> => {
    if (!apiKey) return null;

    const fields = processDef.stages.flatMap(s => 
        s.sections.flatMap(sec => 
            sec.elements.map(el => ({ id: el.id, label: el.label, type: el.type, options: el.options }))
        )
    );

    const prompt = `
        Act as a testing data generator for a UK System.
        I have a form with the following fields: ${JSON.stringify(fields)}.
        
        User Scenario / Persona: "${personaDescription}".
        
        Generate a JSON object where keys are the field IDs and values are realistic data matching the persona and field type.
        
        CONTEXT:
        - Addresses: Use realistic UK addresses and Postcodes (e.g., SW1A 1AA).
        - Phones: Use UK formats (+44 7... or 07...).
        - Currency: Use GBP values.
        - Names: Common UK names.

        For select/radio fields, choose one of the provided options.
        For checkboxes, use boolean true/false.
        
        Return ONLY the JSON object.
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text) as FormState;
    } catch (e) {
        console.error("Error generating form data", e);
        return null;
    }
}

export const consultStrategyAdvisor = async (
    processDef: ProcessDefinition, 
    chatHistory: ChatMessage[],
    userMessage: string
): Promise<{ reply: string, recommendations: StrategyRecommendation[] }> => {
    if (!apiKey) return { reply: "AI Service Unavailable", recommendations: [] };

    const prompt = `
        Act as a Senior Agile Coach and Business Analyst.
        You are discussing User Story Splitting strategies for a specific process with a Customer Journey Manager (CJM).

        PROCESS DEFINITION:
        ${JSON.stringify(processDef)}

        CHAT HISTORY:
        ${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
        USER: ${userMessage}

        Your Goal:
        1. Answer the user's question or provide advice on how to split user stories.
        2. Be aware of SPECIFIC fields/logic in the process. Example: If there is a field "Liability Admitted" (Yes/No), suggest splitting stories by that outcome.
        3. You can suggest "Hybrid" strategies or custom strategies tailored to this process.
        
        Output Schema (JSON):
        {
            "reply": "Your conversational response here...",
            "recommendations": [
                {
                    "id": "rec_1",
                    "strategyName": "Split by [Specific Aspect]",
                    "strategyDescription": "Detailed instruction for the generator on how to split stories based on this aspect.",
                    "pros": ["Pro 1"],
                    "cons": ["Con 1"],
                    "estimatedCount": 5,
                    "recommendationLevel": "High"
                }
            ]
        }

        If the user is just asking a question and no NEW strategy is needed, return empty recommendations array.
        If the user asks for suggestions, provide 2-3 specific ones.
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
        });

        const text = response.text;
        if (!text) return { reply: "I couldn't analyze that.", recommendations: [] };
        return JSON.parse(text);
    } catch (e) {
        console.error("Error consulting strategy advisor:", e);
        return { reply: "Sorry, I encountered an error analyzing your request.", recommendations: [] };
    }
};

export const generateUserStories = async (processDef: ProcessDefinition, strategy: StoryStrategy): Promise<UserStory[]> => {
  if (!apiKey) return [];

  let strategyInstruction = "";
  if (strategy === 'screen') strategyInstruction = "Split the stories by UI Component/Screen (one story per Section/Stage).";
  else if (strategy === 'journey') strategyInstruction = "Split the stories by End-to-End Business Journey (e.g. 'Happy Path', 'Exception Path').";
  else if (strategy === 'persona') strategyInstruction = "Split the stories by Persona (e.g. 'As a Case Worker', 'As a Manager').";
  else strategyInstruction = strategy; // Custom strategy string from AI

  const prompt = `
    Act as a UK Business Analyst and Pega Product Owner.
    Based on the provided Process Definition, generate a set of detailed User Stories.
    
    STRATEGY INSTRUCTION: ${strategyInstruction}
    CONTEXT: UK Business Context.
    
    Format Requirements:
    1. Title: Clear, concise title.
    2. Narrative: Standard "As a... I want... So that..." format.
    3. Acceptance Criteria (AC): 
       - MUST use GWT (Given/When/Then) format.
       - STRICT RULE: 'When' clauses MUST describe a user ACTION (e.g., 'When I select...', 'When I click...', 'When I type...'). 
       - Do NOT use 'When' for states (e.g., DO NOT say 'When the user is a policyholder'). Put states in the 'Given' clause.
       - The 'Given' clause must generally be: "Given I am a colleague working on a ${processDef.name} case And I am on the {Screen Name}..."
       - The 'Then' clause must use a list format for fields. Example:
         "Then make the following fields available:
          * **[Field Label A]**
          * **[Field Label B]**"
       - CRITICAL: After the GWT block, you MUST include a Markdown Table describing the data elements for that story.
       - Table Columns: Label, Type, Mandatory, Visibility Logic, Options/Validation.
    4. Dependencies: Identify dependencies. If Story B relies on Story A being done first, add Story A's ID to Story B's dependency list.

    Process Definition:
    ${JSON.stringify(processDef)}

    Output as a JSON Array of UserStory objects.
    Schema:
    [
      {
        "id": "US-001",
        "title": "Capture Personal Details",
        "narrative": "As a Call Center Agent...",
        "acceptanceCriteria": "Given I am... \n\nThen make the following fields available:\n* **[First Name]**\n* **[Surname]**\n\n### Data Dictionary\n| Label | Type | Mandatory | ... |",
        "dependencies": [] 
      },
      {
        "id": "US-002",
        "title": "Review Personal Details",
        "narrative": "...",
        "acceptanceCriteria": "...",
        "dependencies": ["US-001"]
      }
    ]
  `;

  try {
    const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                systemInstruction: "You are a User Story generator. Generate valid JSON array.",
            }
        });
    });
    
    const text = response.text;
    if (!text) return [];
    try {
        return JSON.parse(text) as UserStory[];
    } catch (e) {
        console.error("Failed to parse User Stories", e);
        return [];
    }
  } catch (error) {
    console.error("Error generating User Stories:", error);
    return [];
  }
};

export const generateTestCases = async (processDef: ProcessDefinition): Promise<TestCase[]> => {
  if (!apiKey) return [];

  const prompt = `
    Act as a UK QA Lead.
    Based on the provided Process Definition JSON, generate a set of detailed Manual Test Cases.
    Use British English spelling.

    Process Definition:
    ${JSON.stringify(processDef)}

    Requirements:
    1. Generate 5-8 distinct test cases.
    2. Include at least one "Positive" (Happy Path) case.
    3. Include "Negative" cases (Validation errors, missing mandatory fields).
    4. Include "Boundary" or "Logic" cases (Checking if logic rules fire correctly).
    
    Output Schema (JSON Array):
    [
      {
        "id": "TC-001",
        "title": "Verify Successful Submission with Standard Data",
        "description": "Ensure a user can complete the process with valid data inputs.",
        "preConditions": "User is logged in and on the start screen.",
        "steps": ["Step 1...", "Step 2..."],
        "expectedResult": "Form submits successfully.",
        "priority": "High",
        "type": "Positive"
      }
    ]
  `;

  try {
    const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
    });

    const text = response.text;
    if (!text) return [];
    try {
        return JSON.parse(text) as TestCase[];
    } catch (e) {
        console.error("Failed to parse Test Cases", e);
        return [];
    }
  } catch (error) {
    console.error("Error generating Test Cases:", error);
    return [];
  }
};

export const analyzeTranscript = async (
    processDef: ProcessDefinition, 
    transcriptText: string | null
): Promise<WorkshopSuggestion[]> => {
    if (!apiKey) return [];

    const isSimulation = !transcriptText;

    const systemContext = isSimulation 
        ? `You are an expert UK Business Analyst simulating a workshop review. 
           I will provide a Process Definition JSON. 
           Your task is to hallucinate/simulate a realistic "Workshop Transcript" using British English (en-GB).
           The discussion should reflect UK regulations (e.g. FCA Guidelines, GDPR, HMRC Tax Rules).
           Simulate stakeholders discussing the process, identifying logical gaps, requesting field removals (due to GDPR or redundancy), and asking for new fields.
           Then, generate structured suggestions based on this simulated discussion.`
        : `You are an expert UK Business Analyst. 
           I will provide a Process Definition JSON and a Meeting Transcript.
           Your task is to analyze the transcript, find discrepancies or change requests discussed by the team, 
           and generate structured suggestions to update the process.`;

    const prompt = `
        Process Definition: ${JSON.stringify(processDef)}

        ${isSimulation ? 'SIMULATE a workshop discussion for this process.' : `Transcript: "${transcriptText}"`}

        Generate a JSON array of 3-5 specific change suggestions.
        
        Output Schema:
        [
            {
                "id": "sugg_1",
                "type": "remove", // or "add" or "modify"
                "description": "Remove 'National Insurance Number'",
                "reasoning": "Sarah (Ops) mentioned this is already captured in the CRM layer.",
                "targetLabel": "National Insurance Number" 
            },
            {
                "id": "sugg_2",
                "type": "add",
                "description": "Add 'Date of Incident'",
                "reasoning": "Dave (Risk) said we need to know when the event occurred for claims.",
                "newElement": {
                    "label": "Date of Incident",
                    "type": "date",
                    "sectionTitle": "Personal Details" // Match an existing section title if possible
                }
            }
        ]
        
        Ensure "targetLabel" matches existing fields exactly if removing/modifying.
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as WorkshopSuggestion[];
    } catch (e) {
        console.error("Error analyzing transcript:", e);
        return [];
    }
};

export const generateDataMapping = async (
    elements: { id: string; label: string; type: string }[]
): Promise<DataObjectSuggestion[]> => {
    if (!apiKey) return [];

    const prompt = `
        Act as a Pega System Architect.
        I have a list of flattened UI elements from a prototype.
        Your task is to analyze these fields and suggest a Normalized Data Model using Pega Class structures.

        FIELDS:
        ${JSON.stringify(elements)}

        INSTRUCTIONS:
        1. Group related fields into standard Pega Data Classes (e.g., 'Data-Address-Postal', 'Data-Party-Person', 'Data-Ins-Policy', 'Data-Fin-Account').
        2. Suggest the Pega Property name for each field (e.g., 'Address Line 1' -> '.AddressLine1').
        3. Create a clean, logical object model.
        
        OUTPUT FORMAT (JSON Array):
        [
            {
                "className": "Data-Address-Postal", // Or "MyOrg-Data-Address"
                "description": "Captures standard postal address details",
                "mappings": [
                    { "elementId": "el_123", "suggestedProperty": ".AddressLine1" },
                    { "elementId": "el_456", "suggestedProperty": ".City" }
                ]
            }
        ]
        
        If a field is standalone and doesn't fit a complex type, you can map it to 'Work-' (the main case) or group miscellaneous fields into a 'Data-CaseDetails' class.
    `;

    try {
        const response = await callWithRetry(async () => {
            return await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as DataObjectSuggestion[];
    } catch (e) {
        console.error("Error generating data mapping:", e);
        return [];
    }
}
