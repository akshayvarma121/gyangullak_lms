import { describe, it, expect } from 'vitest';
import { scoreAttempt, ScoringConfig, QuestionAnswer } from './index.ts';

describe('scoreAttempt', () => {
  const config: ScoringConfig = {
    pass_mark_percent: 70,
    base_points: 10,
    reattempt_points: 2,
  };

  const questions: QuestionAnswer[] = [
    { question_id: 'q1', correct_option: 'A' },
    { question_id: 'q2', correct_option: 'B' },
    { question_id: 'q3', correct_option: 'C' },
  ];

  it('should score 100% and base points for all correct first pass', () => {
    const answers = { q1: 'A', q2: 'B', q3: 'C' };
    const res = scoreAttempt(questions, answers, config, true);

    expect(res.correct).toBe(3);
    expect(res.total).toBe(3);
    expect(res.percent).toBe(100);
    expect(res.passed).toBe(true);
    expect(res.pointsEarned).toBe(10);
  });

  it('should give reattempt points for passed reattempt', () => {
    const answers = { q1: 'A', q2: 'B', q3: 'C' };
    const res = scoreAttempt(questions, answers, config, false);

    expect(res.passed).toBe(true);
    expect(res.pointsEarned).toBe(2);
  });

  it('should give 0 points for failed attempt', () => {
    const answers = { q1: 'A', q2: 'Wrong', q3: 'Wrong' };
    const res = scoreAttempt(questions, answers, config, true);

    expect(res.correct).toBe(1);
    expect(res.passed).toBe(false);
    expect(res.pointsEarned).toBe(0);
  });

  it('should handle zero questions', () => {
    const res = scoreAttempt([], {}, config, true);
    expect(res.percent).toBe(0);
    expect(res.passed).toBe(false);
    expect(res.pointsEarned).toBe(0);
  });
});
