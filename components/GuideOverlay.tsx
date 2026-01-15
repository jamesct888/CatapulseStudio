import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export type DemoStep = 'NONE' | 'WELCOME' | 'EDITOR_OVERVIEW' | 'PROPERTIES_INTRO' | 'PROPERTIES_STAGE' | 'PROPERTIES_STAGE_LOGIC_SKIP' | 'PROPERTIES_STAGE_ROUTING' | 'PROPERTIES_SECTION' | 'PROPERTIES_SECTION_LAYOUT' | 'PROPERTIES_SECTION_STYLE' | 'PROPERTIES_SECTION_VISIBILITY' | 'PROPERTIES_ELEMENT' | 'PROPERTIES_ELEMENT_TYPE' | 'PROPERTIES_ELEMENT_OPTIONS' | 'PROPERTIES_ELEMENT_LOGIC_INTRO' | 'PROPERTIES_ELEMENT_VISIBILITY' | 'PROPERTIES_ELEMENT_MANDATORY' | 'PROPERTIES_ELEMENT_VALIDATION' | 'AI_FEATURES' | 'HEADER_INTRO' | 'HEADER_WORKSHOP' | 'HEADER_NEW' | 'HEADER_UPLOAD' | 'HEADER_DOWNLOAD' | 'HEADER_SHARE' | 'HEADER_RENAME' | 'HEADER_SETTINGS' | 'MODES' | 'MODE_TABLE' | 'MODE_FLOW' | 'PREVIEW_MODE' | 'MODE_SPEC' | 'QA_MODE' | 'QA_TAB_STORIES' | 'QA_TAB_DICTIONARY' | 'QA_TAB_CASES' | 'PEGA_MODE' | 'COMPLETE';

