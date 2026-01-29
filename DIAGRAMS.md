# System Diagrams for Catapulse Studio

## Diagram 1: System High-Level Architecture
*Context: Overview of how the User, UI, and AI services interact.*

```mermaid
graph TD
    User[Business User] -->|Interacts with| UI[Catapulse Studio UI]
    UI -->|Manages State| Store[Local State / React Context]
    UI -->|Requests Generation| AI[Gemini Service Layer]
    AI -->|API Calls| Google[Google Gemini API]
    
    subgraph Client Workstation
        UI
        Store
        AI
    end
    
    subgraph Cloud Services
        Google
    end
```

---

## Diagram 2: Data Model Design
*Context: Class diagram showing the structure of `ProcessDefinition` and related entities.*

```mermaid
classDiagram
    class ProcessDefinition {
        +String id
        +String name
        +String description
        +StageDefinition[] stages
        +Party[] parties
        +UserStory[] userStories
        +TestCase[] testCases
    }

    class StageDefinition {
        +String id
        +String title
        +SectionDefinition[] sections
        +LogicGroup skipLogic
    }

    class SectionDefinition {
        +String id
        +String title
        +String layout
        +ElementDefinition[] elements
        +LogicGroup visibility
    }

    class ElementDefinition {
        +String id
        +String label
        +ElementType type
        +String[] options
        +ValidationRule validation
        +LogicGroup requiredLogic
        +LogicGroup visibility
    }

    class Party {
        +String id
        +String name
        +PartyRole role
        +BankDetails bankDetails
    }

    ProcessDefinition *-- StageDefinition
    ProcessDefinition *-- Party
    StageDefinition *-- SectionDefinition
    SectionDefinition *-- ElementDefinition
```

---

## Diagram 3: AI Service Generation Flow
*Context: Sequence diagram illustrating how the system generates a new process from a user description.*

```mermaid
sequenceDiagram
    participant User
    participant UI as ProcessEditor UI
    participant Service as GeminiService
    participant API as Google Gemini API

    User->>UI: Enters Description ("Create a Pension Transfer process")
    UI->>Service: generateMonolithicProcess(description)
    Service->>Service: validateConfig(apiKey)
    
    Service->>API: POST /generateContent (Prompt + System Instructions)
    activate API
    API-->>Service: JSON Response (Raw Text)
    deactivate API

    Service->>Service: cleanAndParseJSON(response)
    Service->>Service: sanitizeProcessData(data)
    Note right of Service: Ensures IDs exist,\nfixes option arrays,\nsanitizes logic structures
    
    Service-->>UI: ProcessDefinition Object
    UI->>UI: Update Application State
    UI-->>User: Renders Process Diagram & Forms
```

---

## Diagram 4: DevOps & Deployment Workflow
*Context: Sequence diagram showing the build and deployment process defined in `deploy-both.ps1`.*

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Script as deploy-both.ps1
    participant GCB as Google Cloud Build
    participant GCR as Google Container Registry
    participant CloudRun as Cloud Run (europe-west2)

    Dev->>Script: Run ./deploy-both.ps1
    Script->>Script: npm run build (Clean & Build)
    
    loop For Each Variant (AI / Standard)
        Script->>Script: Update dist/config.js (Toggle AI)
        Script->>GCB: gcloud builds submit .
        GCB->>GCB: Build Docker Image (nginx + dist)
        GCB->>GCR: Push Image
        Script->>CloudRun: gcloud run deploy
    end
    
    CloudRun-->>Dev: Service URL
```
