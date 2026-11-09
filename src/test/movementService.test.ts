import { describe, it, expect } from 'vitest';
import { calculateNewStock } from '../services/movementService';

describe('Stock Movement Logic', () => {
  it('calculates stock entry correctly', () => {
    const result = calculateNewStock(10, 5, 'IN');
    expect(result.newQuantity).toBe(15);
    expect(result.isNegative).toBe(false);
  });

  it('calculates stock exit and detects negative stock warning', () => {
    const result = calculateNewStock(5, 8, 'OUT');
    expect(result.newQuantity).toBe(-3);
    expect(result.isNegative).toBe(true);
  });

  it('calculates normal stock exit without negative warning', () => {
    const result = calculateNewStock(20, 5, 'OUT');
    expect(result.newQuantity).toBe(15);
    expect(result.isNegative).toBe(false);
  });
});
