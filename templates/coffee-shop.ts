
import { ProcessDefinition } from '../types';

export const coffeeShopProcess: ProcessDefinition = {
    id: "template-coffee-shop",
    name: "Morning Brew Order",
    description: "A simple, visual ordering app demonstrating conditional visibility and UX choices.",
    stages: [
        {
            id: "stg-drink",
            title: "Choose Your Drink",
            description: "What can we get you?",
            sections: [
                {
                    id: "sec-base",
                    title: "Base Selection",
                    layout: "1col",
                    elements: [
                        {
                            id: "drink-type",
                            label: "What kind of drink?",
                            type: "radio",
                            options: ["Coffee", "Tea", "Hot Chocolate", "Smoothie"],
                            required: true
                        },
                        {
                            id: "coffee-roast",
                            label: "Roast Preference",
                            type: "select",
                            options: ["Light Roast", "Medium Roast", "Dark Italian"],
                            visibility: {
                                id: "vis-rest",
                                operator: "AND",
                                conditions: [{ targetElementId: "drink-type", operator: "equals", value: "Coffee" }]
                            }
                        }
                    ]
                }
            ]
        },
        {
            id: "stg-custom",
            title: "Customization",
            description: "Make it yours",
            sections: [
                {
                    id: "sec-milk",
                    title: "Milk & Sugar",
                    // Hide this section if they ordered a Smoothie
                    hidden: true,
                    visibility: {
                        id: "vis-not-smoothie",
                        operator: "AND",
                        conditions: [{ targetElementId: "drink-type", operator: "notEquals", value: "Smoothie" }]
                    },
                    layout: "2col",
                    elements: [
                        {
                            id: "milk-opt",
                            label: "Milk Choice",
                            type: "select",
                            options: ["Whole Milk", "Oat Milk (+ $0.50)", "Almond Milk", "Soy Milk"]
                        },
                        {
                            id: "sugar-opt",
                            label: "Sweetener",
                            type: "select",
                            options: ["None", "1 Sugar", "2 Sugars", "Honey", "Stevia"]
                        }
                    ]
                },
                {
                    id: "sec-extras",
                    title: "Extras",
                    layout: "3col",
                    elements: [
                        {
                            id: "extra-whip",
                            label: "Whipped Cream?",
                            type: "checkbox"
                        },
                        {
                            id: "extra-shot",
                            label: "Extra Shot?",
                            type: "checkbox"
                        },
                        {
                            id: "customer-name",
                            label: "Name for the Cup",
                            type: "text",
                            required: true,
                            description: "So we don't yell the wrong name!"
                        }
                    ]
                }
            ]
        }
    ]
};
