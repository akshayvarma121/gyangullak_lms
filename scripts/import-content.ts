/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bundlePath =
  process.argv[2] || 'packages/content/dist/server-content.json';

async function run() {
  console.log(`Importing content from ${bundlePath}...`);
  const content = JSON.parse(
    readFileSync(join(process.cwd(), bundlePath), 'utf-8'),
  );

  // The actual import logic depends on the Supabase schema.
  // Assuming 'chapters', 'skills', 'quizzes', 'questions' tables as per schema.md

  for (const chapter of content.chapters) {
    console.log(`Importing chapter: ${chapter.id}`);

    // UPSERT chapter
    const { error: chErr } = await supabase.from('chapters').upsert({
      id: chapter.id,
      title_en: chapter.title.en,
      title_hi: chapter.title.hi,
      subject: chapter.subject,
      class_level: chapter.class_level,
    });
    if (chErr) {
      console.error('Error upserting chapter', chErr);
      continue;
    }

    // UPSERT skills
    for (const skill of chapter.skills) {
      await supabase.from('skills').upsert({
        id: skill.id,
        chapter_id: chapter.id,
        name_en: skill.name.en,
        name_hi: skill.name.hi,
      });
    }

    // Since the schema has quizzes and questions, we will map a chapter's questions to a 'quiz'.
    const quizId = `quiz-${chapter.id}`;
    await supabase.from('quizzes').upsert({
      id: quizId,
      chapter_id: chapter.id,
      title_en: `${chapter.title.en} Quiz`,
      title_hi: `${chapter.title.hi} प्रश्नोत्तरी`,
    });

    // UPSERT questions
    for (const q of chapter.questions) {
      await supabase.from('questions').upsert({
        id: q.id,
        quiz_id: quizId,
        skill_id: q.skill,
        difficulty: q.difficulty,
        text_en: q.text.en,
        text_hi: q.text.hi,
        options: q.options,
        correct_index: q.correct_index,
        explanation_en: q.explanation.en,
        explanation_hi: q.explanation.hi,
        provenance: q.provenance,
      });
    }
  }

  console.log('Import complete.');
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
