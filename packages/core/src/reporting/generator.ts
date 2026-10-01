import { reportTemplates } from './templates';

export interface StudentWeekData {
  studentName: string;
  quizCount: number;
  pointsEarned: number;
  strongSkill: string | null;
  weakSkill: string | null;
}

export function generateReport(data: StudentWeekData): { en: string, hi: string } {
  if (data.quizCount === 0) {
    return {
      en: `${reportTemplates.greeting.en.replace('{studentName}', data.studentName)} ${reportTemplates.noActivity.en}`,
      hi: `${reportTemplates.greeting.hi.replace('{studentName}', data.studentName)} ${reportTemplates.noActivity.hi}`
    };
  }

  const enParts = [
    reportTemplates.greeting.en.replace('{studentName}', data.studentName),
    reportTemplates.summary.en.replace('{quizCount}', data.quizCount.toString()).replace('{pointsEarned}', data.pointsEarned.toString())
  ];

  const hiParts = [
    reportTemplates.greeting.hi.replace('{studentName}', data.studentName),
    reportTemplates.summary.hi.replace('{quizCount}', data.quizCount.toString()).replace('{pointsEarned}', data.pointsEarned.toString())
  ];

  if (data.strongSkill) {
    enParts.push(reportTemplates.strength.en.replace('{skillName}', data.strongSkill));
    hiParts.push(reportTemplates.strength.hi.replace('{skillName}', data.strongSkill));
  }

  if (data.weakSkill) {
    enParts.push(reportTemplates.practice.en.replace('{skillName}', data.weakSkill));
    hiParts.push(reportTemplates.practice.hi.replace('{skillName}', data.weakSkill));
  }

  enParts.push(reportTemplates.suggestion.en);
  hiParts.push(reportTemplates.suggestion.hi);

  return {
    en: enParts.join('\n\n'),
    hi: hiParts.join('\n\n')
  };
}