interface GuideOverlayProps {
    step: DemoStep;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

interface StepConfig {
    title: string;
    description: string;
    targetId?: string; // ID of the element to highlight
    secondaryTargetId?: string; // Optional secondary highlight (e.g. sidebar item)
    position: 'center' | 'top' | 'right' | 'bottom' | 'left';
}

const STEPS: Record<DemoStep, StepConfig> = {
    'NONE': { title: '', description: '', position: 'center' },
    'WELCOME': {
        title: "Welcome to Catapulse Studio",
        description: "Let's take a quick tour to show you how to build powerful process applications.",
        position: 'center'
    },
    'EDITOR_OVERVIEW': {
        title: "The Process Structure",
        description: "This is where you define your flow. It's organized into Stages (top level) and Sections (the forms).",
        targetId: 'sidebar-structure',
        position: 'right'
    },
    'PROPERTIES_INTRO': {
        title: "Properties Panel",
        description: "This panel is context-sensitive. It updates to show settings for whatever you select in the structure.",
        targetId: 'properties-panel-container',
        position: 'left'
    },

    // --- STAGE CONTEXT ---
    'PROPERTIES_STAGE': {
        title: "Stage Context",
        description: "We've selected the 'Member Details' Stage. Here you can edit the Title and see the System ID.",
        targetId: 'properties-panel-container',
        secondaryTargetId: 'stage-stg_details',
        position: 'left'
    },
    'PROPERTIES_STAGE_LOGIC_SKIP': {
        title: "Skip Logic",
        description: "Switching to the 'Logic' tab, you can set conditions to completely skip this stage if it's not needed.",
        targetId: 'prop-stage-skip',
        secondaryTargetId: 'stage-stg_details',
        position: 'left'
    },
    'PROPERTIES_STAGE_ROUTING': {
        title: "Routing & Assignments",
        description: "You can also define which teams or skills are required to complete this stage (e.g. 'Senior Underwriter').",
        targetId: 'prop-stage-routing',
        secondaryTargetId: 'stage-stg_details',
        position: 'left'
    },

    // --- SECTION CONTEXT ---
    'PROPERTIES_SECTION': {
        title: "Section Context",
        description: "Now looking at the 'Personal Information' Section. You can change the Title and basic settings here.",
        targetId: 'properties-panel-container',
        secondaryTargetId: 'section-sec_personal',
        position: 'left'
    },
    'PROPERTIES_SECTION_LAYOUT': {
        title: "Layout Options",
        description: "Need more space? Switch between 1, 2, or 3 column layouts for your fields.",
        targetId: 'prop-section-layout',
        secondaryTargetId: 'section-sec_personal',
        position: 'left'
    },
    'PROPERTIES_SECTION_STYLE': {
        title: "Visual Style",
        description: "You can also change the section style to 'Info' (Blue), 'Warning' (Amber), or 'Summary' (Gray) boxes.",
        targetId: 'prop-section-style',
        secondaryTargetId: 'section-sec_personal',
        position: 'left'
    },
    'PROPERTIES_SECTION_VISIBILITY': {
        title: "Section Visibility",
        description: "Like stages, entire sections can be hidden dynamically using rules in the Logic tab.",
        targetId: 'prop-logic-visibility', // Generic visibility ID works as it's the only one shown in section context
        secondaryTargetId: 'section-sec_personal',
        position: 'left'
    },

    // --- ELEMENT CONTEXT ---
    'PROPERTIES_ELEMENT': {
        title: "Element Context",
        description: "Finally, clicking the 'Member ID' Element sends us to the General settings tab. Here you can change the Label name.",
        targetId: 'properties-panel-container',
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_TYPE': {
        title: "Field Type",
        description: "The 'Field Type' dropdown lets you change this from a Text Box to a Number, Date Picker, or Select list.",
        targetId: 'prop-type', // Highlight specific input
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_OPTIONS': {
        title: "Field Options",
        description: "Depending on the type, you can set Placeholders, default values, or list options (for Dropdowns).",
        targetId: 'prop-element-options',
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_LOGIC_INTRO': {
        title: "Logic & Rules",
        description: "Let's switch to the 'Logic' tab. This is where you configure dynamic behavior.",
        targetId: 'prop-tabs', // Highlight tab bar
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_VISIBILITY': {
        title: "Visibility Rules",
        description: "Set conditions for when this field should be shown or hidden based on other data.",
        targetId: 'prop-logic-visibility',
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_MANDATORY': {
        title: "Mandatory Rules",
        description: "Define when this field is required. It can be always required, or only under certain conditions.",
        targetId: 'prop-logic-mandatory',
        secondaryTargetId: 'memberId',
        position: 'left'
    },
    'PROPERTIES_ELEMENT_VALIDATION': {
        title: "Validation Rules",
        description: "Add specific validation checks (e.g. min/max values, regex patterns) to ensure data quality.",
        targetId: 'prop-logic-validation',
        secondaryTargetId: 'memberId',
        position: 'left'
    },

    'AI_FEATURES': {
        title: "AI Copilot",
        description: "Stuck? Just describe what you need here. The AI can generate fields, user stories, and more.",
        targetId: 'sidebar-copilot',
        position: 'right'
    },
    // --- TOP BAR CONTROLS ---
    'HEADER_INTRO': {
        title: "Project Controls",
        description: "The top bar gives you powerful tools to manage your project file and workflow.",
        targetId: 'header-modes', // Anchor near top
        position: 'bottom'
    },
    'HEADER_WORKSHOP': {
        title: "Workshop Mode",
        description: "Analyze meeting transcripts to automatically suggest improvements and identify missing requirements.",
        targetId: 'btn-workshop',
        position: 'bottom'
    },
    'HEADER_NEW': {
        title: "New Project",
        description: "Need a fresh start? Click here to create a new project. (Warns you about unsaved changes first).",
        targetId: 'btn-new-project',
        position: 'bottom'
    },
    'HEADER_UPLOAD': {
        title: "Upload Project",
        description: "Load an existing Catapulse JSON file from your computer to continue working.",
        targetId: 'btn-upload',
        position: 'bottom'
    },
    'HEADER_DOWNLOAD': {
        title: "Save Project",
        description: "Download your current work as a JSON file. The icon pulses amber if you have unsaved changes.",
        targetId: 'btn-download',
        position: 'bottom'
    },
    'HEADER_SHARE': {
        title: "Share Prototype",
        description: "Export a standalone HTML file of your prototype. Perfect for sharing with stakeholders who don't have the Studio.",
        targetId: 'btn-share',
        position: 'bottom'
    },
    'HEADER_RENAME': {
        title: "Process Name",
        description: "Click here to rename your process definition at any time.",
        targetId: 'header-process-name',
        position: 'bottom'
    },
    'HEADER_SETTINGS': {
        title: "Settings & Layout",
        description: "Toggle the right-side panel to access global settings or adjust your view.",
        targetId: 'btn-settings',
        position: 'left'
    },

    'MODES': {
        title: "Project Modes",
        description: "Your project isn't just a form. Catapulse Studio provides multiple views to manage your data, logic, and output.",
        targetId: 'header-modes',
        position: 'bottom'
    },
    // --- NEW MODES ---
    'MODE_TABLE': {
        title: "Grid View",
        description: "The Grid View lets you visualize your process data structure in a tabular format, making it easier to review field definitions.",
        targetId: 'nav-table',
        position: 'bottom'
    },
    'MODE_FLOW': {
        title: "Flow View",
        description: "Visualize the journey. The Flow View shows how stages, sections, and steps connect sequentially.",
        targetId: 'nav-flow',
        position: 'bottom'
    },
    'PREVIEW_MODE': {
        title: "Interactive Preview",
        description: "Test your form exactly as an end-user would see it. Try filling in some data to verify your logic.",
        targetId: 'nav-preview',
        position: 'bottom'
    },
    'MODE_SPEC': {
        title: "Specification",
        description: "A generated documentation view of your entire process, perfect for sharing with stakeholders.",
        targetId: 'nav-spec',
        position: 'bottom'
    },

    // --- QA DEEP DIVE ---
    'QA_MODE': {
        title: "Quality Assurance",
        description: "This mode is your testing hub. It automatically generates User Stories and Test Cases from your design.",
        targetId: 'nav-qa',
        position: 'bottom'
    },
    'QA_TAB_STORIES': {
        title: "User Stories",
        description: "AI generates Agile User Stories based on your sections and fields. You can export these to Jira.",
        targetId: 'tab-qa-stories',
        position: 'bottom'
    },
    'QA_TAB_DICTIONARY': {
        title: "Data Dictionary",
        description: "A consolidated list of all data elements used across your process, useful for database design.",
        targetId: 'tab-qa-dictionary',
        position: 'bottom'
    },
    'QA_TAB_CASES': {
        title: "Test Cases",
        description: "Manual test steps generated to verify your acceptance criteria. Ensuring everything works before deployment.",
        targetId: 'tab-qa-cases',
        position: 'bottom'
    },

    'PEGA_MODE': {
        title: "Pega Blueprint",
        description: "Finally, export your design directly to Pega Blueprint format for enterprise implementation. No lock-in!",
        targetId: 'nav-pega',
        position: 'bottom'
    },
    'COMPLETE': {
        title: "You're Ready!",
        description: "That's the basics. You can now explore the current 'Pension Transfer' process or start a new one.",
        position: 'center'
    }
};

export const GuideOverlay: React.FC<GuideOverlayProps> = ({ step, onNext, onPrev, onSkip }) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [secondaryRect, setSecondaryRect] = useState<DOMRect | null>(null);
    const config = STEPS[step];

