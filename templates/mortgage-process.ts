
import { ProcessDefinition } from '../types';

export const mortgageProcess: ProcessDefinition = {
    id: "template-mortgage-core",
    name: "Enterprise Mortgage Application",
    description: "A complex 5-stage application demonstrating Calculated Fields, Skip Logic, Regex Validation, and Pega Class Mapping.",
    stages: [
        {
            id: "stg-capture",
            title: "Data Capture",
            description: "Initial customer fact find",
            defaultSkill: "Customer Service Rep",
            sections: [
                {
                    id: "sec-applicant",
                    title: "Primary Applicant",
                    layout: "2col",
                    elements: [
                        {
                            id: "app-fname",
                            label: "First Name",
                            type: "text",
                            required: true
                        },
                        {
                            id: "app-lname",
                            label: "Last Name",
                            type: "text",
                            required: true
                        },
                        {
                            id: "app-dob",
                            label: "Date of Birth",
                            type: "date",
                            required: true,
                            validation: { type: "date_past" }
                        },
                        {
                            id: "app-nino",
                            label: "National Insurance Number",
                            type: "text",
                            required: true,
                            validation: { type: "nino_uk" },
                            description: "Format: QQ 12 34 56 A"
                        },
                        {
                            id: "app-email",
                            label: "Email Address",
                            type: "email",
                            required: true,
                            validation: { type: "email" }
                        }
                    ]
                },
                {
                    id: "sec-financials",
                    title: "Financial Overview",
                    layout: "3col",
                    elements: [
                        {
                            id: "fin-income",
                            label: "Annual Income (Gross)",
                            type: "currency",
                            required: true
                        },
                        {
                            id: "fin-debt",
                            label: "Total Monthly Debt",
                            type: "currency",
                            required: true
                        },
                        {
                            id: "fin-emptype",
                            label: "Employment Type",
                            type: "select",
                            options: ["Full Time", "Part Time", "Self Employed", "Retired"],
                            required: true
                        }
                    ]
                },
                {
                    id: "sec-selfemp",
                    title: "Self Employment Details",
                    variant: "info",
                    hidden: true,
                    visibility: {
                        id: "vis-selfemp",
                        operator: "AND",
                        conditions: [{ targetElementId: "fin-emptype", operator: "equals", value: "Self Employed" }]
                    },
                    elements: [
                        {
                            id: "se-taxyear",
                            label: "Tax Years Trading",
                            type: "number",
                            required: true
                        },
                        {
                            id: "se-accountant",
                            label: "Accountant Name",
                            type: "text"
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-property",
            title: "Property Details",
            description: "Property valuation and LTV calculation",
            defaultSkill: "Mortgage Advisor",
            sections: [
                {
                    id: "sec-prop-val",
                    title: "Valuation",
                    layout: "2col",
                    elements: [
                        {
                            id: "prop-price",
                            label: "Purchase Price",
                            type: "currency",
                            required: true
                        },
                        {
                            id: "prop-deposit",
                            label: "Deposit Amount",
                            type: "currency",
                            required: true
                        },
                        {
                            id: "prop-ltv",
                            label: "Loan To Value (%)",
                            type: "calculated",
                            description: "Automatically calculated: (Price - Deposit) / Price",
                            calculation: [
                                { id: "c1", type: "constant", value: "100" },
                                { id: "c2", type: "operator", value: "*" },
                                { id: "c3", type: "operator", value: "(" },
                                { id: "c4", type: "field", value: "prop-price" },
                                { id: "c5", type: "operator", value: "-" },
                                { id: "c6", type: "field", value: "prop-deposit" },
                                { id: "c7", type: "operator", value: ")" },
                                { id: "c8", type: "operator", value: "/" },
                                { id: "c9", type: "field", value: "prop-price" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-decision",
            title: "Underwriting Decision",
            description: "Automated checks",
            defaultSkill: "Underwriter",
            // Skip this stage if LTV is extremely safe
            skipLogic: {
                id: "skip-low-risk",
                operator: "AND",
                conditions: [{ targetElementId: "prop-ltv", operator: "lessThan", value: 60 }]
            },
            sections: [
                {
                    id: "sec-risk",
                    title: "Risk Assessment",
                    layout: "1col",
                    variant: "warning",
                    elements: [
                        {
                            id: "risk-notes",
                            label: "Underwriter Notes",
                            type: "textarea"
                        },
                        {
                            id: "risk-decision",
                            label: "Final Decision",
                            type: "radio",
                            options: ["Approve", "Decline", "Refer to Credit Committee"]
                        }
                    ]
                }
            ]
        }
    ]
};
