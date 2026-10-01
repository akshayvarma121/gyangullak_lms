import { describe, it, expect } from 'vitest';
import { brandConfig } from './index.js';

describe('brand config', () => {
  it('should have all feature names in both languages', () => {
    const features = Object.values(brandConfig.features);
    for (const feature of features) {
      if ('hi' in feature) {
        expect((feature as any).hi).toBeTruthy();
        expect((feature as any).en).toBeTruthy();
      } else {
        const nestedFeatures = Object.values(feature);
        for (const nested of nestedFeatures) {
          expect((nested as any).hi).toBeTruthy();
          expect((nested as any).en).toBeTruthy();
        }
      }
    }
  });

  it('should have productName in both languages', () => {
    expect(brandConfig.productName.hi).toBeTruthy();
    expect(brandConfig.productName.en).toBeTruthy();
  });
});
