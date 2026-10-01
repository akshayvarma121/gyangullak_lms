export type MasteryStatus = 'not_enough_data' | 'needs_attention' | 'needs_practice' | 'mastered';

export interface MasteryConfig {
  minAttempts: number;
  needsAttentionThreshold: number; // e.g. 0.5 (50%)
  masteryThreshold: number;        // e.g. 0.8 (80%)
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  minAttempts: 3,
  needsAttentionThreshold: 0.5,
  masteryThreshold: 0.8,
};

export interface MasteryResult {
  status: MasteryStatus;
  percentage: number;
}

/**
 * Pure function to calculate a student's mastery of a skill based on aggregate performance.
 * @param attempts Total attempts on quizzes in this skill
 * @param correct Total correct passes for quizzes in this skill
 * @param config Thresholds
 */
export function calculateMastery(
  attempts: number,
  correct: number,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): MasteryResult {
  if (attempts === 0) {
    return { status: 'not_enough_data', percentage: 0 };
  }

  const percentage = correct / attempts;

  if (attempts < config.minAttempts) {
    return { status: 'not_enough_data', percentage };
  }

  if (percentage >= config.masteryThreshold) {
    return { status: 'mastered', percentage };
  }

  if (percentage < config.needsAttentionThreshold) {
    return { status: 'needs_attention', percentage };
  }

  return { status: 'needs_practice', percentage };
}
