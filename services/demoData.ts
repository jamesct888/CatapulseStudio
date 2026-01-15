
import { ProcessDefinition, FormState, TestCase, UserStory } from "../types";

export const demoProcess: ProcessDefinition = {
    "id": "proc_demo_123",
    "name": "Pension Transfer Request",
    "description": "Process for transferring an external pension into the scheme.",
    "stages": [
        {
            "id": "stg_details",
            "title": "Member Details",
            "sections": [
                {
                    "id": "sec_personal",
                    "title": "Personal Information",
                    "layout": "2col",
                    "elements": [
                        {
                            "id": "memberId",
                            "label": "Member ID",
                            "type": "text",
                            "required": true,
                            "description": "Unique identifier"
                        },
                        {
                            "id": "nationalInsurance",
                            "label": "National Insurance Number",
                            "type": "text",
                            "required": true
                        },
                        {
                            "id": "maritalStatus",
                            "label": "Marital Status",
                            "type": "select",
                            "options": ["Single", "Married", "Divorced", "Widowed"],
                            "required": true
                        },
                        {
                            "id": "spouseName",
                            "label": "Spouse Name",
                            "type": "text",
                            "visibility": {
                                id: "logic_1",
                                operator: "AND",
                                conditions: [
                                    {
                                        "targetElementId": "maritalStatus",
                                        "operator": "equals",
                                        "value": "Married"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        {
            "id": "stg_transfer",
            "title": "Transfer Details",
            "sections": [
                {
                    "id": "sec_scheme",
                    "title": "Previous Scheme",
                    "layout": "1col",
                    "elements": [
                        {
                            "id": "schemeName",
                            "label": "Previous Scheme Name",
                            "type": "text",
                            "required": true
                        },
                        {
                            "id": "transferValue",
                            "label": "Transfer Value (£)",
                            "type": "currency",
                            "required": true
                        },
                        {
                            "id": "hasAdvice",
                            "label": "Have you received financial advice?",
                            "type": "radio",
                            "options": ["Yes", "No"],
                            "required": true
                        },
                        {
                            "id": "advisorName",
                            "label": "Advisor Name",
                            "type": "text",
                            "visibility": {
                                id: "logic_2",
                                operator: "AND",
                                conditions: [
                                    {
                                        "targetElementId": "hasAdvice",
                                        "operator": "equals",
                                        "value": "Yes"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    ]
};

export const demoDigitizedProcess: ProcessDefinition = {
    "id": "proc_scan_99",
    "name": "General Claim Form (Digitized)",
    "description": "Imported from 'Paper_Claim_v4.pdf' via Vision AI.",
    "stages": [
        {
            "id": "stg_scan_1",
            "title": "Part A: Claimant",
            "sections": [
                {
                    "id": "sec_scan_1",
                    "title": "Policy Holder Details",
                    "layout": "2col",
                    "elements": [
                        { "id": "scan_pol_num", "label": "Policy Number", "type": "text", "required": true },
                        { "id": "scan_surname", "label": "Surname", "type": "text", "required": true },
                        { "id": "scan_dob", "label": "Date of Birth", "type": "date", "required": false },
                        { "id": "scan_addr", "label": "Postcode", "type": "text", "required": false }
                    ]
                }
            ]
        },
        {
            "id": "stg_scan_2",
            "title": "Part B: Incident",
            "sections": [
                {
                    "id": "sec_scan_2",
                    "title": "Incident Particulars",
                    "layout": "1col",
                    "elements": [
                        { "id": "scan_date", "label": "Date of Incident", "type": "date", "required": true },
                        { "id": "scan_desc", "label": "Description of Event", "type": "textarea", "required": true },
                        { "id": "scan_police", "label": "Police Reported?", "type": "checkbox", "required": false }
                    ]
                }
            ]
        }
    ]
};

export const demoFormData: FormState = {
    "memberId": "MEM-882910",
    "nationalInsurance": "QQ123456C",
    "maritalStatus": "Married",
    "spouseName": "Sarah Jones",
    "schemeName": "Aviva Pension Plan B",
    "transferValue": 145000,
    "hasAdvice": "Yes",
    "advisorName": "Finchley Financial Services"
};

export const demoUserStories: UserStory[] = [
    {
        "id": "US-01",
        "title": "Capture Personal Information",
        "narrative": "As a Customer Service Agent, I want to capture the member's personal details so that I can verify their identity.",
        "acceptanceCriteria": "Given I am a colleague working on a Pension Transfer Request case\nAnd I am on the Member Details screen\nThen make the following fields available:\n* **[Member ID]**\n* **[National Insurance Number]**\n* **[Marital Status]**\n* **[Spouse Name]**\n\n### Data Definitions\n| Label | Type | Mandatory | Logic | Options |\n|---|---|---|---|---|\n| Member ID | Text | Yes | - | - |\n| National Insurance | Text | Yes | - | - |\n| Marital Status | Dropdown | Yes | - | Single, Married, Divorced |\n| Spouse Name | Text | No | Visible if Marital Status = Married | - |",
        "dependencies": []
    },
    {
        "id": "US-02",
        "title": "Record Transfer Details",
        "narrative": "As a CSA, I want to record the ceding scheme details so that the transfer can be initiated.",
        "acceptanceCriteria": "Given I am a colleague working on a Pension Transfer Request case\nAnd I am on the Transfer Details screen\nThen make the following fields available:\n* **[Previous Scheme Name]**\n* **[Transfer Value]**\n\n### Data Definitions\n| Label | Type | Mandatory | Logic |\n|---|---|---|---|\n| Previous Scheme Name | Text | Yes | - |\n| Transfer Value | Currency | Yes | - |",
        "dependencies": ["US-01"]
    }
];

export const demoTestCases: TestCase[] = [
    {
        id: "TC-001",
        title: "Verify Successful Submission (Happy Path)",
        description: "Ensure user can complete transfer request with all mandatory fields.",
        preConditions: "User is on 'Member Details' stage.",
        steps: ["Enter 'MEM-123' in Member ID", "Select 'Single' in Marital Status", "Click Next", "Enter 'Scheme A' in Scheme Name", "Enter '1000' in Value", "Click Submit"],
        expectedResult: "Submission successful message displayed.",
        priority: "High",
        type: "Positive"
    },
    {
        id: "TC-002",
        title: "Validate Conditional Logic for Spouse Name",
        description: "Verify Spouse Name appears only when Married is selected.",
        preConditions: "User is on 'Member Details' stage.",
        steps: ["Select 'Single' - Check Spouse Name visibility", "Select 'Married' - Check Spouse Name visibility"],
        expectedResult: "Spouse Name hidden for Single, Visible for Married.",
        priority: "Medium",
        type: "Positive"
    }
];
export const demoTranscript = `
Speaker 1 (Business Analyst): "Okay, let's walk through the Pension Transfer In process. What's the first thing we need to capture?"
Speaker 2 (SME): "Well, we obviously need the member's details. Name, Member ID, and National Insurance number are mandatory."
Speaker 1: "Right. And marital status?"
Speaker 2: "Yes, that's important. If they are married, we absolutely need to capture the Spouse's Name. If they're single, we don't need it."
Speaker 1: "Got it. Conditional logic for Spouse Name. What about the source of the funds?"
Speaker 2: "We need the 'Previous Scheme Name' and the 'Transfer Value'. Oh, and compliance is cracking down on advice."
Speaker 1: "What do you mean?"
Speaker 2: "We need to know if they received financial advice. So, a radio button for 'Have you received financial advice?'. If they answer 'Yes', then we must capture the 'Advisor Name'. It's a mandatory field in that case."
Speaker 1: "Okay, so another conditional field. Advisor Name is visible and required only if Advice = Yes. Anything else?"
Speaker 2: "Just the standard declaration checkboxes at the end. But those are the main data points for the initial request."
Speaker 1: "Hold on, if they are transferring money in, don't we need their Bank Details? Or is it a direct transfer?"
Speaker 2: "Ah, good catch. We need a section for 'Bank Details' just in case we need to refund or pay out. We need 'Account Name', 'Sort Code', and 'Account Number'. All mandatory."
Speaker 1: "Okay, I'll add a Bank Details section with those three fields."
`;