    useEffect(() => {
        if (config.targetId) {
            const el = document.getElementById(config.targetId);
            if (el) {
                setTargetRect(el.getBoundingClientRect());
            } else {
                setTargetRect(null); // Fallback if element not found
            }
        } else {
            setTargetRect(null);
        }

        if (config.secondaryTargetId) {
            // Small timeout to allow potential expansions (like accordions) to animate
            setTimeout(() => {
                const el = document.getElementById(config.secondaryTargetId!);
                if (el) {
                    setSecondaryRect(el.getBoundingClientRect());
                } else {
                    setSecondaryRect(null);
                }
            }, 100);
        } else {
            setSecondaryRect(null);
        }
    }, [step, config.targetId, config.secondaryTargetId]);

    if (step === 'NONE') return null;

    // Calculate Popover Position
    const getPopoverStyle = () => {
        if (!targetRect || config.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const padding = 20;
        // Simple positioning logic
        if (config.position === 'left') {
            return {
                top: targetRect.top + targetRect.height / 2,
                right: window.innerWidth - targetRect.left + padding,
                transform: 'translateY(-50%)',
            };
        }
        if (config.position === 'bottom') {
            return {
                top: targetRect.bottom + padding,
                left: targetRect.left + targetRect.width / 2,
                transform: 'translateX(-50%)',
            };
        }
        if (config.position === 'right') {
            return {
                top: targetRect.top + targetRect.height / 2,
                left: targetRect.right + padding,
                transform: 'translateY(-50%)',
            };
        }
        // Default top
        return {
            bottom: window.innerHeight - targetRect.top + padding,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translateX(-50%)',
        };
    };

    const getClipPath = () => {
        let path = 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%';

        if (targetRect) {
            path += `, ${targetRect.left}px 0%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 0%`;
        }

        if (secondaryRect) {
            path += `, ${secondaryRect.left}px 0%, ${secondaryRect.left}px ${secondaryRect.top}px, ${secondaryRect.right}px ${secondaryRect.top}px, ${secondaryRect.right}px ${secondaryRect.bottom}px, ${secondaryRect.left}px ${secondaryRect.bottom}px, ${secondaryRect.left}px 0%`;
        }

        path += ')';
        return path;
    };

    return (
        <div className="fixed inset-0 z-[9999] isolate pointer-events-auto">
            {/* Backdrop with "Hole" (Spotlight) */}
            <div className="absolute inset-0 bg-black/50 transition-all duration-500 ease-in-out"
                style={{
                    clipPath: getClipPath()
                }}
            />

            {/* Target Highlight Border (Primary) */}
            {targetRect && (
                <div
                    className="absolute border-2 border-sw-teal rounded-lg shadow-[0_0_20px_rgba(20,184,166,0.5)] pointer-events-none transition-all duration-300"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                    }}
                />
            )}

            {/* Secondary Target Highlight (Just Border, now in spotlight) */}
            {secondaryRect && (
                <div
                    className="absolute border-2 border-dashed border-sw-teal rounded-lg pointer-events-none transition-all duration-300"
                    style={{
                        top: secondaryRect.top - 2,
                        left: secondaryRect.left - 2,
                        width: secondaryRect.width + 4,
                        height: secondaryRect.height + 4,
                    }}
                />
            )}

            {/* Popover Card */}
            <div
                className="absolute w-96 bg-white rounded-xl shadow-2xl p-6 border border-gray-100 transition-all duration-500"
                style={getPopoverStyle()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-serif font-bold text-sw-teal">{config.title}</h3>
                    <button onClick={onSkip} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    {config.description}
                </p>

                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                        {step === 'COMPLETE' ? 'Finish' : 'Next Step'}
                    </span>
                    <div className="flex gap-2">
                        {step !== 'WELCOME' && (
                            <button
                                onClick={onPrev}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="bg-sw-teal hover:bg-sw-tealHover text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all transform hover:scale-105"
                        >
                            {step === 'COMPLETE' ? 'Get Started' : 'Next'}
                            {step === 'COMPLETE' ? <Check size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
