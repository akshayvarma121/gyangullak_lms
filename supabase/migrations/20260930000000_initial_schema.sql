-- Create schemas if needed, default is public.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: app_config
CREATE TABLE app_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config is readable by everyone" ON app_config FOR SELECT USING (true);

-- Table: schools
CREATE TABLE schools (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Table: teachers (linked to auth.users)
CREATE TABLE teachers (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('teacher', 'school_admin')),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own school" ON schools FOR SELECT 
TO authenticated 
USING (id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

-- Table: classes
CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view classes in their school" ON classes FOR SELECT 
TO authenticated 
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

CREATE POLICY "Teachers can insert classes in their school" ON classes FOR INSERT 
TO authenticated 
WITH CHECK (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

CREATE POLICY "Teachers can update classes in their school" ON classes FOR UPDATE 
TO authenticated 
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

-- Table: students
CREATE TABLE students (
    id uuid PRIMARY KEY,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    roll_no text NOT NULL,
    link_code_hash text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (school_id, class_id, roll_no)
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view students in their school" ON students FOR SELECT 
TO authenticated 
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));
CREATE POLICY "Teachers can insert students in their school" ON students FOR INSERT 
TO authenticated 
WITH CHECK (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));
CREATE POLICY "Teachers can update students in their school" ON students FOR UPDATE 
TO authenticated 
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

-- Table: devices
CREATE TABLE devices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind text NOT NULL CHECK (kind IN ('student', 'hub')),
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
    public_key text NOT NULL UNIQUE,
    status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
    registered_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((kind = 'student' AND student_id IS NOT NULL) OR (kind = 'hub' AND teacher_id IS NOT NULL))
);
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view devices for their students or themselves" ON devices FOR SELECT 
TO authenticated 
USING (
    (kind = 'student' AND student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())))
    OR 
    (kind = 'hub' AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can insert devices" ON devices FOR INSERT TO authenticated
WITH CHECK (
    (kind = 'student' AND student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())))
    OR 
    (kind = 'hub' AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update devices" ON devices FOR UPDATE TO authenticated
USING (
    (kind = 'student' AND student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())))
    OR 
    (kind = 'hub' AND teacher_id = auth.uid())
);

-- Table: guardians
CREATE TABLE guardians (
    student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    phone text NOT NULL,
    consent_at timestamptz NOT NULL,
    revoked_at timestamptz
);
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view guardians in their school" ON guardians FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));
CREATE POLICY "Teachers can insert guardians in their school" ON guardians FOR INSERT TO authenticated
WITH CHECK (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));
CREATE POLICY "Teachers can update guardians in their school" ON guardians FOR UPDATE TO authenticated
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));

-- Educational Content tables (read-only for teachers)
CREATE TABLE subjects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subjects" ON subjects FOR SELECT USING (true);

CREATE TABLE chapters (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chapters" ON chapters FOR SELECT USING (true);

CREATE TABLE skills (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read skills" ON skills FOR SELECT USING (true);

CREATE TABLE content_versions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_string text NOT NULL UNIQUE,
    published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read content_versions" ON content_versions FOR SELECT USING (true);

CREATE TABLE quizzes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    content_version_id uuid NOT NULL REFERENCES content_versions(id),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quizzes" ON quizzes FOR SELECT USING (true);

CREATE TABLE questions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    content jsonb NOT NULL,
    correct_answer jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can read questions" ON questions FOR SELECT TO authenticated USING (true);

-- Marketplace
CREATE TABLE donors (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    contact_info text,
    opt_in_contact boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donors readable by all authenticated" ON donors FOR SELECT TO authenticated USING (true);

CREATE TABLE marketplace_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name text NOT NULL,
    cost_points integer NOT NULL CHECK (cost_points >= 0),
    stock integer NOT NULL CHECK (stock >= 0),
    donor_id uuid REFERENCES donors(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view items in their school" ON marketplace_items FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));
CREATE POLICY "Teachers can manage items in their school" ON marketplace_items FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

CREATE TABLE donations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id uuid NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    amount integer NOT NULL CHECK (amount > 0),
    message text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view donations to their school" ON donations FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid()));

-- Events and Ledger
CREATE TABLE ledger_events (
    id uuid PRIMARY KEY,
    device_id uuid NOT NULL REFERENCES devices(id),
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    signature text NOT NULL,
    status text NOT NULL CHECK (status IN ('accepted', 'rejected')),
    reject_reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ledger_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can write events" ON ledger_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers can read events from their school" ON ledger_events FOR SELECT TO authenticated
USING (
    device_id IN (SELECT id FROM devices WHERE student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())))
    OR
    device_id IN (SELECT id FROM devices WHERE teacher_id IN (SELECT id FROM teachers WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())))
);
-- Also prevent teachers from writing
CREATE POLICY "Teachers cannot insert events" ON ledger_events FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Teachers cannot update events" ON ledger_events FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Teachers cannot delete events" ON ledger_events FOR DELETE TO authenticated USING (false);

CREATE TABLE points_ledger (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    delta integer NOT NULL,
    reason text NOT NULL,
    source_event_id uuid NOT NULL REFERENCES ledger_events(id) ON DELETE CASCADE,
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX first_pass_unique_idx ON points_ledger(student_id, quiz_id) WHERE quiz_id IS NOT NULL AND reason = 'first_pass';
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can write points" ON points_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers can read points in their school" ON points_ledger FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));
CREATE POLICY "Teachers cannot insert points" ON points_ledger FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Teachers cannot update points" ON points_ledger FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Teachers cannot delete points" ON points_ledger FOR DELETE TO authenticated USING (false);

CREATE TABLE redemptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    source_event_id uuid NOT NULL REFERENCES ledger_events(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view redemptions in their school" ON redemptions FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));

CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id uuid,
    action text NOT NULL,
    target_table text NOT NULL,
    target_id uuid NOT NULL,
    changes jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can read their own audit logs" ON audit_log FOR SELECT TO authenticated
USING (actor_id = auth.uid());

-- View for skill mastery
CREATE OR REPLACE VIEW skill_mastery AS
SELECT 
    p.student_id,
    q.skill_id,
    COUNT(p.id) as attempts,
    SUM(CASE WHEN p.delta > 0 THEN 1 ELSE 0 END) as correct,
    MAX(p.created_at) as last_attempt
FROM points_ledger p
JOIN quizzes q ON p.quiz_id = q.id
WHERE p.reason = 'first_pass' OR p.reason = 'quiz_attempt'
GROUP BY p.student_id, q.skill_id;
