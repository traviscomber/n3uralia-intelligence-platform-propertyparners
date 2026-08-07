begin;

revoke execute on function public.refresh_market_property_match_candidates() from public;
revoke execute on function public.refresh_market_property_match_candidates() from anon;
revoke execute on function public.refresh_market_property_match_candidates() from authenticated;
grant execute on function public.refresh_market_property_match_candidates() to service_role;

commit;
