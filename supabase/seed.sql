-- Demo School
INSERT INTO schools (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Rural School');

-- Classes
INSERT INTO classes (id, school_id, name) VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Class 6'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Class 7');

-- 30 Students (15 in Class 6, 15 in Class 7)
DO $$
DECLARE
    student_id uuid;
BEGIN
    FOR i IN 1..15 LOOP
        student_id := gen_random_uuid();
        INSERT INTO students (id, school_id, class_id, first_name, roll_no, link_code_hash, active) 
        VALUES (student_id, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Student6_' || i, '60' || i, 'hash' || i, true);
    END LOOP;

    FOR i IN 1..15 LOOP
        student_id := gen_random_uuid();
        INSERT INTO students (id, school_id, class_id, first_name, roll_no, link_code_hash, active) 
        VALUES (student_id, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Student7_' || i, '70' || i, 'hash' || i, true);
    END LOOP;
END $$;

-- App Config
INSERT INTO app_config (key, value) VALUES 
('pass_mark', '70'),
('daily_cap', '100'),
('point_values', '{"first_pass": 10, "reattempt": 2}');

-- Donor
INSERT INTO donors (id, name, opt_in_contact) VALUES ('33333333-3333-3333-3333-333333333333', 'Local NGO', false);

-- Marketplace Catalog
INSERT INTO marketplace_items (id, school_id, name, cost_points, stock, donor_id) VALUES 
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Pencil', 50, 100, '33333333-3333-3333-3333-333333333333'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Notebook', 200, 50, '33333333-3333-3333-3333-333333333333'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Geometry Box', 500, 20, '33333333-3333-3333-3333-333333333333');

-- Content (Subject, Chapter, Skill, Version, Quiz)
INSERT INTO subjects (id, name) VALUES ('44444444-4444-4444-4444-444444444444', 'Mathematics');
INSERT INTO chapters (id, subject_id, name) VALUES ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Algebra');
INSERT INTO skills (id, chapter_id, name) VALUES ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'Linear Equations');
INSERT INTO content_versions (id, version_string) VALUES ('77777777-7777-7777-7777-777777777777', 'v1.0.0');
INSERT INTO quizzes (id, skill_id, content_version_id, name) VALUES ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 'Intro to Linear Equations');
