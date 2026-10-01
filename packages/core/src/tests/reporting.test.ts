import { generateReport } from '../reporting/generator';
import { describe, it, expect } from 'vitest';

describe('e-Report Generator', () => {
  it('should generate no activity report', () => {
    const report = generateReport({
      studentName: 'Aarav',
      quizCount: 0,
      pointsEarned: 0,
      strongSkill: null,
      weakSkill: null
    });

    expect(report.en).toMatchSnapshot();
    expect(report.hi).toMatchSnapshot();
    expect(report.en).toContain('did not complete any quizzes');
  });

  it('should generate report for one quiz', () => {
    const report = generateReport({
      studentName: 'Aarav',
      quizCount: 1,
      pointsEarned: 15,
      strongSkill: null,
      weakSkill: 'Fractions'
    });

    expect(report.en).toMatchSnapshot();
    expect(report.hi).toMatchSnapshot();
    expect(report.en).toContain('1 quizzes');
    expect(report.en).toContain('Fractions');
  });

  it('should generate perfect week report', () => {
    const report = generateReport({
      studentName: 'Aarav',
      quizCount: 5,
      pointsEarned: 100,
      strongSkill: 'Algebra',
      weakSkill: null
    });

    expect(report.en).toMatchSnapshot();
    expect(report.hi).toMatchSnapshot();
    expect(report.en).toContain('Algebra');
    expect(report.en).not.toContain('practice');
  });

  it('should generate all-weak topics report', () => {
    const report = generateReport({
      studentName: 'Aarav',
      quizCount: 3,
      pointsEarned: 20,
      strongSkill: null,
      weakSkill: 'Geometry'
    });

    expect(report.en).toMatchSnapshot();
    expect(report.hi).toMatchSnapshot();
    expect(report.en).toContain('Geometry');
  });
});
