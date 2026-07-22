-- Add a covering index for the report directory person foreign key.
CREATE INDEX IF NOT EXISTS report_branch_assignments_person_id_idx
  ON public.report_branch_assignments(person_id);
