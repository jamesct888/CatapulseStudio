
import { Condition, ElementDefinition, SectionDefinition, FormState, LogicGroup } from "../types";

export const generateId = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
};

export const evaluateCondition = (condition: Condition, formData: FormState): boolean => {
  const value = formData[condition.targetElementId];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      // eslint-disable-next-line eqeqeq
      return value == targetValue;
    case 'notEquals':
      // eslint-disable-next-line eqeqeq
      return value != targetValue;
    case 'contains':
      return String(value || '').includes(String(targetValue));
    case 'greaterThan':
      return Number(value) > Number(targetValue);
    case 'lessThan':
      return Number(value) < Number(targetValue);
    case 'isEmpty':
      return value === undefined || value === '' || value === null;
    case 'isNotEmpty':
      return value !== undefined && value !== '' && value !== null;
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
