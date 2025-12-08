
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
  | 'static'
  | 'repeater'; // Added repeater type

export type Operator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';

export type ValidationType = 'none' | 'email' | 'phone_uk' | 'nino_uk' | 'date_future' | 'date_past' | 'custom';

export interface ValidationRule {
  type: ValidationType;
  customDescription?: string; 
}

export interface Condition {
  id?: string; // unique id for UI handling
  targetElementId: string;
  operator: Operator;
  value: string | number | boolean;
}

export type LogicOperator = 'AND' | 'OR';

export interface LogicGroup {
  id: string;
  operator: LogicOperator;
  conditions: Condition[];
  groups?: LogicGroup[]; // Recursive grouping for complex logic
}

// Operational Logic for Stages
export interface SkillRule {
  logic: LogicGroup; // Replaced simple condition with full logic group
  requiredSkill: string;
}

export interface RepeaterColumn {
  id: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'checkbox';
  options?: string[]; // For select types within the repeater
}

export interface ElementDefinition {
  id: string;
  label: string;
  type: ElementType;
  options?: string[]; 
  defaultValue?: string;
  description?: string; 
  
  // Repeater Configuration
  columns?: RepeaterColumn[];

  staticDataSource?: 'manual' | 'field';
  sourceFieldId?: string;

  // Logic
  hidden?: boolean; 
  visibility?: LogicGroup; // New structure (Root group)
  
  required?: boolean; 
  requiredLogic?: LogicGroup; // New structure

  // Validation
  validation?: ValidationRule;
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  layout?: '1col' | '2col' | '3col';
  variant?: 'standard' | 'summary'; 
  elements: ElementDefinition[];
  
  // Logic
  hidden?: boolean;
  visibility?: LogicGroup;
}

export interface StageDefinition {
  id: string;
  title: string;
  sections: SectionDefinition[];
  
  // Operational Context
  defaultSkill?: string; 
  skillLogic?: SkillRule[]; 
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  stages: StageDefinition[];
}

export interface FormState {
  [elementId: string]: any;
}

export interface VisualTheme {
  density: 'dense' | 'compact' | 'default' | 'spacious';
  radius: 'none' | 'small' | 'medium' | 'large';
}

export interface WorkshopSuggestion {
  id: string;
  type: 'add' | 'remove' | 'modify';
  description: string;
  reasoning: string;
  targetLabel?: string; 
  newElement?: {
    label: string;
    type: ElementType;
    sectionTitle?: string; 
  };
  updateData?: Partial<ElementDefinition>;
}

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

export type StoryStrategy = 'screen' | 'journey' | 'persona' | string;

export interface StrategyRecommendation {
  id: string;
  strategyName: string;
  strategyDescription: string; 
  pros: string[];
  cons: string[];
  estimatedCount: number;
  recommendationLevel: 'High' | 'Medium' | 'Low';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  recommendations?: StrategyRecommendation[];
}

export interface UserStory {
  id: string;
  title: string;
  narrative: string; 
  acceptanceCriteria: string; 
  dependencies?: string[]; 
}