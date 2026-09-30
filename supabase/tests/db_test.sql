BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

-- Setup fake auth users
-- Note: Supabase tests typically use the tests.create_supabase_user function to create users.
-- We can also just insert into auth.users directly if it's not available, but let's just use tests.create_supabase_user if possible.
-- Wait, let's just insert into auth.users directly.

INSERT INTO auth.users (id, email) VALUES 
('aaaa1111-1111-1111-1111-111111111111', 'teacher_a@example.com'),
('bbbb2222-2222-2222-2222-222222222222', 'teacher_b@example.com');

-- Setup schools
INSERT INTO schools (id, name) VALUES 
('aaaa3333-3333-3333-3333-333333333333', 'School A'),
('bbbb4444-4444-4444-4444-444444444444', 'School B');

-- Assign teachers
INSERT INTO teachers (id, school_id, role) VALUES 
('aaaa1111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'teacher'),
('bbbb2222-2222-2222-2222-222222222222', 'bbbb4444-4444-4444-4444-444444444444', 'teacher');

-- Test: teacher A can read School A but not School B
SELECT tests.authenticate_as('teacher_a@example.com');

SELECT results_eq(
    'SELECT id FROM schools',
    ARRAY['aaaa3333-3333-3333-3333-333333333333'::uuid],
    'Teacher A should only see School A'
);

SELECT results_eq(
    'SELECT id FROM schools WHERE id = ''bbbb4444-4444-4444-4444-444444444444''',
    ARRAY[]::uuid[],
    'Teacher A should not be able to read School B'
);

-- Test: Teacher A cannot write to School B classes
PREPARE insert_school_b_class AS INSERT INTO classes (school_id, name) VALUES ('bbbb4444-4444-4444-4444-444444444444', 'Hacked Class');
SELECT throws_ok(
    'insert_school_b_class',
    'new row violates row-level security policy for table "classes"',
    'Teacher A cannot insert classes into School B'
);

-- Setup for other tests
SELECT tests.clear_authentication();
-- Switch to postgres role to bypass RLS for setup
SET ROLE postgres;

-- Insert class and student
INSERT INTO classes (id, school_id, name) VALUES ('aaaa5555-5555-5555-5555-555555555555', 'aaaa3333-3333-3333-3333-333333333333', 'Class 1');
INSERT INTO students (id, school_id, class_id, first_name, roll_no, link_code_hash) VALUES 
('aaaa6666-6666-6666-6666-666666666666', 'aaaa3333-3333-3333-3333-333333333333', 'aaaa5555-5555-5555-5555-555555555555', 'Test Student', '1', 'hash');

-- Insert device, event, content
INSERT INTO devices (id, kind, student_id, public_key, status) VALUES ('aaaa7777-7777-7777-7777-777777777777', 'student', 'aaaa6666-6666-6666-6666-666666666666', 'pubkey', 'active');
INSERT INTO ledger_events (id, device_id, event_type, payload, signature, status) VALUES 
('aaaa8888-8888-8888-8888-888888888888', 'aaaa7777-7777-7777-7777-777777777777', 'quiz_attempt', '{}', 'sig', 'accepted');

INSERT INTO subjects (id, name) VALUES ('aaaa9999-9999-9999-9999-999999999999', 'Math');
INSERT INTO chapters (id, subject_id, name) VALUES ('bbbb0000-0000-0000-0000-000000000000', 'aaaa9999-9999-9999-9999-999999999999', 'Ch1');
INSERT INTO skills (id, chapter_id, name) VALUES ('cccc1111-1111-1111-1111-111111111111', 'bbbb0000-0000-0000-0000-000000000000', 'Sk1');
INSERT INTO content_versions (id, version_string) VALUES ('dddd2222-2222-2222-2222-222222222222', 'v1');
INSERT INTO quizzes (id, skill_id, content_version_id, name) VALUES ('eeee3333-3333-3333-3333-333333333333', 'cccc1111-1111-1111-1111-111111111111', 'dddd2222-2222-2222-2222-222222222222', 'Q1');

-- Test: Teacher cannot insert into points_ledger
SELECT tests.authenticate_as('teacher_a@example.com');
PREPARE insert_points AS INSERT INTO points_ledger (student_id, delta, reason, source_event_id, quiz_id) 
VALUES ('aaaa6666-6666-6666-6666-666666666666', 10, 'first_pass', 'aaaa8888-8888-8888-8888-888888888888', 'eeee3333-3333-3333-3333-333333333333');
SELECT throws_ok(
    'insert_points',
    'new row violates row-level security policy for table "points_ledger"',
    'Teacher A cannot insert into points_ledger'
);

SELECT tests.clear_authentication();
-- Service role can insert points
SET ROLE service_role;
PREPARE service_insert_points AS INSERT INTO points_ledger (student_id, delta, reason, source_event_id, quiz_id) 
VALUES ('aaaa6666-6666-6666-6666-666666666666', 10, 'first_pass', 'aaaa8888-8888-8888-8888-888888888888', 'eeee3333-3333-3333-3333-333333333333');

SELECT lives_ok(
    'service_insert_points',
    'Service role can insert first pass points'
);

-- Test: Second first-pass credit fails (I4 invariant)
PREPARE service_insert_points_2 AS INSERT INTO points_ledger (student_id, delta, reason, source_event_id, quiz_id) 
VALUES ('aaaa6666-6666-6666-6666-666666666666', 10, 'first_pass', 'aaaa8888-8888-8888-8888-888888888888', 'eeee3333-3333-3333-3333-333333333333');

SELECT throws_ok(
    'service_insert_points_2',
    'duplicate key value violates unique constraint "first_pass_unique_idx"',
    'A student can earn first_pass points for a given quiz only once'
);

-- But service can insert a reattempt point
PREPARE service_insert_points_reattempt AS INSERT INTO points_ledger (student_id, delta, reason, source_event_id, quiz_id) 
VALUES ('aaaa6666-6666-6666-6666-666666666666', 2, 'reattempt', 'aaaa8888-8888-8888-8888-888888888888', 'eeee3333-3333-3333-3333-333333333333');

SELECT lives_ok(
    'service_insert_points_reattempt',
    'Service role can insert reattempt points'
);

-- Test I3: Unique constraint on ledger_events
PREPARE insert_ledger_event_dup AS INSERT INTO ledger_events (id, device_id, event_type, payload, signature, status) VALUES 
('aaaa8888-8888-8888-8888-888888888888', 'aaaa7777-7777-7777-7777-777777777777', 'quiz_attempt', '{}', 'sig2', 'accepted');

SELECT throws_ok(
    'insert_ledger_event_dup',
    'duplicate key value violates unique constraint "ledger_events_pkey"',
    'Every event has a UUID and is idempotent (cannot insert same UUID twice)'
);

SELECT * FROM finish();
ROLLBACK;
