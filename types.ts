
export type ElementType = 
  | 'text' 
  | 'email'
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'currency' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'static';

export type Operator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';

export type ValidationType = 'none' | 'email' | 'phone_uk' | 'nino_uk' | 'date_future' | 'date_past' | 'custom';

export interface ValidationRule {
  type: ValidationType;
  customDescription?: string; // For "Must start with 'n'..."
}

export interface Condition {
  targetElementId: string;
  operator: Operator;
  value: string | number | boolean;
}

export interface ElementDefinition {
  id: string;
  label: string;
  type: ElementType;
  options?: string[]; // comma separated options for select/radio
  defaultValue?: string;
  description?: string; // Used for static text or tooltips
  
  // Static Element Configuration
  staticDataSource?: 'manual' | 'field';
  sourceFieldId?: string;

  // Logic
  hidden?: boolean; // Base state
  visibilityConditions?: Condition[]; // If met, show the element
  
  required?: boolean; // Base state
  requiredConditions?: Condition[]; // If met, element becomes required

  // Validation
  validation?: ValidationRule;
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  layout?: '1col' | '2col' | '3col';
  variant?: 'standard' | 'summary'; // New property for Sticky Footer sections
  elements: ElementDefinition[];
  
  // Logic
  hidden?: boolean;
  visibilityConditions?: Condition[];
}

export interface StageDefinition {
  id: string;
  title: string;
  sections: SectionDefinition[];
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  stages: StageDefinition[];
}

// Form Runtime State
export interface FormState {
  [elementId: string]: any;
}

// Visual Configuration
export interface VisualTheme {
  density: 'dense' | 'compact' | 'default' | 'spacious';
  radius: 'none' | 'small' | 'medium' | 'large';
}

// Workshop / AI Analysis
export interface WorkshopSuggestion {
  id: string;
  type: 'add' | 'remove' | 'modify';
  description: string;
  reasoning: string;
  
  // Action Payloads
  targetLabel?: string; // For finding the element to remove/modify
  
  // For 'add'
  newElement?: {
    label: string;
    type: ElementType;
    sectionTitle?: string; // Where to put it
  };
  
  // For 'modify'
  updateData?: Partial<ElementDefinition>;
}

// QA & Testing
export interface TestCase {
  id: string;
  title: string;
  description: string;
  preConditions: string;
  steps: string[];
  expectedResult: string;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Positive' | 'Negative' | 'Boundary' | 'Security';
}

export type StoryStrategy = 'screen' | 'journey' | 'persona';

export interface UserStory {
  id: string;
  title: string;
  narrative: string; // "As a... I want... So that..."
  acceptanceCriteria: string; // Markdown formatted GWT + Table
}
