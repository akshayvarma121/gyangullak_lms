import { describe, it, expect } from 'vitest';
import { validateChapter } from '../src/validator.js';

const validYaml = `
id: ch-valid
title:
  en: Valid
  hi: मान्य
subject: Math
class_level: 8
skills:
  - id: sk-1
    name:
      en: Skill 1
      hi: कौशल 1
lessons:
  - id: les-1
    title:
      en: Lesson 1
      hi: पाठ 1
    content:
      en: Content 1
      hi: सामग्री 1
questions:
  - id: q-1
    skill: sk-1
    difficulty: easy
    text:
      en: Question
      hi: प्रश्न
    options:
      - en: Opt 1
        hi: विकल्प 1
      - en: Opt 2
        hi: विकल्प 2
      - en: Opt 3
        hi: विकल्प 3
      - en: Opt 4
        hi: विकल्प 4
    correct_index: 0
    explanation:
      en: Expl
      hi: स्पष्टीकरण
    provenance: "Test"
    review_status: draft
`;

describe('Validator', () => {
  it('passes valid yaml', () => {
    const result = validateChapter(validYaml);
    expect(result.success).toBe(true);
  });

  it('catches missing Hindi', () => {
    const yaml = validYaml.replace(/hi: प्रश्न/g, '');
    const result = validateChapter(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) =>
          e.includes('expected string, received undefined'),
        ),
      ).toBe(true);
    }
  });

  it('catches two correct answers (schema allows only one correct_index, so it catches type error if we try to put array)', () => {
    const yaml = validYaml.replace('correct_index: 0', 'correct_index: [0, 1]');
    const result = validateChapter(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('correct_index'))).toBe(true);
    }
  });

  it('catches duplicate id', () => {
    const yaml = validYaml.replace('id: sk-1', 'id: q-1');
    const result = validateChapter(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) => e.includes('Duplicate ID found: q-1')),
      ).toBe(true);
    }
  });

  it('catches unknown skill', () => {
    const yaml = validYaml.replace('skill: sk-1', 'skill: unknown-sk');
    const result = validateChapter(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((e) => e.includes('unknown skill: unknown-sk')),
      ).toBe(true);
    }
  });
});
