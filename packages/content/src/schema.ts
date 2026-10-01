import { z } from 'zod';

const BilingualText = z.object({
  en: z
    .string()
    .min(1, 'English text cannot be empty')
    .max(1000, 'English text is too long'),
  hi: z
    .string()
    .min(1, 'Hindi text cannot be empty')
    .max(1000, 'Hindi text is too long'),
});

const SkillSchema = z.object({
  id: z.string().min(1),
  name: BilingualText,
});

const LessonSchema = z.object({
  id: z.string().min(1),
  title: BilingualText,
  content: z.object({
    en: z.string().min(1).max(5000, 'English lesson content is too long'),
    hi: z.string().min(1).max(5000, 'Hindi lesson content is too long'),
  }),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  text: BilingualText,
  options: z.array(BilingualText).length(4, 'Must have exactly 4 options'),
  correct_index: z
    .number()
    .int()
    .min(0)
    .max(3, 'Correct index must be between 0 and 3'),
  explanation: BilingualText,
  provenance: z.string().min(1, 'Provenance must be provided'),
  review_status: z.enum(['draft', 'reviewed']),
});

export const ChapterSchema = z.object({
  id: z.string().min(1),
  title: BilingualText,
  subject: z.string().min(1),
  class_level: z.number().int().positive(),
  skills: z.array(SkillSchema),
  lessons: z.array(LessonSchema),
  questions: z.array(QuestionSchema),
});

export type Chapter = z.infer<typeof ChapterSchema>;
export type Question = z.infer<typeof QuestionSchema>;
