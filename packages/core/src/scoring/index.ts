export interface ScoringConfig {
  pass_mark_percent: number;
  base_points: number;
  reattempt_points: number;
}

export interface QuestionAnswer {
  question_id: string;
  correct_option: string;
}

export interface ScoreResult {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  pointsEarned: number;
}

export function scoreAttempt(
  questions: QuestionAnswer[],
  answers: Record<string, string>,
  config: ScoringConfig,
  isFirstPass: boolean,
): ScoreResult {
  let correct = 0;
  for (const q of questions) {
    if (answers[q.question_id] === q.correct_option) {
      correct++;
    }
  }

  const total = questions.length;
  const percent = total > 0 ? (correct / total) * 100 : 0;
  const passed = percent >= config.pass_mark_percent;

  let pointsEarned = 0;
  if (passed) {
    pointsEarned = isFirstPass ? config.base_points : config.reattempt_points;
  }

  return {
    correct,
    total,
    percent,
    passed,
    pointsEarned,
  };
}
