




import { Condition, ElementDefinition, SectionDefinition, FormState, LogicGroup } from "../types";

export const generateId = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
};

export const evaluateCondition = (condition: Condition, formData: FormState): boolean => {
  let value = formData[condition.targetElementId];
  const targetValue = condition.value;

  // Normalize boolean values (from checkboxes) to strings for comparison with config values
  if (typeof value === 'boolean') {
      value = String(value);
  }

  // Handle Array Values (MultiSelect)
  if (Array.isArray(value)) {
      const targetStr = String(targetValue).trim();
      
      // Contains: Check if the array includes the target value
      if (condition.operator === 'contains') return value.map(String).includes(targetStr);
      
      // Is Empty / Is Not Empty checks
      if (condition.operator === 'isEmpty') return value.length === 0;
      if (condition.operator === 'isNotEmpty') return value.length > 0;
      
      // Equals: Strict check (array has exactly 1 element and it matches target)
      if (condition.operator === 'equals') return value.length === 1 && String(value[0]) === targetStr;
      
      // Not Equals: Check if the array does NOT include the target value
      if (condition.operator === 'notEquals') return !value.map(String).includes(targetStr);
      
      // Fallback for others
      return false;
  }

  // Robust string conversion for comparison (Handle numbers, booleans, and trimming)
  const valStr = String(value !== undefined && value !== null ? value : '').trim();
  const targetStr = String(targetValue !== undefined && targetValue !== null ? targetValue : '').trim();

  switch (condition.operator) {
    case 'equals':
      return valStr === targetStr;
    case 'notEquals':
      return valStr !== targetStr;
    case 'contains':
      return valStr.includes(targetStr);
    case 'greaterThan':
      return Number(value) > Number(targetValue);
    case 'lessThan':
      return Number(value) < Number(targetValue);
    case 'isEmpty':
      return value === undefined || value === '' || value === null || (Array.isArray(value) && value.length === 0);
    case 'isNotEmpty':
      return value !== undefined && value !== '' && value !== null && (!Array.isArray(value) || value.length > 0);
    default:
      return false;
  }
};

export const evaluateLogicGroup = (group: LogicGroup | undefined, formData: FormState): boolean => {
    if (!group || (!group.conditions.length && (!group.groups || !group.groups.length))) return true; // Empty group implies true

    // Evaluate all direct conditions
    const conditionsResult = group.conditions.map(c => evaluateCondition(c, formData));
    
    // Recursively evaluate subgroups
    const groupsResult = group.groups ? group.groups.map(g => evaluateLogicGroup(g, formData)) : [];

    const allResults = [...conditionsResult, ...groupsResult];

    if (group.operator === 'AND') {
        return allResults.every(r => r === true);
    } else { // OR
        return allResults.some(r => r === true);
    }
};

export const isElementVisible = (element: ElementDefinition, formData: FormState): boolean => {
  if (element.hidden) return false;
  // Backward compatibility check could go here if needed, but we updated types
  if (!element.visibility) return true;
  return evaluateLogicGroup(element.visibility, formData);
};

export const isSectionVisible = (section: SectionDefinition, formData: FormState): boolean => {
    if (section.hidden) return false;
    if (!section.visibility) return true;
    return evaluateLogicGroup(section.visibility, formData);
};

export const isElementRequired = (element: ElementDefinition, formData: FormState): boolean => {
  if (element.required) return true;
  if (!element.requiredLogic) return false;
  return evaluateLogicGroup(element.requiredLogic, formData);
};

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone_uk: /^(\+44|0)\d{9,10}$/,
  nino_uk: /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i
};

export const getValidationRegexString = (type: string): string | null => {
  switch (type) {
    case 'email': return String(VALIDATION_PATTERNS.email);
    case 'phone_uk': return String(VALIDATION_PATTERNS.phone_uk);
    case 'nino_uk': return String(VALIDATION_PATTERNS.nino_uk);
    default: return null;
  }
};

export const validateValue = (element: ElementDefinition, value: any): string | null => {
  if (!element.validation || element.validation.type === 'none') return null;
  if (value === undefined || value === null || value === '') return null; 

  const strVal = String(value);

  switch (element.validation.type) {
    case 'email':
      return VALIDATION_PATTERNS.email.test(strVal) ? null : 'Invalid email format';
    case 'phone_uk':
      return VALIDATION_PATTERNS.phone_uk.test(strVal.replace(/\s/g, '')) ? null : 'Invalid UK phone number';
    case 'nino_uk':
      return VALIDATION_PATTERNS.nino_uk.test(strVal.replace(/\s/g, '')) ? null : 'Invalid National Insurance Number';
    case 'date_future':
      const dFuture = new Date(strVal);
      if (isNaN(dFuture.getTime())) return 'Invalid date';
      return dFuture > new Date() ? null : 'Date must be in the future';
    case 'date_past':
      const dPast = new Date(strVal);
      if (isNaN(dPast.getTime())) return 'Invalid date';
      return dPast < new Date() ? null : 'Date must be in the past';
    case 'custom':
      return null; 
    default:
      return null;
  }
};

export const formatLogicSummary = (group: LogicGroup | undefined, allElements: {id: string, label: string}[]): string => {
    if (!group) return 'Always';
    if (group.conditions.length === 0 && (!group.groups || group.groups.length === 0)) return 'Always';

    const parts: string[] = [];

    group.conditions.forEach(c => {
        const el = allElements.find(e => e.id === c.targetElementId);
        const label = el ? el.label : 'Unknown Field';
        let op: string = c.operator;
        switch(c.operator) {
            case 'equals': op = '='; break;
            case 'notEquals': op = '!='; break;
            case 'greaterThan': op = '>'; break;
            case 'lessThan': op = '<'; break;
            case 'contains': op = 'contains'; break;
            case 'isEmpty': op = 'is empty'; break;
            case 'isNotEmpty': op = 'is populated'; break;
        }
        
        const val = (c.operator === 'isEmpty' || c.operator === 'isNotEmpty') ? '' : `'${c.value}'`;
        parts.push(`${label} ${op} ${val}`.trim());
    });

    if (group.groups && group.groups.length > 0) {
        group.groups.forEach(g => {
            const sub = formatLogicSummary(g, allElements);
            if(sub !== 'Always') parts.push(`(${sub})`);
        });
    }

    if (parts.length === 0) return 'Always';
    return parts.join(` ${group.operator} `);
};