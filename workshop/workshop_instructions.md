# Innovation Day Workshop: The Interstellar Visa Crisis

## Facilitator Notes
- **Starting Point**: ALL Participants load the **"Interstellar Visitor Visa (Workshop)"** template (Purple Card).
- **Goal**: Transform the basic shell into the **"Interstellar Visitor Visa (Completed Reference)"** (Pink Card).
- **Structure**: Runs in 3 "Injects" (Sprints), delivered via email/memo from fictional stakeholders.

---

<details open>
<summary><h2>🔊 Opening Transmission: "Operation Ironclad" (5 Mins)</h2></summary>

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

</details>

<details open>
<summary><h2>📧 Inject 1: "The Data Cleanup" (15 Mins)</h2></summary>

**Sender:** Director of Interplanetary Bureaucracy
**Subject:** URGENT: Data Quality Audit

> "Team, our data is a mess. Agents are typing 'Mars' as 'M4rs', and we have no standardization. We need to lock down our inputs immediately."

### Task Checklist
1.  **Standardize Home Planet** (Stage 1)
    - Find the `Home Planet / Star System` field.
    - Change Type from **Text** to **Dropdown** (Select).
    - **Options**: `Mars`, `Venus`, `Proxima Centauri b`, `Kepler-186f`, `Trappist-1e`, `Gallifrey`.

2.  **Enforce Destination Cities** (Stage 1)
    - Find `Primary Destination City`.
    - Update the **Options** list to strictly include: `London`, `Bristol`, `Edinburgh`, `Manchester`, `Glasgow`, `Cardiff`.

3.  **Improve Risk UX** (Stage 2)
    - Navigate to **Background & Security Vetting**.
    - Find `Risk Assessment`.
    - Change Type from **Dropdown** to **Radio Buttons** for faster analyst clicking.

</details>

<details>
<summary><h2>📧 Inject 2: "The Security Patch" (20 Mins)</h2></summary>

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

3.  **Hide Classified Protocols** (Stage 2)
    -   Select the `Analyst Protocols` section.
    -   **Visibility Rule**: Show ONLY if `Species Classification` equals `Ethereal Energy`.

4.  **Implement Fee Structure** (Stage 1)
    -   Add a New Section: `Processing Fees` (Summary Variant).
    -   Add Field: `Total Processing Fee` (Calculated).
    -   **Calculation**: `Number of Primary Appendages * 10 + 100` (Enter without brackets).

</details>

<details>
<summary><h2>⚠️ Inject 3: "The Bio-Hazard Protocol" (25 Mins)</h2></summary>

**Sender:** Global Defense Command
**Subject:** CRITICAL ALERT: CONTAINMENT BREACH

> "A Class-4 pathogen was just intercepted. Effective immediately, we must track ALL cargo and strictly quarantine any confirmed bio-hazards."

### Task Checklist
1.  **Detailed Cargo Manifest** (Stage 1)
    -   Add a New Section: `Customs Declaration`.
    -   Add Field: `Declared Cargo` (Repeater).
    -   **Columns**:
        1.  `Item Description` (Text). *(Note: Repeater currently does not support Select/Dropdown).*
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
    -   **Skip Logic**: Skip this stage IF `CONFIRM BIO-HAZARD PRESENCE?` equals `No`.

5.  **Audit Trail** (Stage 4: Final Adjudication)
    -   Select **Stage 4**.
    -   Add a `Case Summary (Read Only)` section.
    -   Use **Mirror Fields** to display `Applicant Name`, `Species`, and `Risk Assessment` from previous sections.

</details>

<details>
<summary><h2>🤖 Inject 4: "The Director's Override" (AI Copilot Demo)</h2></summary>

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

</details>
