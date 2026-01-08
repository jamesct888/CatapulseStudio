
import { ProcessDefinition } from '../types';

export const innovationDayComplexProcess: ProcessDefinition = {
    id: "template-alien-visa-complex",
    name: "Interstellar Visitor Visa (Completed Reference)",
    description: "The 'Answer Key' for the workshop. Includes Logic, Calculations, Quarantine, and Summary Mirrors.",
    stages: [
        {
            id: "stg-intake",
            title: "1. Application Intake",
            description: "Capture core biological and travel details",
            sections: [
                {
                    id: "sec-identity",
                    title: "Biological & Identity",
                    layout: "1col",
                    elements: [
                        {
                            id: "app-name",
                            label: "Full Legal Name (Phonetic)",
                            type: "text",
                            required: true
                        },
                        {
                            id: "app-species",
                            label: "Species Classification",
                            type: "radio",
                            options: ["Carbon-based", "Silicon-based", "Ethereal Energy"],
                            required: true
                        },
                        {
                            id: "app-limbs",
                            label: "Number of Primary Appendages",
                            type: "number",
                            defaultValue: "4"
                        }
                    ]
                },
                {
                    id: "sec-travel-details",
                    title: "Travel Logistics",
                    layout: "2col",
                    elements: [
                        {
                            id: "travel-planet",
                            label: "Home Planet / Star System",
                            type: "select",
                            options: ["Mars", "Venus", "Proxima Centauri b", "Kepler-186f", "Trappist-1e", "Gallifrey"],
                            required: true
                        },
                        {
                            id: "travel-city",
                            label: "Primary Destination City",
                            type: "select",
                            // "make sure Bristol and Edinburgh are both asked for"
                            options: ["London", "Bristol", "Edinburgh", "Manchester", "Glasgow", "Cardiff"],
                            required: true
                        },
                        {
                            id: "stay-duration",
                            label: "Stay Duration (Earth Cycles)",
                            type: "number",
                            description: "Silicon-based life forms require strict monitoring.",
                            hidden: true,
                            visibility: {
                                id: "vis-silicon-stay",
                                operator: "AND",
                                conditions: [{ targetElementId: "app-species", operator: "equals", value: "Silicon-based" }]
                            }
                        }
                    ]
                },
                {
                    id: "sec-customs",
                    title: "Customs Declaration",
                    elements: [
                        {
                            id: "customs-list",
                            label: "Declared Cargo",
                            type: "repeater",
                            description: "List all organic and inorganic matter.",
                            columns: [
                                { id: "col-item", label: "Item Description", type: "select", options: ["Personal Effects", "Scientific Sample", "Cultural Artifact", "Exotic Flora", "Unknown Isotope"] },
                                { id: "col-qty", label: "Quantity", type: "number" },
                                { id: "col-commercial", label: "Commercial Sample?", type: "checkbox" }
                            ]
                        },
                        {
                            id: "hazard-flag",
                            label: "CONFIRM BIO-HAZARD PRESENCE?",
                            type: "checkbox",
                            description: "Check if ANY items above are marked as Bio-Hazard. Triggers Quarantine Stage.",
                            required: false // Not required to check it, but if checked it triggers logic
                        }
                    ]
                },
                {
                    id: "sec-fees",
                    title: "Processing Fees",
                    variant: "summary",
                    elements: [
                        {
                            id: "fee-calc",
                            label: "Total Processing Fee (GC)",
                            type: "calculated",
                            description: "Base fee (100) + (10 GC per Limb)",
                            calculation: [
                                { id: "c1", type: "field", value: "app-limbs" },
                                { id: "c2", type: "operator", value: "*" },
                                { id: "c3", type: "constant", value: "10" },
                                { id: "c4", type: "operator", value: "+" },
                                { id: "c5", type: "constant", value: "100" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-vetting",
            title: "2. Background & Security Vetting",
            description: "Security assessment and protocol verification",
            sections: [
                {
                    id: "sec-protocols",
                    title: "Analyst Protocols",
                    variant: "info",
                    hidden: true,
                    visibility: {
                        id: "vis-protocols",
                        operator: "AND",
                        conditions: [{ targetElementId: "app-species", operator: "equals", value: "Ethereal Energy" }]
                    },
                    elements: [
                        {
                            id: "prot-99",
                            label: "Protocol 99: Ethereal Energy detected. Enable containment fields.",
                            type: "static",
                            defaultValue: "Protocol 99: Ethereal Energy detected. Enable containment fields."
                        }
                    ]
                },
                {
                    id: "sec-assessment",
                    title: "Security Assessment",
                    layout: "1col",
                    elements: [
                        {
                            id: "risk-level",
                            label: "Risk Assessment",
                            type: "radio", // Changed to radio per request
                            options: ["Clean", "Minor Offense", "Active Bounty"],
                            required: true
                        },
                        {
                            id: "offense-detail",
                            label: "Offense Explanation",
                            type: "textarea",
                            description: "Required for Minor Offenses.",
                            hidden: true,
                            required: true, // Conditional Mandatory: Field is required, but only visible when...
                            visibility: {
                                id: "vis-minor-explain",
                                operator: "AND",
                                conditions: [{ targetElementId: "risk-level", operator: "equals", value: "Minor Offense" }]
                            }
                        }
                    ]
                },
                {
                    id: "sec-red-flag",
                    title: "CRITICAL ALERT",
                    variant: "warning",
                    hidden: true,
                    visibility: {
                        id: "vis-bounty",
                        operator: "AND",
                        conditions: [{ targetElementId: "risk-level", operator: "equals", value: "Active Bounty" }]
                    },
                    elements: [
                        {
                            id: "msg-bounty",
                            label: "Active Bounty Detected",
                            type: "static",
                            defaultValue: "Applicant is flagged for immediate detention. Do not proceed."
                        }
                    ]
                },
                {
                    id: "sec-summary",
                    title: "Case Summary (Read Only)",
                    variant: "summary",
                    elements: [
                        // "Case Summary should include read-only versions of 5 or 6 previously captured data elements"
                        { id: "sum-name", label: "Applicant Name", type: "mirror", sourceFieldId: "app-name" },
                        { id: "sum-planet", label: "Home System", type: "mirror", sourceFieldId: "travel-planet" },
                        { id: "sum-dest", label: "Destination", type: "mirror", sourceFieldId: "travel-city" },
                        { id: "sum-species", label: "Species", type: "mirror", sourceFieldId: "app-species" },
                        { id: "sum-fee", label: "Fees Assessment", type: "mirror", sourceFieldId: "fee-calc" },
                        { id: "sum-risk", label: "Risk Level", type: "mirror", sourceFieldId: "risk-level" }
                    ]
                }
            ]
        },
        {
            id: "stg-quarantine",
            title: "2A. Bio-Hazard Quarantine",
            description: "Mandatory decontamination for hazardous cargo",
            skipLogic: {
                id: "skip-no-hazard",
                operator: "AND",
                // Skip this stage IF hazard-flag is NOT checked (i.e., equals false or isn't present)
                conditions: [{ targetElementId: "hazard-flag", operator: "notEquals", value: true }]
            },
            sections: [
                {
                    id: "sec-decon",
                    title: "Decontamination Logs",
                    variant: "warning",
                    elements: [
                        {
                            id: "decon-confirm",
                            label: "Decontamination Complete",
                            type: "checkbox",
                            required: true
                        },
                        {
                            id: "decon-officer",
                            label: "Officer ID",
                            type: "text",
                            required: true
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-approval",
            title: "3. Final Adjudication",
            description: "Final visa grant/deny decision",
            sections: [
                {
                    id: "sec-decision",
                    title: "Adjudication",
                    elements: [
                        {
                            id: "visa-status",
                            label: "Visa Decision",
                            type: "radio",
                            options: ["Grant Visa", "Deny Entry", "Refer to High Council"],
                            required: true
                        }
                    ]
                }
            ]
        }
    ]
};
