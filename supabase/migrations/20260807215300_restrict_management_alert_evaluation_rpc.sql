begin;

revoke execute on function public.evaluate_management_alerts(date,date) from public;
revoke execute on function public.evaluate_management_alerts(date,date) from anon;
revoke execute on function public.evaluate_management_alerts(date,date) from authenticated;
grant execute on function public.evaluate_management_alerts(date,date) to service_role;

commit;
