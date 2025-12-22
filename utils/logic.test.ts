
import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateLogicGroup, evaluateCalculation } from './logic';
import { FormState, Condition, LogicGroup, CalculationPart } from '../types';

// Helper for testing
const checkCondition = (target: string, op: any, val: any, data: FormState): boolean => {
    return evaluateCondition({
        targetElementId: target,
        operator: op,
        value: val
    }, data);
};

describe('Logic Engine', () => {

    describe('checkCondition (Core Comparison)', () => {
        const formData: FormState = {
            'age': 25,
            'name': 'James',
            'role': 'Admin',
            'emptyField': '',
            'nullField': null,
            'score': 100
        };

        it('should handle "equals" correctly', () => {
            expect(checkCondition('age', 'equals', 25, formData)).toBe(true);
            expect(checkCondition('age', 'equals', 26, formData)).toBe(false);
            expect(checkCondition('name', 'equals', 'James', formData)).toBe(true);
            expect(checkCondition('name', 'equals', 'james', formData)).toBe(false); // Case sensitive default
        });

        it('should handle "notEquals" correctly', () => {
            expect(checkCondition('age', 'notEquals', 30, formData)).toBe(true);
            expect(checkCondition('role', 'notEquals', 'User', formData)).toBe(true);
        });

        it('should handle "greaterThan" / "lessThan" for numbers', () => {
            expect(checkCondition('age', 'greaterThan', 18, formData)).toBe(true);
            expect(checkCondition('age', 'greaterThan', 25, formData)).toBe(false); // Strict >
            expect(checkCondition('score', 'lessThan', 150, formData)).toBe(true);
        });

        it('should handle "contains" / "doesNotContain"', () => {
            expect(checkCondition('role', 'contains', 'Adm', formData)).toBe(true);
            expect(checkCondition('role', 'contains', 'User', formData)).toBe(false);
            expect(checkCondition('name', 'doesNotContain', 'X', formData)).toBe(true);
        });

        it('should handle "isEmpty" / "isNotEmpty"', () => {
            expect(checkCondition('emptyField', 'isEmpty', '', formData)).toBe(true);
            expect(checkCondition('age', 'isNotEmpty', '', formData)).toBe(true);
            expect(checkCondition('nullField', 'isEmpty', '', formData)).toBe(true);
        });
    });

    describe('Date Logic', () => {
        const formData: FormState = {
            'dob': '2000-01-01',
            'futureDate': '2500-01-01',
            'pastDate': '1990-01-01'
        };

        // Note: Real dates rely on "TODAY" which might shift.
        // We will test relative comparisons.

        it('should compare valid dates strings', () => {
            expect(checkCondition('dob', 'lessThan', '2010-01-01', formData)).toBe(true);
            expect(checkCondition('futureDate', 'greaterThan', '2024-01-01', formData)).toBe(true);
        });
    });

    describe('evaluateLogicGroup', () => {
        const formData: FormState = {
            'status': 'Active',
            'tier': 'Gold',
            'age': 30
        };

        it('should evaluate AND groups correctly', () => {
            const group: LogicGroup = {
                id: 'g1',
                operator: 'AND',
                conditions: [
                    { targetElementId: 'status', operator: 'equals', value: 'Active' },
                    { targetElementId: 'tier', operator: 'equals', value: 'Gold' }
                ]
            };
            expect(evaluateLogicGroup(group, formData)).toBe(true);

            // Break one
            const groupFail: LogicGroup = {
                id: 'g2',
                operator: 'AND',
                conditions: [
                    { targetElementId: 'status', operator: 'equals', value: 'Active' },
                    { targetElementId: 'tier', operator: 'equals', value: 'Silver' }
                ]
            };
            expect(evaluateLogicGroup(groupFail, formData)).toBe(false);
        });

        it('should evaluate OR groups correctly', () => {
            const group: LogicGroup = {
                id: 'g3',
                operator: 'OR',
                conditions: [
                    { targetElementId: 'status', operator: 'equals', value: 'Inactive' }, // False
                    { targetElementId: 'tier', operator: 'equals', value: 'Gold' } // True
                ]
            };
            expect(evaluateLogicGroup(group, formData)).toBe(true);
        });
    });
    describe('evaluateCalculation', () => {
        const formData: FormState = {
            'price': 100,
            'qty': 5,
            'taxRate': 0.2,
            'dob': '2000-01-01',
            'joinDate': '2020-01-01'
        };

        it('should perform basic arithmetic', () => {
            // price * qty
            const parts: CalculationPart[] = [
                { id: '1', type: 'field', value: 'price' },
                { id: '2', type: 'operator', value: '*' },
                { id: '3', type: 'field', value: 'qty' }
            ];
            expect(evaluateCalculation(parts, formData)).toBe(500);
        });

        it('should handle order of operations (sequential)', () => {
            // price * qty + 50 (Logic engine is simple sequential for now: ((100*5)+50) = 550)
            const parts: CalculationPart[] = [
                { id: '1', type: 'field', value: 'price' },
                { id: '2', type: 'operator', value: '*' },
                { id: '3', type: 'field', value: 'qty' },
                { id: '4', type: 'operator', value: '+' },
                { id: '5', type: 'constant', value: '50' }
            ];
            expect(evaluateCalculation(parts, formData)).toBe(550);
        });

        it('should calculate date difference in years', () => {
            // joinDate - dob = Age/Years
            // 2020 - 2000 = ~20 years
            const parts: CalculationPart[] = [
                { id: '1', type: 'field', value: 'joinDate' },
                { id: '2', type: 'operator', value: '-' },
                { id: '3', type: 'field', value: 'dob' }
            ];
            const result = evaluateCalculation(parts, formData);
            expect(result).toBe(20);
        });
    });
});
