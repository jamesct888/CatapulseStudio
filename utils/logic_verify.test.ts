
import { describe, it, expect } from 'vitest';
import { evaluateCalculation } from './logic';
import { FormState, CalculationPart } from '../types';

describe('Logic Engine - Calculation Parser', () => {
    const formData: FormState = {
        'price': 10,
        'qty': 5,
        'tax': 2,
        'dob': '2000-01-01',
        'joinDate': '2010-01-01' // 10 years later
    };

    it('should handle simple arithmetic', () => {
        // 10 + 5 = 15
        const parts: CalculationPart[] = [
            { id: '1', type: 'field', value: 'price' },
            { id: '2', type: 'operator', value: '+' },
            { id: '3', type: 'field', value: 'qty' }
        ];
        expect(evaluateCalculation(parts, formData)).toBe(15);
    });

    it('should respect order of operations (multiplication before addition)', () => {
        // 10 + 5 * 2 = 20 (not 30)
        const parts: CalculationPart[] = [
            { id: '1', type: 'field', value: 'price' },
            { id: '2', type: 'operator', value: '+' },
            { id: '3', type: 'field', value: 'qty' },
            { id: '4', type: 'operator', value: '*' },
            { id: '5', type: 'field', value: 'tax' }
        ];
        expect(evaluateCalculation(parts, formData)).toBe(20);
    });

    it('should respect brackets', () => {
        // (10 + 5) * 2 = 30
        const parts: CalculationPart[] = [
            { id: '0', type: 'operator', value: '(' },
            { id: '1', type: 'field', value: 'price' },
            { id: '2', type: 'operator', value: '+' },
            { id: '3', type: 'field', value: 'qty' },
            { id: '4', type: 'operator', value: ')' },
            { id: '5', type: 'operator', value: '*' },
            { id: '6', type: 'field', value: 'tax' }
        ];
        expect(evaluateCalculation(parts, formData)).toBe(30);
    });

    it('should handle nested brackets', () => {
        // ((10 + 5) * 2) / 2 = 15
        const parts: CalculationPart[] = [
            { id: '0', type: 'operator', value: '(' },
            { id: '1', type: 'operator', value: '(' },
            { id: '2', type: 'field', value: 'price' },
            { id: '3', type: 'operator', value: '+' },
            { id: '4', type: 'field', value: 'qty' },
            { id: '5', type: 'operator', value: ')' },
            { id: '6', type: 'operator', value: '*' },
            { id: '7', type: 'field', value: 'tax' },
            { id: '8', type: 'operator', value: ')' },
            { id: '9', type: 'operator', value: '/' },
            { id: '10', type: 'constant', value: '2' }
        ];
        expect(evaluateCalculation(parts, formData)).toBe(15);
    });

    it('should preserve existing Date subtraction logic (Age)', () => {
        // joinDate - dob = 10 (years approx)
        const parts: CalculationPart[] = [
            { id: '1', type: 'field', value: 'joinDate' },
            { id: '2', type: 'operator', value: '-' },
            { id: '3', type: 'field', value: 'dob' }
        ];
        expect(evaluateCalculation(parts, formData)).toBe(10);
    });
});
