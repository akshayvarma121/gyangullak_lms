# Content Authoring Guide

This guide explains how teachers and content creators can author syllabus text and quizzes for chalk.

## Directory Structure

Content is authored as YAML files in the `packages/content/content/` directory. Each file represents one chapter.

## YAML Format

Each chapter file contains:

- Chapter metadata (`id`, `title`, `subject`, `class_level`)
- Skills list (used to tag questions)
- Lesson sections (text content)
- Questions

Every text field that is shown to the student must be bilingual (`en` and `hi`).

Example Chapter:

```yaml
id: 'ch-8-math-geometry'
title:
  en: 'Geometry'
  hi: 'रेखागणित'
subject: 'Mathematics'
class_level: 8
skills:
  - id: 'math-8-g-polygon'
    name:
      en: 'Identify polygons'
      hi: 'बहुभुजों की पहचान'
lessons:
  - id: 'les-8-g-1'
    title:
      en: 'Introduction'
      hi: 'परिचय'
    content:
      en: 'A polygon is...'
      hi: 'बहुभुज...'
questions:
  - id: 'q-8-g-1'
    skill: 'math-8-g-polygon'
    difficulty: 'easy'
    text:
      en: 'Which is a polygon?'
      hi: 'बहुभुज कौन सा है?'
    options:
      - en: 'Triangle'
        hi: 'त्रिभुज'
      - en: 'Circle'
        hi: 'वृत्त'
      - en: 'Sphere'
        hi: 'गोला'
      - en: 'Point'
        hi: 'बिंदु'
    correct_index: 0
    explanation:
      en: 'A triangle is made of straight lines.'
      hi: 'त्रिभुज सीधी रेखाओं से बना होता है।'
    provenance: 'NCERT Class 8 Math Chapter 3'
    review_status: 'draft'
```

## Review Status

All new content must be marked with `review_status: "draft"`. This ensures that unverified content is not shipped to students. A teacher must verify the content and change the status to `review_status: "reviewed"` before it is included in a release build.

## Running the Validator

Run the validation script to check your content:

```bash
pnpm content:validate
```

The validator checks:

- Exactly 4 options for each question.
- One correct answer (`correct_index` between 0 and 3).
- Both Hindi and English present for all text.
- Unique IDs across the file.
- All skills used in questions exist in the chapter's skill list.
- String length limits.
- No empty strings.

## Building the Bundle

To build the client JSON and server import files, run:

```bash
pnpm content:build
```

This generates `content.json` and `server-content.json` in the `packages/content/dist/` directory.

> **Note:** A production build (`NODE_ENV=production`) will fail if any question is left as `"draft"`.
