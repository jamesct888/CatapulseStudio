
import { ProcessDefinition } from '../types';

export const innovationDayProcess: ProcessDefinition = {
    id: "template-alien-visa",
    name: "Interstellar Visitor Visa (Workshop)",
    description: "Standardized starting point for the Innovation Day workshop. Includes Intake and basic Security Vetting stages.",
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
                    id: "sec-origin",
                    title: "Origin & Destination",
                    layout: "2col",
                    elements: [
                        {
                            id: "travel-planet",
                            label: "Home Planet / Star System",
                            type: "text",
                            required: true
                        },
                        {
                            id: "travel-city",
                            label: "Primary Destination City",
                            type: "select",
                            options: ["New York", "London", "Tokyo", "Paris", "Area 51 (Restricted)"],
                            required: true
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
                    elements: [
                        {
                            id: "prot-99",
                            label: "Protocol 99: If species is 'Ethereal Energy', enable containment protocols.",
                            type: "static",
                            defaultValue: "Protocol 99: If species is 'Ethereal Energy', enable containment protocols."
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
                            type: "select",
                            options: ["Clean", "Minor Offense", "Active Bounty"],
                            required: true
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
                // Case Summary removed per workshop requirements
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
