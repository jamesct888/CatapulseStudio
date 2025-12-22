
import { ProcessDefinition } from '../types';

export const comprehensiveProcess: ProcessDefinition = {
    id: "template-mars-mission",
    name: "Mars Colony Pioneer Application",
    description: "A comprehensive clearance process for Mars colonization deployment. Demonstrates EVERY system capability in a high-stakes scenario.",
    stages: [
        {
            id: "stg-bio",
            title: "1. Biometric & Profile Data",
            description: "Initial physical and psychological profiling",
            defaultSkill: "Mission Commander",
            sections: [
                {
                    id: "sec-identity",
                    title: "Candidate Identity",
                    layout: "2col",
                    elements: [
                        { id: "bio-callsign", label: "Preferred Callsign", type: "text", required: true },
                        { id: "bio-email", label: "Secure Comms ID (Email)", type: "email", validation: { type: "email" }, required: true },
                        { id: "bio-dob", label: "Date of Birth", type: "date", required: true, validation: { type: "date_past" } },
                        {
                            id: "bio-commence",
                            label: "Earliest Deployment Window",
                            type: "datetime",
                            required: true,
                            description: "Must be after next launch cycle"
                        }
                    ]
                },
                {
                    id: "sec-physical",
                    title: "Physical Metrics",
                    layout: "3col",
                    elements: [
                        { id: "phys-weight", label: "Weight (kg)", type: "number", defaultValue: "75" },
                        { id: "phys-height", label: "Height (cm)", type: "number", defaultValue: "180" },
                        {
                            id: "phys-bmi",
                            label: "Body Mass Index (Calculated)",
                            type: "calculated",
                            description: "Auto-calculated for G-Force tolerance",
                            calculation: [
                                { id: "c1", type: "field", value: "phys-weight" },
                                { id: "c2", type: "operator", value: "/" },
                                { id: "c3", type: "operator", value: "(" },
                                { id: "c4", type: "field", value: "phys-height" },
                                { id: "c5", type: "operator", value: "/" },
                                { id: "c6", type: "constant", value: "100" },
                                { id: "c7", type: "operator", value: ")" },
                                { id: "c8", type: "operator", value: "^" },
                                { id: "c9", type: "constant", value: "2" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-skills",
            title: "2. Technical Aptitude",
            description: "Role assignment and certification",
            defaultSkill: "Training Officer",
            sections: [
                {
                    id: "sec-role",
                    title: "Mission Role Selection",
                    layout: "1col",
                    elements: [
                        {
                            id: "role-primary",
                            label: "Primary Specialization",
                            type: "radio",
                            options: ["Command", "Engineering", "Bio-Science", "Geo-Morphology"],
                            required: true
                        },
                        {
                            id: "role-secondary",
                            label: "Secondary Capabilities",
                            type: "multiselect",
                            description: "Select all that apply for emergency rotation",
                            options: ["EVA Qualified", "Nuclear Repair", "Hydroponics", "Crisis Negotiation", "Flight Piloting"]
                        }
                    ]
                },
                {
                    id: "sec-flight-logs",
                    title: "Flight Certification",
                    hidden: true,
                    visibility: {
                        id: "vis-pilot",
                        operator: "AND",
                        conditions: [{ targetElementId: "role-secondary", operator: "contains", value: "Flight Piloting" }]
                    },
                    layout: "2col",
                    elements: [
                        { id: "flight-hours", label: "Total Flight Hours", type: "number" },
                        { id: "flight-licence", label: "License Number", type: "text", validation: { type: "custom" } }
                    ]
                },
                {
                    id: "sec-prev-missions",
                    title: "Mission History",
                    elements: [
                        {
                            id: "hist-repeater",
                            label: "Previous Deployments (Extended Detail)",
                            type: "repeater",
                            description: "List all off-world deployments",
                            columns: [
                                { id: "col-mission", label: "Mission Name", type: "text" },
                                { id: "col-start", label: "Start Date", type: "date" },
                                { id: "col-type", label: "Environment", type: "select", options: ["Orbital", "Lunar", "Deep Space", "Martian"] },
                                { id: "col-duration", label: "Days", type: "number" },
                                { id: "col-hazard", label: "Hazard Pay?", type: "checkbox" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-psych",
            title: "3. Psychological Evaluation",
            description: "Deep stowage isolation testing",
            defaultSkill: "Mission Psychologist",
            skipLogic: {
                id: "skip-command",
                operator: "AND",
                conditions: [{ targetElementId: "role-primary", operator: "equals", value: "Command" }]
            },
            sections: [
                {
                    id: "sec-eval",
                    title: "Isolation Stress Test Results",
                    layout: "1col",
                    // REMOVED VARIANT: WARNING (To allow editing)
                    elements: [
                        { id: "psych-notes", label: "Evaluator Notes", type: "textarea", required: true },
                        {
                            id: "psych-score",
                            label: "Stability Score (0-100)",
                            type: "number",
                            required: true,
                            defaultValue: "85",
                            description: "Score < 50 triggers automatic rejection routing"
                        }
                    ]
                },
                {
                    id: "sec-psych-alert",
                    title: "Automated Risk Assessment",
                    layout: "1col",
                    variant: "warning", // This section handles the visual warning
                    hidden: true,
                    visibility: {
                        id: "vis-unstable",
                        operator: "AND",
                        conditions: [{ targetElementId: "psych-score", operator: "lessThan", value: 50 }]
                    },
                    elements: [
                        {
                            id: "psych-risk-msg",
                            label: "CRITICAL WARNING",
                            type: "static",
                            defaultValue: "⚠️ CANDIDATE UNSTABLE - AUTOMATIC REJECTION ADVISED. DO NOT CLEAR FOR LAUNCH."
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-clearance",
            title: "4. Final Mission Clearance",
            description: "Launch approval board",
            defaultSkill: "Launch Director",
            sections: [
                {
                    id: "sec-approval",
                    title: "Board Decision",
                    layout: "1col",
                    elements: [
                        {
                            id: "final-decision",
                            label: "Mission Status",
                            type: "select",
                            options: ["GO FOR LAUNCH", "NO-GO (Hold)", "Re-Evaluate"],
                            required: true
                        },
                        {
                            id: "final-kit",
                            label: "Standard Kit Issued?",
                            type: "checkbox"
                        }
                    ]
                }
            ]
        }
    ]
};
