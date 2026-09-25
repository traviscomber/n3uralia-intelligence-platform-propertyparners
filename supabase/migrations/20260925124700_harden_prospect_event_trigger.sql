alter function public.prevent_property_prospect_event_mutation()
  set search_path = '';

revoke execute on function public.prevent_property_prospect_event_mutation() from public;
revoke execute on function public.prevent_property_prospect_event_mutation() from anon;
revoke execute on function public.prevent_property_prospect_event_mutation() from authenticated;
