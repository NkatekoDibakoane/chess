import { describe, expect, it } from 'vitest';
import { classifyDelta } from '../chess/analysis';

describe('classifyDelta', () => {
  it('labels small errors as ok', () => {
    expect(classifyDelta(0.1)).toBe('ok');
    expect(classifyDelta(-0.39)).toBe('ok');
  });

  it('labels inaccuracies between 0.4 and 1.0 pawns', () => {
    expect(classifyDelta(0.4)).toBe('inaccuracy');
    expect(classifyDelta(-0.9)).toBe('inaccuracy');
  });

  it('labels mistakes between 1.0 and 2.5 pawns', () => {
    expect(classifyDelta(1.2)).toBe('mistake');
    expect(classifyDelta(-2.0)).toBe('mistake');
  });

  it('labels blunders above 2.5 pawns', () => {
    expect(classifyDelta(3.0)).toBe('blunder');
    expect(classifyDelta(-5.5)).toBe('blunder');
  });
});
