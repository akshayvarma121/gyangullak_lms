import { describe, it, expect } from 'vitest';
import { calculateMastery, DEFAULT_MASTERY_CONFIG } from '../scoring/mastery.ts';

describe('calculateMastery', () => {
  it('should return not_enough_data if attempts are below minimum', () => {
    const result = calculateMastery(2, 0, DEFAULT_MASTERY_CONFIG);
    expect(result.status).toBe('not_enough_data');
    expect(result.percentage).toBe(0);
    
    // Even if 100% correct, if below min attempts, still not enough data
    const result2 = calculateMastery(2, 2, DEFAULT_MASTERY_CONFIG);
    expect(result2.status).toBe('not_enough_data');
    expect(result2.percentage).toBe(1);
  });

  it('should return mastered if percentage >= masteryThreshold', () => {
    // 4 correct out of 5 = 80% (which is >= 80%)
    const result = calculateMastery(5, 4, DEFAULT_MASTERY_CONFIG);
    expect(result.status).toBe('mastered');
    expect(result.percentage).toBe(0.8);
  });

  it('should return needs_attention if percentage < needsAttentionThreshold', () => {
    // 2 correct out of 5 = 40% (which is < 50%)
    const result = calculateMastery(5, 2, DEFAULT_MASTERY_CONFIG);
    expect(result.status).toBe('needs_attention');
    expect(result.percentage).toBe(0.4);
  });

  it('should return needs_practice if percentage is between thresholds', () => {
    // 3 correct out of 5 = 60% (which is >= 50% and < 80%)
    const result = calculateMastery(5, 3, DEFAULT_MASTERY_CONFIG);
    expect(result.status).toBe('needs_practice');
    expect(result.percentage).toBe(0.6);
  });

  it('should allow custom configuration', () => {
    const customConfig = {
      minAttempts: 5,
      needsAttentionThreshold: 0.4,
      masteryThreshold: 0.9,
    };

    // 4 out of 4 = 100%, but min attempts is 5
    expect(calculateMastery(4, 4, customConfig).status).toBe('not_enough_data');
    
    // 4 out of 5 = 80%, below 90% mastery threshold
    expect(calculateMastery(5, 4, customConfig).status).toBe('needs_practice');
    
    // 2 out of 5 = 40%, which is NOT < 40%, so it's needs_practice, wait.
    // percentage = 0.4, needsAttentionThreshold = 0.4.
    // if percentage < needsAttentionThreshold, then needs_attention. So 0.4 < 0.4 is false!
    expect(calculateMastery(5, 2, customConfig).status).toBe('needs_practice');

    // 1 out of 5 = 20%, < 40%
    expect(calculateMastery(5, 1, customConfig).status).toBe('needs_attention');
  });
});
