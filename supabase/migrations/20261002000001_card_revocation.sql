-- Add card_issued_after to students to allow invalidating old cards
ALTER TABLE public.students ADD COLUMN card_issued_after TIMESTAMPTZ DEFAULT now();
