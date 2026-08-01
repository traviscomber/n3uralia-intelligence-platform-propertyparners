-- Reversible QA for the direction -> seller correction -> resubmission cycle.
-- Run with a known director JWT and a valuation from the same office.
-- All mutations must remain inside this transaction.
begin;
set local role authenticated;

-- Required before running:
-- select set_config('request.jwt.claims', json_build_object('sub','<DIRECTOR_ID>','role','authenticated')::text, true);
-- Replace <CASE_ID> and <SELLER_ID> with accounts in the same office.

-- 1. Direction can see the office case but not foreign-office cases.
-- 2. Returning to draft must create or reopen source_key valuation-return:<CASE_ID>.
-- 3. The task must be assigned to <SELLER_ID>.
-- 4. Under the seller JWT, only that seller can edit the draft and complete the task.
-- 5. Resubmission must move the case to review, close the return task and append
--    resubmitted_after_correction to valuation_decision_log.
-- 6. A foreign-office director and another seller must see zero rows for the case/task.

rollback;
