

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
                "visibilityConditions": [
                    {
                        "targetElementId": "maritalStatus",
                        "operator": "equals",
                        "value": "Married"
                    }
                ]
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
                        "visibilityConditions": [
                            {
                                "targetElementId": "hasAdvice",
                                "operator": "equals",
                                "value": "Yes"
                            }
                        ]
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
        "acceptanceCriteria": "Given I am a colleague working on a Pension Transfer Request case\nAnd I am on the Member Details screen\nThen make the following fields available:\n* **[Member ID]**\n* **[National Insurance Number]**\n* **[Marital Status]**\n* **[Spouse Name]**\n\n### Data Definitions\n| Label | Type | Mandatory | Logic | Options |\n|---|---|---|---|---|\n| Member ID | Text | Yes | - | - |\n| National Insurance | Text | Yes | - | - |\n| Marital Status | Dropdown | Yes | - | Single, Married, Divorced |\n| Spouse Name | Text | No | Visible if Marital Status = Married | - |"
    },
    {
        "id": "US-02",
        "title": "Record Transfer Details",
        "narrative": "As a CSA, I want to record the ceding scheme details so that the transfer can be initiated.",
        "acceptanceCriteria": "Given I am a colleague working on a Pension Transfer Request case\nAnd I am on the Transfer Details screen\nThen make the following fields available:\n* **[Previous Scheme Name]**\n* **[Transfer Value]**\n\n### Data Definitions\n| Label | Type | Mandatory | Logic |\n|---|---|---|---|\n| Previous Scheme Name | Text | Yes | - |\n| Transfer Value | Currency | Yes | - |"
    }
];

export const demoGherkin = `Feature: Pension Transfer Request

  Scenario: Happy Path - Member with Advice
    Given I am on "Member Details"
    When I fill "Member ID" with "MEM-123"
    And I select "Married" for "Marital Status"
    Then the field "Spouse Name" should be visible
    When I fill "Spouse Name" with "Jane"
    And I click Next
    Then I should be on "Transfer Details"
    When I select "Yes" for "Have you received financial advice?"
    Then the field "Advisor Name" should be visible`;

export const demoTranscript = `Workshop Transcript: Pension Transfer Process Review
Date: October 24, 2024
Attendees: Sarah (Ops Lead), Mike (Compliance), Dave (Product Owner)

Dave: Thanks for pulling up the prototype. Let's look at the "Personal Information" section first.
Sarah: I see "Member ID" at the top. We actually don't need the user to input that—it's passed from the login context. Can we remove it?
Dave: Good point. Less data entry is better.
Mike: I'm looking at the risk checks. We have "National Insurance Number" which is good, but we are missing "Date of Birth". We need to validate they aren't over 75.
Sarah: Agreed. Please add "Date of Birth" to the Personal Details section.
Dave: Moving to the "Transfer Details" stage...
Mike: regarding the "Transfer Value". If it's a large amount, say over £30,000, we have that new regulation where they must have taken advice.
Sarah: We have the radio button for "Have you received financial advice?".
Mike: Yes, but if they answer "Yes", we specifically need to capture the "Advisor Name" and their "FCA Reference Number". Can we make sure those fields appear?
Dave: Also, in the "Previous Scheme" section, can we change the label "Previous Scheme Name" to "Ceding Provider"? It's the industry standard term.
Sarah: One last thing, can we make "Transfer Value" mandatory? We can't process a quote without it.
`;

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