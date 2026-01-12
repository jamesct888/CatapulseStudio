# Innovation Day Workshop: The Interstellar Visa Crisis

## Facilitator Notes
- **Starting Point**: ALL Participants load the **"Interstellar Visitor Visa (Workshop)"** template (Purple Card).
- **Goal**: Transform the basic shell into the **"Interstellar Visitor Visa (Completed Reference)"** (Pink Card).
- **Structure**: Runs in 3 "Injects" (Sprints), delivered via email/memo from fictional stakeholders.

---

## 🔊 Opening Transmission: "Operation Ironclad" (5 Mins)

**Facilitator Action:**
Display the **High Chancellor** image on the big screen and play the recorded "Voice Message".

**Audio Script (Read by Facilitator or AI Voice):**
> "Attention. This is High Chancellor Valerian of the United Earth Council.
>
> The year is 3024. For two centuries, Earth has been a sanctuary. We welcomed the galaxy with open arms. But our kindness... has been exploited.
>
> Intelligence reports confirm that Class-A contraband—unstable plasma weaponry, dark matter explosives, and mimetic bio-agents—is slipping through our borders. The catastrophic breach on Luna Base 7 three days ago was a warning we cannot ignore.
>
> Our current manual checks are... insufficient. They are slow. They are biased. They are leaving us exposed to annihilation.
>
> We cannot close the skies, but we *must* secure them. We need a new Visa Application System immediately. One that is rigorous. Intelligent. Uncompromising.
>
> You have been assembled because you are the finest prototypers in the sector. But time is not on our side. We have less than one hour before the Galatic Transport Fleet arrives.
>
> Your orders are clear: Prototype the ultimate vetting system. Find the threats before they land. Save our world.
>
> Valerian out."

## 🛸 Pilot's Guide (Quick Controls)
*   **Select**: Click any field on the screen to open its settings in the **Right Panel**.
*   **Add Field**: Use the **"Add Field"** box at the bottom of any section, or the floating toolbox.
*   **Add Section**: Use the **"Add Section"** button in both the **Left Sidebar** (under the active stage).
*   **Logic**: To make fields hidden or mandatory, switch to the **"Logic & Rules"** tab in the **Right Panel**.

## 📝 Workshop Injects

## Inject 1: Standardization Standards

**Message from Grand Director Zorg:**
*"Reviewing your 'Application' stage. It's a mess. Standardize the data inputs immediately. Free text is the enemy of order."*

### Task Checklist:
1.  **Refine 'Home Planet'**
    -   Click the `Home Planet` field to select it.
    -   In the **Right Panel**, change Type to `Dropdown` (Select).
    -   **Options**: `Earth`, `Mars`, `Venus`, `Jupiter`, `Saturn`, `Proxima Centauri Bb`., `Kepler-186f`, `Trappist-1e`, `Gallifrey`.

2.  **Enforce Destination Cities** (Stage 1)
    - Find `Primary Destination City`.
    - Update the **Options** list to strictly include: `London`, `Bristol`, `Edinburgh`, `Manchester`, `Glasgow`, `Cardiff`.

## 📧 Inject 2: "The Security Patch" (20 Mins)

**Sender:** Legal & Compliance Division
**Subject:** NEW PROTOCOLS: Silicon Lifeforms & Minor Offenses

> "Legal has flagged two liabilities. 1) We aren't tracking stay limits for Silicon-based entities (who tend to rust). 2) We are collecting explanation data for 'Clean' applicants, which is a privacy violation."

### Task Checklist
1.  **Add Silicon Tracking** (Stage 1)
    -   Locate the **"Travel Logistics"** assignment (or "Travel Details" section).
    -   Add a New Field: `Stay Duration (Earth Cycles)` (Number).
    -   **Visibility Rule**: Show ONLY if `Species Classification` equals `Silicon-based`.

