

import { Condition, ElementDefinition, SectionDefinition, FormState, Operator } from "../types";

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
      // Loose equality for string/number mixing
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

export const isElementVisible = (element: ElementDefinition, formData: FormState): boolean => {
  // Default to visible unless hidden is explicitly true
  let isVisible = !element.hidden;

  // If visibility conditions exist, they override the default
  if (element.visibilityConditions && element.visibilityConditions.length > 0) {
    // AND logic: All conditions must be true to show (simplification for this prototype)
    isVisible = element.visibilityConditions.every(cond => evaluateCondition(cond, formData));
  }

  return isVisible;
};

export const isSectionVisible = (section: SectionDefinition, formData: FormState): boolean => {
    // Default to visible unless hidden is explicitly true
    let isVisible = !section.hidden;
  
    // If visibility conditions exist, they override the default
    if (section.visibilityConditions && section.visibilityConditions.length > 0) {
      isVisible = section.visibilityConditions.every(cond => evaluateCondition(cond, formData));
    }
  
    return isVisible;
};

export const isElementRequired = (element: ElementDefinition, formData: FormState): boolean => {
  let isRequired = !!element.required;

  if (element.requiredConditions && element.requiredConditions.length > 0) {
    // If conditions met, it becomes required
    if (element.requiredConditions.every(cond => evaluateCondition(cond, formData))) {
      isRequired = true;
    }
  }

  return isRequired;
};

// Regex Patterns used for validation
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
  if (value === undefined || value === null || value === '') return null; // Empty handled by Required check

  const strVal = String(value);

  switch (element.validation.type) {
    case 'email':
      return VALIDATION_PATTERNS.email.test(strVal) ? null : 'Invalid email format';
    
    case 'phone_uk':
      // Basic UK phone regex (Mobile or Landline)
      return VALIDATION_PATTERNS.phone_uk.test(strVal.replace(/\s/g, '')) ? null : 'Invalid UK phone number';

    case 'nino_uk':
      // UK National Insurance Number
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
      // Custom validation logic cannot be fully simulated client-side without safe eval or specific parsing
      // For prototype purposes, we assume valid unless specific patterns match (simulated)
      return null; 
      
    default:
      return null;
  }
};