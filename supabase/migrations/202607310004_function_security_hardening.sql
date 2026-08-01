-- Minimize privileged function surface.

-- Alert evaluation must obey the caller's RLS scope.
alter function evaluate_management_alerts(date,date) security invoker;
revoke all on function evaluate_management_alerts(date,date) from public;
grant execute on function evaluate_management_alerts(date,date) to authenticated;

-- Authorization helper remains SECURITY DEFINER to avoid recursive policy evaluation,
-- but is callable only by authenticated users and bases every decision on auth.uid().
revoke all on function can_access_management_entity(uuid) from public;
grant execute on function can_access_management_entity(uuid) to authenticated;

-- Trigger functions are internal and must never be exposed as callable APIs.
revoke all on function enforce_valuation_minimum_comparables() from public;
revoke all on function protect_active_valuation_comparables() from public;
