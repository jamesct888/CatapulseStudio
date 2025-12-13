
export type ElementType = 
  | 'text' 
  | 'email'
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'datetime' 
  | 'currency' 
  | 'select' 
  | 'multiselect'
  | 'radio' 
  | 'checkbox' 
  | 'static'
  | 'repeater'; 

export type Operator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';

export type ValidationType = 'none' | 'email' | 'phone_uk' | 'nino_uk' | 'date_future' | 'date_past' | 'custom';

export interface ValidationRule {
  type: ValidationType;
  customDescription?: string; 
}

export interface Condition {
  id?: string; 
  targetElementId: string;
  operator: Operator;
  value: string | number | boolean;
}

export type LogicOperator = 'AND' | 'OR';

export interface LogicGroup {
  id: string;
  operator: LogicOperator;
  conditions: Condition[];
  groups?: LogicGroup[]; 
}

export interface SkillRule {
  logic: LogicGroup; 
  requiredSkill: string;
}

export interface RepeaterColumn {
  id: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'checkbox';
  options?: string[]; 
}

export interface DataMapping {
    dataObject: string; 
    property: string;   
}

export interface SelectOption {
    label: string;
    value: string;
}

export interface ElementDefinition {
  id: string;
  label: string;
  type: ElementType;
  // Strict typing for options to prevent [object Object] errors
  options?: (string | SelectOption)[]; 
  defaultValue?: string;
  description?: string; 
  
  columns?: RepeaterColumn[];

  staticDataSource?: 'manual' | 'field';
  sourceFieldId?: string;

  hidden?: boolean; 
  visibility?: LogicGroup; 
  
  required?: boolean; 
  requiredLogic?: LogicGroup; 

  validation?: ValidationRule;

  dataMapping?: DataMapping;
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  layout?: '1col' | '2col' | '3col';
  variant?: 'standard' | 'summary' | 'warning' | 'info'; 
  elements: ElementDefinition[];
  
  hidden?: boolean;
  visibility?: LogicGroup;
}

export interface StageDefinition {
  id: string;
  title: string;
  description?: string;
  sections: SectionDefinition[];
  
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
  mode: 'type1' | 'type2' | 'type3';
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

export interface DataObjectSuggestion {
    className: string;
    description: string;
    mappings: {
        elementId: string;
        suggestedProperty: string;
    }[];
}
