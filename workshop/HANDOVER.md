# 🚀 Innovation Day Handover Document
**Project:** Galactic Visa Crisis (Innovation Day Workshop)
**Status:** READY FOR DEPLOYMENT / WORKSHOP EXECUTION
**Date:** 2026-01-08

## 🤖 To the Next AI Agent
This repository contains the setup for a "Catapulse Innovation Day" workshop. The user (Facilitator) will be running this on a new machine.

**Your Goal:** Assist the Facilitator in running the workshop.

### 📂 Key Resources
All critical files have been moved to the `workshop/` directory:
1.  **`workshop/workshop_instructions.md`**: The Master Guide. It contains the 3 "Injects" (scenarios) the participants must follow.
2.  **`workshop/director_transcript.md`**: The AI Copilot Demo script.
3.  **`templates/innovation-day-visa.ts`**: The "Purple Card" (Start State).
4.  **`templates/innovation-day-complex.ts`**: The "Pink Card" (End State / Answer Key).

### ⚡ Quick Start for New Session
When the user asks for help, follow this protocol:
1.  **Read `workshop/workshop_instructions.md`** to understand the "Injects".
2.  **Ask the user which phase they are in** (Inject 1, 2, 3, or The AI Director).
3.  **Provide the relevant copy-paste material** from the instructions.

### 🏗 Architecture Notes
- The process is **hardcoded** in the `templates/` folder. It does NOT rely on dynamic AI generation for the setup.
- **Phase 1.5** (Risk Assessment, etc.) is already baked into `innovation-day-visa.ts`.
- **Phase 2** (Complex Logic) is baked into `innovation-day-complex.ts`.

**DO NOT modify the templates unless the Facilitator specifically requests a "Hot Fix" during the workshop.**

Good luck, Agent.
