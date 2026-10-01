import { parse } from 'yaml';
import { ChapterSchema, Chapter } from './schema.js';

export function validateChapter(
  yamlContent: string,
): { success: true; data: Chapter } | { success: false; errors: string[] } {
  let parsedContent: unknown;
  try {
    parsedContent = parse(yamlContent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [`YAML parsing error: ${message}`] };
  }

  const result = ChapterSchema.safeParse(parsedContent);
  if (!result.success) {
    const errors = result.error.issues.map(
      (err) => `${err.path.join('.')}: ${err.message}`,
    );
    return { success: false, errors };
  }

  const data = result.data;
  const errors: string[] = [];

  // 1. Ids must be unique within the chapter
  const allIds = new Set<string>();
  const addId = (id: string, context: string) => {
    if (allIds.has(id)) {
      errors.push(`Duplicate ID found: ${id} in ${context}`);
    } else {
      allIds.add(id);
    }
  };

  addId(data.id, 'chapter');
  data.skills.forEach((s) => {
    addId(s.id, 'skills');
  });
  data.lessons.forEach((l) => {
    addId(l.id, 'lessons');
  });
  data.questions.forEach((q) => {
    addId(q.id, 'questions');
  });

  // 2. Skills exist (question skill must be in chapter skills list)
  const skillIds = new Set(data.skills.map((s) => s.id));
  data.questions.forEach((q) => {
    if (!skillIds.has(q.skill)) {
      errors.push(`Question ${q.id} references unknown skill: ${q.skill}`);
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
