-- Table: guardians
CREATE TABLE guardians (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    phone_number text NOT NULL,
    has_consent boolean NOT NULL DEFAULT false,
    consent_timestamp timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(student_id) -- Assuming one primary guardian number per student for MVP
);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view guardians for their students" ON guardians FOR SELECT 
TO authenticated 
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));

CREATE POLICY "Teachers can insert guardians for their students" ON guardians FOR INSERT 
TO authenticated 
WITH CHECK (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));

CREATE POLICY "Teachers can update guardians for their students" ON guardians FOR UPDATE 
TO authenticated 
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));

CREATE POLICY "Teachers can delete guardians for their students" ON guardians FOR DELETE 
TO authenticated 
USING (student_id IN (SELECT id FROM students WHERE school_id IN (SELECT school_id FROM teachers WHERE id = auth.uid())));
