import { describe, it, expect } from 'vitest';
import { brandConfig } from './index.js';

describe('brand config', () => {
  it('should have all feature names in both languages', () => {
    const features = Object.values(brandConfig.features);
    for (const feature of features) {
      expect(feature.hi).toBeTruthy();
      expect(feature.en).toBeTruthy();
    }
  });

  it('should have productName in both languages', () => {
    expect(brandConfig.productName.hi).toBeTruthy();
    expect(brandConfig.productName.en).toBeTruthy();
  });
});