2.  **Refine Assessment Logic** (Stage 2)
    -   Add a New Field: `Offense Explanation` (Text Area) under Risk Assessment.
    -   **Conditional Mandatory**: Make it **Required**, but...
    -   **Visibility Rule**: Show ONLY if `Risk Assessment` equals `Minor Offense`.
    *(Note: This creates a 'Conditional Mandatory' effect—it's only required when visible).*

3.  **Hide irrelevant data**
    -   Select the `Analyst Protocols` section.
    -   Switch to the **"Logic & Rules"** tab in the Right Panel.
    -   Add a **Visibility Rule**:
        -   Show If `Species Classification` equals `Unknown` OR `Xenomorph`.

4.  **Implement Fee Structure** (Stage 1)
    -   **Tip**: Look at the **Left Sidebar** to add a new section.
    -   Add a New Section: `Processing Fees` (Summary Variant).
    -   Add Field: `Total Processing Fee` (Calculated).
    - **Calculation**: Use the **Formula Builder**.
        - Add **Field** -> `Number of Primary Appendages`
        - Add **Operator** -> `*`
        - Add **Constant** -> `10`
        - Add **Operator** -> `+`
        - Add **Constant** -> `100`

## ⚠️ Inject 3: "The Bio-Hazard Protocol" (25 Mins)

**Sender:** Global Defense Command
**Subject:** CRITICAL ALERT: CONTAINMENT BREACH

> "A Class-4 pathogen was just intercepted. Effective immediately, we must track ALL cargo and strictly quarantine any confirmed bio-hazards."

### Task Checklist
1.  **Detailed Cargo Manifest** (Stage 1)
    -   Add a New Section: `Customs Declaration`.
    -   Add Field: `Declared Cargo` (Repeater).
    -   **Columns**:
        1.  `Item Description` (Text).
        2.  `Quantity` (Number).
        3.  `Commercial Sample?` (Bool).

2.  **The Trigger** (Stage 1)
    -   Add Field: `CONFIRM BIO-HAZARD PRESENCE?` (**Select/Dropdown**).
    -   **Options**: `Yes`, `No`.
    *(Using a Dropdown ensures the logic builder can select a specific value).*

3.  **The Quarantine Stage** (New Stage)
    -   Add a **New Stage** and name it `Bio-Hazard Quarantine`.
    -   **Reorder**: Drag this new stage **above** "Final Adjudication" so it becomes Stage 3 (making Adjudication Stage 4).
    -   Add Section: `Decontamination Logs` (**Standard Section**). *(Warning sections are read-only).*
    -   Add Field: `Decontamination Complete` (Checkbox, Required).

4.  **The Routing Logic** (Stage 3 Logic & Rules)
    -   Select Stage 3 (`Bio-Hazard Quarantine`).
    -   Open the **"Logic & Rules"** tab (right panel).
    -   Add a **Skip Logic** rule (in **Logic & Rules** tab):
        -   If `CONFIRM BIO-HAZARD PRESENCE?` equals `Yes` -> Skip to `Bio-Hazard Quarantine`.
        -   Else -> Proceed to Next Stage.
    
5.  **Audit Trail** (Stage 4: Final Adjudication)
    -   Select **Stage 4**.
    -   Add a `Case Summary (Read Only)` section.
    - Add fields with Type **Static Text / Display**.
    - Set **Data Source** to **Mirror Another Field**.
    - Select source fields: `Applicant Name`, `Species`, `Risk Assessment`.

## 🤖 Inject 4: "The Director's Override" (AI Copilot Demo)

**Sender:** Grand Director Zorg
**Subject:** MINUTES FROM HIGH COUNCIL MEETING (ATTACHED)

> "I don't have time to fill out change request forms. Just read the transcript of our meeting and fix the app. IMMEDIATELY."

### Task: The AI Power Move
1.  **Open Workshop Review Mode**: Click the **Message Icon** (Workshop Review Mode) in the top header.
2.  **Copy the Transcript**: Open the `director_transcript.md` file (provided separately).
3.  **Paste & Analyze**: Paste the **entire dialogue** into the "Paste Transcript" area and click **Analyze**.
4.  **Watch the Magic**:
    - The AI should parse Zorg's natural language demands.
    - **Expected Changes**:
        - Rename "Number of Primary Appendages" to **Limb Count**.
        - Add a **Payment Verification** field in Final Adjudication.
        - Add a **User Feedback** section with a "Comments" field.
