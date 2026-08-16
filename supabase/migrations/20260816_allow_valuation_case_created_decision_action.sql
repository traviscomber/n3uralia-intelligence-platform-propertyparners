-- Keep the valuation API audit action in sync with the database constraint.
-- Creating a draft is itself a traceable valuation decision event.

alter table public.valuation_decision_log
  drop constraint if exists valuation_decision_log_action_check;

alter table public.valuation_decision_log
  add constraint valuation_decision_log_action_check
  check (
    action = any (
      array[
        'case_created'::text,
        'candidate_generated'::text,
        'comparable_selected'::text,
        'comparable_excluded'::text,
        'adjustment_updated'::text,
        'submitted_for_review'::text,
        'approved'::text,
        'rejected'::text,
        'issued'::text
      ]
    )
  );
